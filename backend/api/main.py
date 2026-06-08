"""ThinQ Workspace Sentinel · FastAPI 엔트리포인트.

엔드포인트:
  GET /health                          - 헬스체크 (DB·Redis·시뮬레이터 상태)
  GET /api/v1/sites                    - 사이트 목록
  GET /api/v1/pathogens                - 병원체 8종
  GET /api/v1/devices                  - 가전 카탈로그 8종
  GET /api/v1/legal                    - 법령 매핑 9개
  POST /api/v1/simulate                - 시나리오 실행
  GET  /api/v1/simulate/scenarios      - 사용 가능 시나리오 목록
"""
from __future__ import annotations

import os
import pathlib as _pl
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.api.external_live import router as external_router
from backend.api.sensor import router as sensor_router
from backend.api.sse import router as sse_router
from backend.services.external_signal import (
    compute_external_risk_boost,
    normalize_signals,
)
from backend.services.uis_reader import (
    UIS_DSN,
    fetch_latest_signals,
    fetch_regional_risk,
)
from pipeline.simulator.runner import SCENARIO_SEASON, run

DB_DSN = os.getenv("DATABASE_URL",
                   "postgresql://uis_user:uis_dev_placeholder_20260414@localhost:5433/urban_immune")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["db"] = await asyncpg.create_pool(DB_DSN, min_size=1, max_size=4)
    state["redis"] = redis.from_url(REDIS_URL, decode_responses=True)
    # 코웨이 실기기 어댑터 (COWAY_USERNAME 설정 시에만 활성, 미설정/미설치면 None)
    try:
        from backend.services.coway_adapter import CowayAdapter

        state["coway"] = CowayAdapter() if os.getenv("COWAY_USERNAME") else None
    except Exception as e:  # noqa: BLE001
        print(f"[main] Coway 어댑터 비활성: {str(e)[:100]}")
        state["coway"] = None
    # UIS DB(urban_immune)는 sentinel DB와 별개 — read-only 외부신호 소비용 별도 풀
    try:
        state["uis_db"] = await asyncpg.create_pool(UIS_DSN, min_size=1, max_size=2)
    except Exception as e:
        print(f"[main] UIS DB 풀 초기화 실패 (외부신호 비활성, sentinel은 정상): {str(e)[:120]}")
        state["uis_db"] = None
    yield
    await state["db"].close()
    if state.get("uis_db"):
        await state["uis_db"].close()
    await state["redis"].aclose()


app = FastAPI(title="ThinQ Workspace Sentinel", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sse_router)
app.include_router(sensor_router)
app.include_router(external_router)

# 음성 안내 mp3 등 정적 파일 (대시보드가 /static/voice_*.mp3 재생 → 띄운 기기 스피커)
app.mount(
    "/static",
    StaticFiles(directory=str(_pl.Path(__file__).parent.parent / "static")),
    name="static",
)


@app.get("/dashboard")
async def dashboard():
    """라파이 크로미움 키오스크용 실시간 대시보드(단일 HTML, same-origin SSE)."""
    import pathlib

    from fastapi.responses import FileResponse

    p = pathlib.Path(__file__).parent.parent / "static" / "dashboard.html"
    return FileResponse(str(p), media_type="text/html")

