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
_APPROVAL_TIERS = {"CRITICAL"}                 # 관리자 승인 필요 (위급만 — ALERT/HIGH_RISK는 자동)
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


_TIER_RANK = {"MONITOR": 0, "CAUTION": 1, "ALERT": 2, "HIGH_RISK": 3, "CRITICAL": 4}
_TIER_NAMES = ["MONITOR", "CAUTION", "ALERT", "HIGH_RISK", "CRITICAL"]


def _env_tier(temp: Optional[float], humidity: Optional[float]) -> str:
    """온습도 환경 위험 (ASHRAE 적정 40~60% RH 이탈 시 단계 상향).

    건조 → 비말 속 바이러스 생존↑·점막 약화, 고습 → 곰팡이·세균↑.
    시연 시 손으로 센서를 감싸거나 입김으로 온도·습도를 올려 트리거 가능(냄새 없음).
    """
    rank = 0
    if humidity is not None:
        if humidity >= 75 or humidity <= 20:
            rank = max(rank, 3)
        elif humidity >= 65 or humidity <= 30:
            rank = max(rank, 2)
        elif humidity >= 60 or humidity <= 35:
            rank = max(rank, 1)
    if temp is not None:
        if temp >= 31:
            rank = max(rank, 3)
        elif temp >= 29:
            rank = max(rank, 2)
        elif temp >= 27:
            rank = max(rank, 1)
    return _TIER_NAMES[rank]


def compute_tier(co2, gas_raw, temp=None, humidity=None):
    """감염위험(CO2 재호흡률/가스) + 환경위험(온습도)을 종합해 더 높은 tier 채택."""
    if co2 is not None:
        poi, f = infection_probability(
            co2, DEMO_INFECTORS, DEMO_OCCUPANCY, DEMO_QUANTA, DEMO_EXPOSURE_H
        )
        base = tier_from_poi(poi)
    elif gas_raw is not None:
        poi, f = None, None
        if gas_raw >= 700:
            base = "HIGH_RISK"
        elif gas_raw >= 400:
            base = "ALERT"
        elif gas_raw >= 250:
            base = "CAUTION"
        else:
            base = "MONITOR"
    else:
        poi, f, base = None, None, "MONITOR"

    env = _env_tier(temp, humidity)
    final = base if _TIER_RANK[base] >= _TIER_RANK[env] else env
    return final, poi, f


_COWAY_TTL = 10.0  # 캐시 신선도(초)


async def _coway_refresh() -> None:
    """백그라운드 코웨이 공기질 갱신 — 핫패스(ingest)를 절대 블록하지 않음."""
    if _coway_cache.get("refreshing"):
        return  # 단일 갱신만 (cache stampede 방지)
    _coway_cache["refreshing"] = True
    try:
        from backend.api.main import state

        coway = state.get("coway")
        if coway:
            aq = await coway.async_get_air_quality()
            _coway_cache["t"] = time.time()
            _coway_cache["data"] = aq
    except Exception as e:  # noqa: BLE001
        logger.warning("coway 공기질 갱신 실패: %s", e)
    finally:
        _coway_cache["refreshing"] = False


async def _coway_aq() -> Optional[dict]:
    """코웨이 공기질 — 캐시 즉시 반환(논블로킹). 만료 시 백그라운드 갱신만 트리거.

    코웨이 IoCare 클라우드 호출(수초)을 ingest 임계경로에서 제거 →
    센서 수신 지연이 가전 클라우드 응답속도에 종속되지 않음(p95 안정).
    """
    import asyncio

    now = time.time()
    fresh = (now - float(_coway_cache["t"])) < _COWAY_TTL and _coway_cache["data"]
    if not fresh and not _coway_cache.get("refreshing"):
        asyncio.create_task(_coway_refresh())  # 기다리지 않음
    return _coway_cache["data"]  # type: ignore[return-value]  # 신선하면 최신, 아니면 직전값(또는 None)


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


async def _ward_list(con) -> list[tuple]:
    """전체 WARD (site_id, space_id) 목록 — space_name 순. 60초 캐시."""
    now = time.time()
    cached = _space_uuid_cache.get("_wards")
    if cached and now - float(_space_uuid_cache.get("_wards_t", 0)) < 60:
        return cached  # type: ignore[return-value]
    rows = await con.fetch(
        "SELECT id, site_id FROM sentinel.spaces WHERE space_type='WARD' ORDER BY space_name"
    )
    wards = [(r["site_id"], r["id"]) for r in rows]
    _space_uuid_cache["_wards"] = wards
    _space_uuid_cache["_wards_t"] = now
    return wards


async def _resolve_space(con, space_id: str = "ward_a"):
    """논리 space_id → 물리 WARD (site_id, space_id) 매핑 (다병동).

    'ward_a'..'ward_e' 는 인덱스로, 그 외 문자열은 해시로 분산 — 단말마다 다른 병동에 적재.
    """
    wards = await _ward_list(con)
    if not wards:
        return (None, None)
    key = (space_id or "ward_a").lower()
    if key.startswith("ward_") and len(key) == 6 and key[5].isalpha():
        idx = ord(key[5]) - ord("a")
    else:
        idx = sum(ord(c) for c in key)
    return wards[idx % len(wards)]


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
    tier, poi, f = compute_tier(co2, r.gas_raw, r.temp_c, r.humidity)
    # 외부신호 선제 boost — 선택 지역 감염병 확산이 심하면 센서 정상이어도 tier 상향(사전예방)
    ext_boost = "MONITOR"
    try:
        from backend.api.external_live import external_boost_tier

        ext_boost = external_boost_tier()
        if _TIER_RANK.get(ext_boost, 0) > _TIER_RANK.get(tier, 0):
            tier = ext_boost
    except Exception:  # noqa: BLE001
        pass
    exceed = iaq_exceedances(co2=co2, pm25=pm25)

    # 3) DB 적재 (best-effort)
    try:
        from backend.api.main import state

        pool = state.get("db")
        if pool:
            async with pool.acquire() as con:
                site_uuid, space_uuid = await _resolve_space(con, r.space_id)
                await con.execute(
                    "INSERT INTO sentinel.sensor_readings "
                    "(time, site_id, space_id, device_id, co2_ppm, pm25_ugm3, temperature, humidity, gas_raw) "
                    "VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8)",
                    site_uuid, space_uuid, r.device_id, co2, pm25, r.temp_c, r.humidity, r.gas_raw,
                )
    except Exception as e:  # noqa: BLE001
        logger.warning("sensor 적재 실패(데모 진행): %s", e)

    # 4) 하이브리드 거버넌스
    prev = _last_tier.get(r.space_id)
    _last_tier[r.space_id] = tier
    coway_action = None
    approval_required = False
    governance = "none"

    if tier in _APPROVAL_TIERS and prev not in _APPROVAL_TIERS:
        _pending_approval[r.space_id] = {"tier": tier, "wind": "TURBO"}
        approval_required = True                             # 위급(CRITICAL) → 관리자 승인 대기
        governance = "approval_required"
    elif tier in _ACTIVE_TIERS and prev not in _ACTIVE_TIERS:
        await _power_coway(True)                             # 전원 확실히 ON
        coway_action = await _control_coway("TURBO")        # ALERT/HIGH_RISK 진입 → 자동 급속
        governance = "auto"
    elif tier not in _ACTIVE_TIERS and prev in _ACTIVE_TIERS:
        coway_action = await _power_coway(False)            # 정상 복귀 → 전원 OFF (시연)
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
