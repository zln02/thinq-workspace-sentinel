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
from pipeline.simulator.space import SpaceEnv, seed_scenario


router = APIRouter(prefix="/api/v1/stream", tags=["realtime"])


def _format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _demo_stream(scenario: str, speed: int, total_minutes: int) -> AsyncIterator[str]:
    space = SpaceEnv(space_id="ward_a")
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
