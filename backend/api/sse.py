"""Server-Sent Events — 프론트 실시간 푸시.

엔드포인트:
    GET /api/v1/stream/space/{space_id}
        - 1초마다 공간 환경·5-Tier·가전 상태 stream
        - text/event-stream

데모 시연 전용:
    GET /api/v1/stream/demo/{scenario}?speed=60
        - 시뮬레이터 가속 (speed=60 = 1초 = 1분 시뮬레이션)
        - 75초 영상 자동 재생용
"""
from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from backend.services.smart_protocol import execute_protocol
from backend.services.thinq_mock import ThinQApiMock
from pipeline.simulator.devices import build_nursing_home_pack
from pipeline.simulator.runner import SCENARIO_SEASON
from pipeline.simulator.sensors import build_nursing_home_sensors
from pipeline.simulator.space import SpaceEnv, seed_scenario, space_env_from_row

router = APIRouter(prefix="/api/v1/stream", tags=["realtime"])

# 시나리오별 외부 감염 선행신호 (모회 시스템 UIS: 약국 OTC·DataLab·질병청 → 3주 선행)
# 지역 단위 외부신호 = 병동 내부 tier와 독립. (출처, 병원체, 지역, 강도, 보정전→보정후 지역등급)
EXTERNAL_SIGNAL = {
    "winter_influenza": ("KOWAS 약국 OTC", "INFLUENZA", "서울 종로구", "HIGH", "CAUTION", "HIGH_RISK"),
    "spring_tb": ("질병청 감염병신고", "TB", "서울 종로구", "MEDIUM", "MONITOR", "ALERT"),
    "summer_norovirus": ("네이버 DataLab 검색", "NOROVIRUS", "서울 종로구", "HIGH", "CAUTION", "HIGH_RISK"),
    "autumn_covid": ("KOWAS 약국 OTC", "COVID-19", "서울 종로구", "MEDIUM", "MONITOR", "ALERT"),
    "heatwave_norovirus_double": ("네이버 DataLab 검색", "NOROVIRUS", "서울 종로구", "HIGH", "CAUTION", "CRITICAL"),
}


def _format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _load_demo_space() -> SpaceEnv:
    """시연 메인 site의 대표 병동(WARD) 체적·정원을 DB에서 읽어 SpaceEnv 구성.

    DB 미연결/병동 미시드 시 SpaceEnv 기본값으로 graceful fallback.
    main 모듈은 순환 import 회피를 위해 함수 내부에서 lazy import 한다.
    """
    try:
        from backend.api.main import state
        pool = state.get("db")
        if pool:
            async with pool.acquire() as con:
                row = await con.fetchrow(
                    "SELECT space_name, volume_m3, max_occupancy FROM sentinel.spaces "
                    "WHERE space_type='WARD' ORDER BY space_name LIMIT 1"
                )
                if row:
                    return space_env_from_row(dict(row), space_id="ward_a")
    except Exception:
        pass
    return SpaceEnv(space_id="ward_a")


async def _demo_stream(scenario: str, speed: int, total_minutes: int) -> AsyncIterator[str]:
    space = await _load_demo_space()
    devices = build_nursing_home_pack("ward_a")
    sensors = build_nursing_home_sensors("ward_a")
    api = ThinQApiMock(devices)
    season = SCENARIO_SEASON.get(scenario, "summer")

    seed_scenario(space, scenario)

    yield _format_sse("init", {
        "scenario": scenario,
        "season": season,
        "space": space.snapshot(sensors),
    })

    # 외부 감염 선행신호 (모회 UIS 시스템 수신) — 관리자 뷰 "외부경고" 카드
    src, ext_pathogen, region, level, pre_tier, post_tier = EXTERNAL_SIGNAL.get(
        scenario, ("KOWAS 약국 OTC", space.pathogen, "서울", "MEDIUM", "MONITOR", "ALERT"))
    yield _format_sse("external_signal", {
        "source": src,
        "pathogen": ext_pathogen,
        "region": region,
        "signal_level": level,
        "lead_weeks": 3,
        "boost_applied": True,
        "pre_boost_tier": pre_tier,
        "post_boost_tier": post_tier,
    })

    proto = await execute_protocol(api, devices, space.pathogen, space.tier(), season)
    yield _format_sse("protocol_applied", proto)

    elapsed_min = 0.0
    dt = 1.0
    while elapsed_min < total_minutes:
        space.step(dt, devices)
        elapsed_min += dt
        if elapsed_min % 5 < dt:  # 5분 시뮬마다 1프레임
            yield _format_sse("snapshot", space.snapshot(sensors))
            await asyncio.sleep(dt * 60 / max(speed, 1))

    yield _format_sse("done", space.snapshot(sensors))


@router.get("/demo/{scenario}")
async def demo_stream(
    scenario: str,
    speed: int = Query(60, ge=1, le=600, description="시뮬레이션 가속 배수 (60 = 1초=1분)"),
    total_minutes: int = Query(120, ge=10, le=1440),
):
    """75초 시연 영상용. 기본 speed=60 + total=120 → 약 2분 재생."""
    if scenario not in SCENARIO_SEASON:
        return {"error": f"Unknown scenario. Use one of {list(SCENARIO_SEASON.keys())}"}
    return StreamingResponse(
        _demo_stream(scenario, speed, total_minutes),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
