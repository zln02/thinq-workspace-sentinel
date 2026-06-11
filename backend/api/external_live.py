"""외부 감염병 신호 (UIS 실데이터) — 조기경보 risk_score 기반 선제 tier boost.

데이터(urban_immune):
  - risk_scores      : UIS 조기경보 출력(composite_score 0~100 + alert_level GREEN/YELLOW/ORANGE/RED)
  - confirmed_cases  : 질병청 KCDC 시도별 인플루엔자 확진(per_100k)
  - layer_signals    : 선행지표(하수 KOWAS·OTC 네이버쇼핑·검색 데이터랩·기온 KMA)

핵심: 정적 과거피크가 아니라 **risk_score(조기경보 점수)** 로 boost 한다.
  실증(2025-26 인플루엔자 시즌): risk_score ORANGE/RED 발령이 확진 피크보다
  지역별 15~43일 선행(부산 43일·세종 36일·서울/경기 15일, 16/17개 시도 사전 포착).
  → 센서가 아직 정상이어도 외부 확산이 임박하면 미리 실내 tier 상향(사전예방).

mode:
  - replay(기본) : 그 지역 시즌 피크 조기경보를 재현(여름 비수기엔 현재 GREEN이라 시연용)
  - live         : 현재 시점 실시간 alert_level (정직한 실가동 동작)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.auth import require_api_key

router = APIRouter(prefix="/api/v1/external", tags=["external"])

# 선택 지역 + 외부위험 boost 캐시 (sensor ingest 가 참조)
_selected: dict = {"region": None, "boost_tier": "MONITOR", "mode": None, "info": None}


def _boost_from_level(level: str | None) -> str:
    """조기경보 alert_level → 실내 공간 tier 선제 상향 레벨.

    RED  → ALERT  (자동 가전제어 발동 구간 — 확산 임박, 선제 가동)
    ORANGE→ CAUTION
    YELLOW→ CAUTION
    GREEN → MONITOR (boost 없음)
    """
    if level == "RED":
        return "ALERT"
    if level in ("ORANGE", "YELLOW"):
        return "CAUTION"
    return "MONITOR"


def _level_from_score(score: float | None) -> str:
    """composite_score(0~100) → alert_level (risk_scores 임계와 정합)."""
    if score is None:
        return "GREEN"
    if score >= 75:
        return "RED"
    if score >= 55:
        return "ORANGE"
    if score >= 45:
        return "YELLOW"
    return "GREEN"


def external_boost_tier() -> str:
    """sensor ingest 가 호출 — 현재 선택 지역의 외부위험 boost tier."""
    return _selected.get("boost_tier", "MONITOR")


async def _uis_pool():
    from backend.api.main import state

    return state.get("uis_db")


# 지역별: 현재(live) + 시즌피크 조기경보 + 확진피크 + 리드타임 일괄
_REGION_SQL = """
WITH live AS (
  SELECT DISTINCT ON (region) region, time::date AS d, composite_score AS s, alert_level AS lv
  FROM risk_scores ORDER BY region, time DESC),
peak AS (
  SELECT DISTINCT ON (region) region, time::date AS d, composite_score AS s, alert_level AS lv
  FROM risk_scores ORDER BY region, composite_score DESC),
ew AS (
  SELECT region, MIN(time)::date AS onset
  FROM risk_scores WHERE alert_level IN ('ORANGE','RED') GROUP BY region),
cp AS (
  SELECT DISTINCT ON (region) region, time::date AS d, per_100k AS p, disease
  FROM confirmed_cases ORDER BY region, per_100k DESC)
SELECT live.region,
       live.d AS live_date, live.s AS live_score, live.lv AS live_level,
       peak.d AS peak_date, peak.s AS peak_score, peak.lv AS peak_level,
       ew.onset AS ew_onset,
       cp.d AS conf_peak_date, cp.p AS conf_peak, cp.disease,
       (cp.d - ew.onset) AS lead_days
