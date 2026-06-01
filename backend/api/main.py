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
import asyncpg
import redis.asyncio as redis
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from pipeline.simulator.runner import SCENARIO_SEASON, run


DB_DSN = os.getenv("DATABASE_URL",
                   "postgresql://uis_user:uis_dev_placeholder_20260414@localhost:5433/urban_immune")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["db"] = await asyncpg.create_pool(DB_DSN, min_size=1, max_size=4)
    state["redis"] = redis.from_url(REDIS_URL, decode_responses=True)
    yield
    await state["db"].close()
    await state["redis"].aclose()


app = FastAPI(title="ThinQ Workspace Sentinel", version="0.3.0", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.sse import router as sse_router
app.include_router(sse_router)


@app.get("/health")
async def health():
    ok = {"service": "sentinel-api", "version": app.version}
    try:
        async with state["db"].acquire() as con:
            row = await con.fetchrow("SELECT COUNT(*) AS n FROM sentinel.pathogens")
            ok["db"] = {"status": "up", "pathogens_count": row["n"]}
    except Exception as e:
        ok["db"] = {"status": "down", "error": str(e)[:120]}
    try:
        await state["redis"].ping()
        ok["redis"] = {"status": "up"}
    except Exception as e:
        ok["redis"] = {"status": "down", "error": str(e)[:120]}
    ok["simulator"] = {"status": "up", "scenarios": list(SCENARIO_SEASON.keys())}
    return ok


@app.get("/api/v1/sites")
async def list_sites():
    async with state["db"].acquire() as con:
        rows = await con.fetch("SELECT id, site_name, site_type, region_code, max_occupancy FROM sentinel.sites")
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