@app.get("/health")
async def health():
    ok = {
        "service": "sentinel-api",
        "version": app.version,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

    # DB 체크
    try:
        async with state["db"].acquire() as con:
            row = await con.fetchrow("SELECT COUNT(*) AS n FROM sentinel.pathogens")
            ok["db"] = {"status": "up", "pathogens_count": row["n"]}
    except Exception as e:
        ok["db"] = {"status": "down", "error": str(e)[:120]}

    # Redis 체크
    try:
        await state["redis"].ping()
        ok["redis"] = {"status": "up"}
    except Exception as e:
        ok["redis"] = {"status": "down", "error": str(e)[:120]}

    # Simulator 체크
    ok["simulator"] = {"status": "up", "scenarios": list(SCENARIO_SEASON.keys())}

    # overall 상태 종합
    is_down = ok["db"]["status"] == "down" or ok["redis"]["status"] == "down"
    ok["overall"] = "down" if is_down else "ok"

    status_code = 503 if is_down else 200
    from fastapi.responses import JSONResponse
    return JSONResponse(content=ok, status_code=status_code)

@app.get("/api/v1/sites")
async def list_sites():
    async with state["db"].acquire() as con:
        rows = await con.fetch("SELECT id, site_name, site_type, region_code, max_occupancy FROM sentinel.sites")
        return [dict(r) for r in rows]


@app.get("/api/v1/sites/{site_id}/spaces")
async def list_site_spaces(site_id: str):
    """site의 병동(spaces) 목록. 실제 면적·체적(Wells-Riley 입력) 포함."""
    async with state["db"].acquire() as con:
        rows = await con.fetch(
            "SELECT id, space_name, space_type, area_m2, ceiling_m, volume_m3, max_occupancy "
            "FROM sentinel.spaces WHERE site_id = $1 ORDER BY space_name",
            site_id,
        )
        return [dict(r) for r in rows]


@app.get("/api/v1/pathogens")
async def list_pathogens():
    async with state["db"].acquire() as con:
        rows = await con.fetch("""
            SELECT code, name_kr, quanta_rate, transmission_mode, elderly_mortality_factor,
                   target_temp, target_rh, min_ach, uv_required, surface_priority, notes
            FROM sentinel.pathogens ORDER BY elderly_mortality_factor DESC
        """)
        return [dict(r) for r in rows]


@app.get("/api/v1/devices")
async def list_devices():
    async with state["db"].acquire() as con:
        rows = await con.fetch("""
            SELECT device_type, name_kr, nursing_priority, wells_riley_var, season_master, notes
            FROM sentinel.device_catalog ORDER BY nursing_priority
        """)
        return [dict(r) for r in rows]


@app.get("/api/v1/legal")
async def list_legal():
    async with state["db"].acquire() as con:
        rows = await con.fetch("""
            SELECT law_code, law_name_kr, article, obligation, sentinel_evidence, enforcement_authority
            FROM sentinel.legal_mappings ORDER BY id
        """)
        return [dict(r) for r in rows]


@app.get("/api/v1/simulate/scenarios")
def list_scenarios():
    return [{"id": k, "season": v} for k, v in SCENARIO_SEASON.items()]


class SimRequest(BaseModel):
    scenario: str
    minutes: int = 120
    dt: float = 1.0


@app.post("/api/v1/simulate")
async def simulate(req: SimRequest):
    if req.scenario not in SCENARIO_SEASON:
        raise HTTPException(400, f"Unknown scenario. Use one of {list(SCENARIO_SEASON.keys())}")
    result = await run(req.scenario, req.minutes, req.dt)
    return result

@app.get("/api/v1/external/signals")
async def get_external_signals(limit: int = 20):
    """UIS에서 최신 외부 감염병 신호 조회."""
    raw = await fetch_latest_signals(state["uis_db"], limit=limit)
    normalized = normalize_signals(raw)
    return {
        "count": len(normalized),
        "signals": [
            {
                "pathogen": s.pathogen,
                "source": s.source,
                "raw_signal": s.raw_signal,
                "weighted_signal": s.weighted_signal,
                "suggested_tier": s.suggested_tier,
                "region_code": s.region_code,
                "signal_date": s.signal_date,
            }
            for s in normalized
        ],
    }


@app.get("/api/v1/external/risk-boost")
async def get_risk_boost(
    pathogen: str = "COVID-19",
    space_tier: str = "CAUTION",
    region_code: str = "KR",
):
    """외부 신호 기반 공간 tier 보정값 반환.

    예: 공간은 CAUTION인데 KOWAS 신호가 HIGH_RISK면 → HIGH_RISK로 사전 경보.
    """
    raw = await fetch_latest_signals(state["uis_db"], limit=50)
    normalized = normalize_signals(raw)
    boost = compute_external_risk_boost(
        signals=normalized,
        space_tier=space_tier,
        target_pathogen=pathogen,
        region_code=region_code,
    )
    return boost


@app.get("/api/v1/external/regional/{region_code}")
async def get_regional_risk(region_code: str):
    """특정 지역 최근 14일 감염병 신호 집계."""
    result = await fetch_regional_risk(state["uis_db"], region_code)
    if not result:
        return {"region_code": region_code, "signals": [], "message": "신호 없음"}
    return result