FROM live JOIN peak USING(region) JOIN cp USING(region) LEFT JOIN ew USING(region)
ORDER BY peak.s DESC
"""


def _row_to_region(r) -> dict:
    lead = r["lead_days"]
    return {
        "region": r["region"],
        "disease": r["disease"],
        # 백워드 호환(대시보드 기존 필드) — per_100k=확진피크, level=현재 경보등급
        "per_100k": round(r["conf_peak"], 1) if r["conf_peak"] is not None else None,
        "level": r["live_level"],
        # 조기경보(risk_score) — 사전 포착 핵심
        "live_score": round(r["live_score"], 1) if r["live_score"] is not None else None,
        "live_level": r["live_level"],
        "peak_score": round(r["peak_score"], 1) if r["peak_score"] is not None else None,
        "peak_level": r["peak_level"],
        "ew_onset": str(r["ew_onset"]) if r["ew_onset"] else None,
        "conf_peak_date": str(r["conf_peak_date"]) if r["conf_peak_date"] else None,
        "lead_days": int(lead) if lead is not None else None,
    }


@router.get("/regions")
async def list_regions():
    """시도별 조기경보(현재/시즌피크) + 확진피크 + 리드타임 (드롭다운용)."""
    pool = await _uis_pool()
    if not pool:
        return {"available": False, "reason": "UIS DB 미연결", "regions": []}
    async with pool.acquire() as con:
        rows = await con.fetch(_REGION_SQL)
    return {"available": True, "count": len(rows), "regions": [_row_to_region(r) for r in rows]}


async def _leading_layers(con, region: str, onset) -> list[dict]:
    """조기경보 발령 시점 전후 2주간 가장 먼저 뜬 선행지표 (데모 내러티브)."""
    if not onset:
        return []
    rows = await con.fetch(
        "SELECT layer, source, MAX(value) AS max_val FROM layer_signals "
        "WHERE region=$1 AND time BETWEEN ($2::date - INTERVAL '14 days') AND ($2::date + INTERVAL '7 days') "
        "GROUP BY layer, source ORDER BY max_val DESC LIMIT 4",
        region, onset,
    )
    return [{"layer": r["layer"], "source": r["source"], "value": round(r["max_val"], 1)} for r in rows]


_TIER_ORDER = ["MONITOR", "CAUTION", "ALERT", "HIGH_RISK", "CRITICAL"]


def _downgrade(tier: str) -> str:
    i = _TIER_ORDER.index(tier) if tier in _TIER_ORDER else 0
    return _TIER_ORDER[max(0, i - 1)]


async def _region_trend(con, region: str, ref_date, n: int = 4) -> dict:
    """기준일까지 최근 n개 주간 risk_score 추세 — 하강국면 후행 오경보(FP) 차단용.

    rising  : 확산 임박(선제 경보 유효) / falling : 확산 진정(경보 해제 대상) / flat.
    """
    rows = await con.fetch(
        "SELECT composite_score AS s FROM risk_scores "
        "WHERE region=$1 AND time <= ($2::date + INTERVAL '1 day') "
        "ORDER BY time DESC LIMIT $3",
        region, ref_date, n,
    )
    scores = [r["s"] for r in rows if r["s"] is not None]  # 최신→과거
    if len(scores) < 2:
        return {"trend": "flat", "slope": 0.0, "n": len(scores)}
    slope = round(scores[0] - scores[-1], 1)  # 최신 - 가장오래된 (양수=상승)
    trend = "rising" if slope > 5 else "falling" if slope < -5 else "flat"
    return {"trend": trend, "slope": slope, "n": len(scores), "latest": round(scores[0], 1)}


def _trend_adjust(boost: str, trend: dict, score: float | None) -> tuple[str, str]:
    """추세로 boost 보정. 하강+ORANGE미만(score<55) → 해제, 하강+고위험 → 한단계 완화.

    반환: (보정 boost, 사유). 상승/평탄이면 원본 유지(선제 경보는 상승국면에서만 강하게).
    """
    if trend.get("trend") == "falling":
        if score is not None and score < 55:
            return "MONITOR", "하강 추세·ORANGE 미만 → 후행경보 해제"
        return _downgrade(boost), "하강 추세 → 한 단계 완화(후행 FP 억제)"
    return boost, "상승/유지 추세 → 선제 경보 유효"


class RegionSel(BaseModel):
    region: str
    mode: str = "replay"  # replay=시즌 조기경보 재현 / live=현재 실시간


@router.post("/select-region", dependencies=[Depends(require_api_key)])
async def select_region(sel: RegionSel):
    """지역 선택 → 조기경보 risk_score 로 tier boost 등록 (선제 경보 + 리드타임 증거)."""
    pool = await _uis_pool()
    if not pool:
        return {"ok": False, "reason": "UIS DB 미연결"}
    mode = "live" if sel.mode == "live" else "replay"
    async with pool.acquire() as con:
        # 단일 지역은 _REGION_SQL 전체 실행 후 파이썬 필터(쿼리 단순/안전)
        rows = await con.fetch(_REGION_SQL)
        match = next((x for x in rows if x["region"] == sel.region), None)
        if not match:
            _selected.update(region=sel.region, boost_tier="MONITOR", mode=mode, info=None)
            return {"ok": True, "selected": None, "boost_tier": "MONITOR", "reason": "지역 데이터 없음"}
        info = _row_to_region(match)
        info["leading_signals"] = await _leading_layers(con, sel.region, match["ew_onset"])

        if mode == "replay":
            basis_level, basis_score, basis_date = match["peak_level"], info["peak_score"], match["ew_onset"]
        else:
            basis_level, basis_score, basis_date = match["live_level"], info["live_score"], match["live_date"]
        raw_boost = _boost_from_level(basis_level)
        # 하강국면 후행 오경보(FP) 차단 — 기준일 추세로 boost 보정
        trend = await _region_trend(con, sel.region, basis_date)

    boost, trend_reason = _trend_adjust(raw_boost, trend, basis_score)

    info["mode"] = mode
    info["basis_level"] = basis_level
    info["basis_score"] = basis_score
    info["basis_date"] = str(basis_date) if basis_date else None
    info["trend"] = trend
    info["raw_boost"] = raw_boost
    info["trend_reason"] = trend_reason
    _selected.update(region=sel.region, boost_tier=boost, mode=mode, info=info)
    return {"ok": True, "selected": info, "boost_tier": boost, "mode": mode, "trend": trend["trend"]}


@router.get("/selected")
async def get_selected():
    """현재 선택된 지역 + 외부위험 boost (대시보드 표시용)."""
    return _selected
