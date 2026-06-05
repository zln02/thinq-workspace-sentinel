"""실센서 ingest + Rudnick-Milton 재호흡률 tier + 하이브리드 거버넌스 + 수동 제어.

흐름: 라파이 브릿지 → POST /reading
  → (코웨이 실측 CO2/PM2.5 병합)
  → Rudnick-Milton 재호흡률 → 감염확률(PoI) → 5-Tier
  → sentinel.sensor_readings 적재 (best-effort)
  → SSE(live) 푸시 (공식 대입값 포함)
  → 거버넌스: ALERT=자동 제어 / HIGH_RISK·CRITICAL=관리자 승인 대기

제어 엔드포인트:
  POST /approve  — 대기 중 고위험 제어 승인 실행
  POST /control  — 대시보드 수동 ON/OFF/풍량
  GET  /coway-status — 코웨이 실시간 상태
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from backend.api.sse import publish_live
from pipeline.simulator.iaq import iaq_exceedances
from pipeline.simulator.rebreathed import infection_probability, tier_from_poi

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sensor", tags=["sensor"])

_AUTO_TIER = "ALERT"                           # 자동 제어 허용 tier
_APPROVAL_TIERS = {"HIGH_RISK", "CRITICAL"}    # 관리자 승인 필요
_ACTIVE_TIERS = {"ALERT", "HIGH_RISK", "CRITICAL"}
_last_tier: dict[str, str] = {}
_pending_approval: dict[str, dict] = {}
_space_uuid_cache: dict[str, object] = {}
_coway_cache: dict[str, object] = {"t": 0.0, "data": None}

# 시연 병동 파라미터 (Rudnick-Milton 입력)
DEMO_OCCUPANCY = 10
DEMO_INFECTORS = 1
DEMO_QUANTA = 30.0      # quanta/h (인플루엔자급)
DEMO_EXPOSURE_H = 1.0


def compute_tier(co2: Optional[float], gas_raw: Optional[float]):
    """CO2 있으면 Rudnick-Milton 재호흡률 기반 PoI→tier, 없으면 아두이노 gas_raw 폴백."""
    if co2 is not None:
        poi, f = infection_probability(
            co2, DEMO_INFECTORS, DEMO_OCCUPANCY, DEMO_QUANTA, DEMO_EXPOSURE_H
        )
        return tier_from_poi(poi), poi, f
    if gas_raw is not None:
        if gas_raw >= 900:
            return "HIGH_RISK", None, None
        if gas_raw >= 600:
            return "ALERT", None, None
        if gas_raw >= 300:
            return "CAUTION", None, None
    return "MONITOR", None, None


async def _coway_aq() -> Optional[dict]:
    """코웨이 공기질 실측 — 5초 캐시(매 ingest 호출 부담 완화)."""
    now = time.time()
    if now - float(_coway_cache["t"]) < 5 and _coway_cache["data"]:
        return _coway_cache["data"]  # type: ignore[return-value]
    try:
        from backend.api.main import state

        coway = state.get("coway")
        if coway:
            aq = await coway.async_get_air_quality()
            _coway_cache["t"] = now
            _coway_cache["data"] = aq
            return aq
    except Exception as e:  # noqa: BLE001
        logger.warning("coway 공기질 조회 실패: %s", e)
    return None


async def _control_coway(wind: str) -> Optional[dict]:
    try:
        from backend.api.main import state

        coway = state.get("coway")
        if coway:
            return await coway.async_post_device_control(
                "coway-1", {"airFlow": {"windStrength": wind}}
            )
    except Exception as e:  # noqa: BLE001
        logger.warning("coway 제어 실패: %s", e)
    return None


async def _power_coway(on: bool) -> Optional[dict]:
    try:
        from backend.api.main import state

        coway = state.get("coway")
        if coway:
            mode = "ON" if on else "OFF"
            return await coway.async_post_device_control(
                "coway-1", {"operation": {"airPurifierOperationMode": mode}}
            )
    except Exception as e:  # noqa: BLE001
        logger.warning("coway 전원 제어 실패: %s", e)
    return None


async def _resolve_space_uuid(con):
    if "ward" in _space_uuid_cache:
        return _space_uuid_cache["ward"]
    row = await con.fetchrow(
        "SELECT id FROM sentinel.spaces WHERE space_type='WARD' ORDER BY space_name LIMIT 1"
    )
    uuid = row["id"] if row else None
    _space_uuid_cache["ward"] = uuid
    return uuid


class SensorReading(BaseModel):
    space_id: str = "ward_a"
    device_id: str = "rpi-bridge"
    temp_c: Optional[float] = None
    humidity: Optional[float] = None
    co2_ppm: Optional[float] = None
    gas_raw: Optional[float] = None
    pm25: Optional[float] = None


@router.post("/reading")
async def ingest_reading(r: SensorReading):
    # 1) 코웨이 실측 CO2/PM2.5 병합 (아두이노는 CO2 미측정)
    co2 = r.co2_ppm
    pm25 = r.pm25
    aq = await _coway_aq()
    if aq:
        if co2 is None:
            co2 = aq.get("co2")
        if pm25 is None:
            pm25 = aq.get("pm25")

    # 2) Rudnick-Milton 재호흡률 → PoI → tier
    tier, poi, f = compute_tier(co2, r.gas_raw)
    exceed = iaq_exceedances(co2=co2, pm25=pm25)

    # 3) DB 적재 (best-effort)
    try:
        from backend.api.main import state

        pool = state.get("db")
        if pool:
            async with pool.acquire() as con:
                space_uuid = await _resolve_space_uuid(con)
                await con.execute(
                    "INSERT INTO sentinel.sensor_readings "
                    "(time, space_id, device_id, co2_ppm, pm25_ugm3, temperature, humidity, gas_raw) "
                    "VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)",
                    space_uuid, r.device_id, co2, pm25, r.temp_c, r.humidity, r.gas_raw,
                )
    except Exception as e:  # noqa: BLE001
        logger.warning("sensor 적재 실패(데모 진행): %s", e)

    # 4) 하이브리드 거버넌스
    prev = _last_tier.get(r.space_id)
    _last_tier[r.space_id] = tier
    coway_action = None
    approval_required = False
    governance = "none"

    if tier == _AUTO_TIER and prev not in _ACTIVE_TIERS:
        coway_action = await _control_coway("TURBO")        # ALERT → 자동 제어
        governance = "auto"
    elif tier in _APPROVAL_TIERS and prev not in _APPROVAL_TIERS:
        _pending_approval[r.space_id] = {"tier": tier, "wind": "TURBO"}
        approval_required = True                             # 고위험 → 승인 대기(제어 보류)
        governance = "approval_required"
    elif tier not in _ACTIVE_TIERS and prev in _ACTIVE_TIERS:
        coway_action = await _control_coway("LOW")          # 정상 복귀 → 자동
        _pending_approval.pop(r.space_id, None)
        governance = "auto_restore"

    # 5) SSE 푸시 (공식 대입값 포함 — 알고리즘 투명성)
    payload = {
        "space_id": r.space_id,
        "tier": tier,
        "prev_tier": prev,
        "poi": poi,
        "rebreathed_fraction": f,
        "temp_c": r.temp_c,
        "humidity": r.humidity,
        "co2_ppm": co2,
        "gas_raw": r.gas_raw,
        "pm25": pm25,
        "iaq_exceed": exceed,
        "governance": governance,
        "approval_required": approval_required,
        "coway": coway_action,
        "formula": {
            "model": "Rudnick-Milton",
            "co2": co2, "f": f, "I": DEMO_INFECTORS, "n": DEMO_OCCUPANCY,
            "q": DEMO_QUANTA, "t_h": DEMO_EXPOSURE_H, "poi": poi,
        },
    }
    publish_live(r.space_id, payload)
    return {
        "ok": True, "tier": tier, "poi": poi,
        "governance": governance, "approval_required": approval_required,
        "coway": coway_action,
    }


class ApproveReq(BaseModel):
    space_id: str = "ward_a"


@router.post("/approve")
async def approve(req: ApproveReq):
    """관리자 승인 — 대기 중인 고위험(HIGH_RISK/CRITICAL) 제어를 실행."""
    p = _pending_approval.pop(req.space_id, None)
    if not p:
        return {"ok": False, "reason": "대기 중 승인 건 없음"}
    action = await _control_coway(p["wind"])
    publish_live(req.space_id, {
        "space_id": req.space_id, "tier": p["tier"], "event": "approved",
        "governance": "approved", "coway": action,
    })
    return {"ok": True, "approved_tier": p["tier"], "coway": action}


class ControlReq(BaseModel):
    space_id: str = "ward_a"
    action: str  # on | off | rapid | auto


@router.post("/control")
async def manual_control(req: ControlReq):
    """대시보드 수동 제어 — 관리자가 직접 코웨이 ON/OFF/풍량."""
    a = req.action.lower()
    if a == "on":
        res = await _power_coway(True)
    elif a == "off":
        res = await _power_coway(False)
    elif a == "rapid":
        res = await _control_coway("TURBO")
    elif a == "auto":
        res = await _control_coway("LOW")
    else:
        return {"ok": False, "reason": f"알 수 없는 action: {req.action}"}
    publish_live(req.space_id, {
        "space_id": req.space_id, "event": "manual_control", "action": a, "coway": res,
    })
    return {"ok": True, "action": a, "coway": res}


@router.get("/coway-status")
async def coway_status():
    """코웨이 실시간 상태(전원/풍량/모드/추정전력) + 공기질 실측(PM2.5/CO2/AQI)."""
    try:
        from backend.api.main import state

        coway = state.get("coway")
        if not coway:
            return {"available": False, "reason": "코웨이 어댑터 미설정"}
        aq = await coway.async_get_air_quality()
        return {"available": True, **aq}
    except Exception as e:  # noqa: BLE001
        return {"available": False, "error": str(e)[:120]}
