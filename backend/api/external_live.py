"""외부 감염병 신호 (UIS 실데이터) — 시도별 확진/위험도 + 지역 선택 + tier boost.

데이터: urban_immune.confirmed_cases (질병청 KCDC, 시도 단위 influenza 확진).
지역을 선택하면 그 지역의 외부 확산 위험을 공간 tier 에 선제 반영(boost)한다.
→ 센서가 아직 정상이어도 외부 확산이 심하면 미리 경보(사전예방).
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/external", tags=["external"])

# 선택 지역 + 외부위험 boost 캐시 (sensor ingest 가 참조)
_selected: dict = {"region": None, "boost_tier": "MONITOR", "info": None}


def _risk_level(per_100k: float) -> str:
    if per_100k >= 40:
        return "HIGH"
    if per_100k >= 20:
        return "MODERATE"
    if per_100k >= 8:
        return "LOW"
    return "MINIMAL"


def _boost_tier(per_100k: float) -> str:
    """외부 확산 강도(인구 10만명당 누적 확진 피크) → 공간 tier 사전 상향 레벨."""
    if per_100k >= 60:
        return "ALERT"
    if per_100k >= 35:
        return "CAUTION"
    return "MONITOR"


def external_boost_tier() -> str:
    """sensor ingest 가 호출 — 현재 선택 지역의 외부위험 boost tier."""
    return _selected.get("boost_tier", "MONITOR")


async def _uis_pool():
    from backend.api.main import state

    return state.get("uis_db")


@router.get("/regions")
async def list_regions():
    """최신 시점 시도별 감염병 확진/위험도 (드롭다운용)."""
    pool = await _uis_pool()
    if not pool:
        return {"available": False, "reason": "UIS DB 미연결", "regions": []}
    async with pool.acquire() as con:
        rows = await con.fetch(
            "SELECT region, disease, MAX(case_count) AS case_count, MAX(per_100k) AS per_100k "
            "FROM confirmed_cases GROUP BY region, disease ORDER BY per_100k DESC"
        )
    regions = [
        {"region": r["region"], "disease": r["disease"], "case_count": r["case_count"],
         "per_100k": round(r["per_100k"], 1), "level": _risk_level(r["per_100k"])}
        for r in rows
    ]
    return {"available": True, "count": len(regions), "regions": regions}


class RegionSel(BaseModel):
    region: str


@router.post("/select-region")
async def select_region(sel: RegionSel):
    """지역 선택 → 그 지역 외부위험을 tier boost 로 등록 (선제 경보)."""
    pool = await _uis_pool()
    info = None
    boost = "MONITOR"
    if pool:
        async with pool.acquire() as con:
            r = await con.fetchrow(
                "SELECT region, disease, MAX(case_count) AS case_count, MAX(per_100k) AS per_100k "
                "FROM confirmed_cases WHERE region=$1 GROUP BY region, disease ORDER BY per_100k DESC LIMIT 1",
                sel.region,
            )
            if r:
                info = {"region": r["region"], "disease": r["disease"],
                        "case_count": r["case_count"], "per_100k": round(r["per_100k"], 1),
                        "level": _risk_level(r["per_100k"])}
                boost = _boost_tier(r["per_100k"])
    _selected.update(region=sel.region, boost_tier=boost, info=info)
    return {"ok": True, "selected": info, "boost_tier": boost}


@router.get("/selected")
async def get_selected():
    """현재 선택된 지역 + 외부위험 boost (대시보드 표시용)."""
    return _selected
