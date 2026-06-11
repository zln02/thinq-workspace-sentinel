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

import datetime
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.auth import require_api_key
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

# 공간별 직전 측정값 캐시 (carry-forward) — 카메라(occupancy)와 CO2 센서가 서로 다른
# reading으로 따로 들어와도 직전 신선값으로 미측정 필드를 보충해, 한 피드가 다른 피드를
# 덮어써 tier가 깜빡이는 걸 막는다. 단일 uvicorn 프로세스 기준 인메모리(기존 _last_tier와 동일 정책).
_last_env: dict[str, dict] = {}   # space_id -> {field: (value, ts)}
_ENV_CARRY_TTL = 300.0            # 초: 직전값 유효시간(5분). 넘으면 stale로 폐기.


def _carry_forward(space_id: str, field: str, value, now: float):
    """value가 있으면 캐시 갱신 후 그대로 반환. None이면 신선한 직전값으로 보충(없으면 None).

    occupancy=0(빈 병실)은 None이 아니므로 실측으로 보존된다 — 카운트 0을 carry로 덮지 않음.
    """
    cache = _last_env.setdefault(space_id, {})
    if value is not None:
        cache[field] = (value, now)
        return value
    prev = cache.get(field)
    if prev and (now - prev[1]) < _ENV_CARRY_TTL:
        return prev[0]
    return None

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


def compute_tier(co2, gas_raw, temp=None, humidity=None, occupancy=None):
    """감염위험(CO2 재호흡률/가스) + 환경위험(온습도)을 종합해 더 높은 tier 채택.

    occupancy(재실 인원): None이면 시연 가정 DEMO_OCCUPANCY 사용. 0이면 빈 병실 →
    infection_probability가 (0, f) 반환 → PoI 0 → MONITOR(사람 없으면 감염위험 0).
    LD2310C는 재실 '유무'만 주므로 bridge가 재실=상수폴백(None)/부재=0 으로 게이팅.
    """
    n = DEMO_OCCUPANCY if occupancy is None else occupancy
    if co2 is not None:
        poi, f = infection_probability(
            co2, DEMO_INFECTORS, n, DEMO_QUANTA, DEMO_EXPOSURE_H
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


async def _control_ac(on: bool, mode: str = "WIND", wind: str = "HIGH") -> Optional[dict]:
    """삼성 에어컨(SmartThings) 제어 — 위험 시 송풍/제습으로 환기 보조(Q_aux).

    SMARTTHINGS_TOKEN 미설정 시 어댑터 None → 조용히 skip(데모는 오케스트레이션 표시).
    """
    try:
        from backend.api.main import state

        ac = state.get("ac")
        if not ac:
            return None
        if not on:
            return await ac.async_post_device_control(
                "ac-1", {"operation": {"airConOperationMode": "OFF"}}
            )
        return await ac.async_post_device_control("ac-1", {
            "operation": {"airConOperationMode": "ON"},
            "airConMode": {"mode": mode},
            "airFlow": {"windStrength": wind},
        })
    except Exception as e:  # noqa: BLE001
        logger.warning("에어컨 제어 실패: %s", e)
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
    occupancy: Optional[int] = None  # 실측 재실 인원(LD2310C: 재실→None폴백/부재→0). None이면 DEMO_OCCUPANCY


@router.post("/reading", dependencies=[Depends(require_api_key)])
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

    # 1.5) carry-forward — 카메라(occupancy)와 CO2 센서가 따로 들어와도 합쳐지게,
    #      직전 신선값으로 미측정 필드를 보충. occupancy=0(빈 병실)은 실측이라 그대로 보존.
    now = time.time()
    co2 = _carry_forward(r.space_id, "co2", co2, now)
    pm25 = _carry_forward(r.space_id, "pm25", pm25, now)
    occ_eff = _carry_forward(r.space_id, "occupancy", r.occupancy, now)

    # 2) Rudnick-Milton 재호흡률 → PoI → tier
    #    재실 실측: None(재실/미측정)→시연 가정 인원, 0(빈 병실)→PoI 0. DB/SSE엔 적용된 n 기록.
    n_eff = DEMO_OCCUPANCY if occ_eff is None else occ_eff
    tier, poi, f = compute_tier(co2, r.gas_raw, r.temp_c, r.humidity, occupancy=occ_eff)
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
                    "(time, site_id, space_id, device_id, co2_ppm, pm25_ugm3, temperature, humidity, gas_raw, occupancy) "
                    "VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)",
                    site_uuid, space_uuid, r.device_id, co2, pm25, r.temp_c, r.humidity, r.gas_raw, n_eff,
                )
                # REHVA 결과 적재 — Performance Tracker(/sensor/kpi)가 집계하는 소스.
                # poi 0~1, risk_tier 1~5 (DB CHECK 제약). best-effort.
                await con.execute(
                    "INSERT INTO sentinel.rehva_results "
                    "(calculated_at, site_id, space_id, poi, r_event, risk_tier, i_value, q_value) "
                    "VALUES (NOW(), $1, $2, $3, NULL, $4, $5, $6)",
                    site_uuid, space_uuid,
                    min(max(poi if poi is not None else 0.0, 0.0), 1.0),  # 가스 단독 경로는 poi=None
                    _TIER_RANK.get(tier, 0) + 1,
                    float(DEMO_INFECTORS), float(DEMO_QUANTA),
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
        await _control_ac(True, mode="WIND", wind="HIGH")   # 에어컨 송풍 → 환기 보조(Q_aux)
        governance = "auto"
    elif tier not in _ACTIVE_TIERS and prev in _ACTIVE_TIERS:
        coway_action = await _power_coway(False)            # 정상 복귀 → 전원 OFF (시연)
        await _control_ac(False)                            # 에어컨도 OFF
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
        "occupancy": n_eff,
        "iaq_exceed": exceed,
        "governance": governance,
        "approval_required": approval_required,
        "coway": coway_action,
        "formula": {
            "model": "Rudnick-Milton",
            "co2": co2, "f": f, "I": DEMO_INFECTORS, "n": n_eff,
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


@router.post("/approve", dependencies=[Depends(require_api_key)])
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


@router.post("/control", dependencies=[Depends(require_api_key)])
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
    elif a == "ac_on":
        res = await _control_ac(True, mode="WIND", wind="HIGH")
    elif a == "ac_off":
        res = await _control_ac(False)
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


@router.get("/ac-status")
async def ac_status():
    """삼성 에어컨(SmartThings) 실시간 상태 — 전원/모드/설정온도/풍량/실내온도."""
    try:
        from backend.api.main import state

        ac = state.get("ac")
        if not ac:
            return {"available": False, "reason": "SmartThings 에어컨 어댑터 미설정 (토큰 필요)"}
        return await ac.async_get_status()
    except Exception as e:  # noqa: BLE001
        return {"available": False, "error": str(e)[:120]}


def _sim_reading(space_name: str, space_type: str) -> dict:
    """비실센서 공간용 라벨된 시뮬값(데모) — 공간별 결정적 baseline + 시간 변동.

    음압격리실은 고위험 환자 수용이라 baseline을 높여 데모 다양성 확보(라벨 '시뮬').
    """
    import math

    seed = sum(ord(c) for c in space_name)
    t = time.time() / 60.0
    wave = math.sin(t + seed)  # -1~1, 분 단위 완만 변동
    base_gas = 140 + (seed % 60)
    if space_type == "ISOLATION":
        base_gas += 220  # 격리실 고위험
    elif space_type == "DINING":
        base_gas += 90   # 식사시간 밀집
    gas = max(60, base_gas + wave * 50)
    temp = 23.5 + (seed % 4) + wave * 1.2
    hum = 50 + (seed % 12) + wave * 6
    # CO2 라이브: 공간별 baseline + 분단위 변동 → compute_tier가 Rudnick-Milton PoI 자동 산출
    base_co2 = 480 + (seed % 200)
    if space_type == "ISOLATION":
        base_co2 += 700   # 환기 제한 격리실 → ALERT급(고위험)
    elif space_type == "DINING":
        base_co2 += 550   # 식사시간 밀집 → ALERT급
    elif space_type == "LOUNGE":
        base_co2 += 120   # 휴게실 → CAUTION
    co2 = max(420, base_co2 + wave * 140)
    return {"gas_raw": round(gas, 0), "temp_c": round(temp, 1),
            "humidity": round(hum, 1), "co2_ppm": round(co2, 0), "pm25": round(15 + (seed % 25), 0)}


def _season_now_kst() -> str:
    """KST 현재 월 → 계절 (가전 정책 게이팅용)."""
    m = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).month
    if m in (12, 1, 2):
        return "winter"
    if m in (3, 4, 5):
        return "spring"
    if m in (6, 7, 8):
        return "summer"
    return "autumn"


# 계절 기본 위협 병원체 (관리자가 pathogen 미지정 시 추론) — 데모/조회 기본값일 뿐, 실제 위협은 선택 가능
_SEASON_DEFAULT_PATHOGEN = {"winter": "INFLUENZA", "spring": "RSV", "summer": "NOROVIRUS", "autumn": "COVID-19"}


@router.get("/control-plan")
async def control_plan(space_id: str = "ward_a", pathogen: str | None = None,
                       season: str | None = None, tier: str | None = None):
    """관리자 대시보드 흐름 viz(⑤): tier + 병원체 + 계절 → 가전 8종이 '어느 환경에
    어떤 세팅으로 왜' 움직이는지 설명 반환.

    tier 미지정 시 해당 공간 라이브값(_last_tier, 외부신호 boost 반영) 사용.
    tier 지정 시 그 값으로 시뮬레이션 — 키오스크 데모 자동재생/관리자 what-if 용.
    pathogen/season 미지정 시 KST 계절로 추론.
    """
    from backend.services.smart_protocol import explain_plan

    if tier:
        tier_source = "override"
    else:
        tier = _last_tier.get(space_id, "MONITOR")
        tier_source = "live" if space_id in _last_tier else "default"
    season = season or _season_now_kst()
    pathogen = pathogen or _SEASON_DEFAULT_PATHOGEN.get(season, "COVID-19")
    plan = explain_plan(pathogen, tier, season)
    plan["space_id"] = space_id
    plan["tier_source"] = tier_source
    return plan


@router.get("/spaces/overview")
async def spaces_overview():
    """전 공간 현재 위험도(다병동 그리드·평면도 히트맵용).

    실센서 병동은 최근 적재값, 그 외는 라벨된 시뮬값. 외부신호 boost 공통 반영.
    """
    from backend.api.main import state

    try:
        from backend.api.external_live import external_boost_tier
        boost = external_boost_tier()
    except Exception:  # noqa: BLE001
        boost = "MONITOR"

    pool = state.get("db")
    out = []
    if not pool:
        return {"spaces": [], "boost": boost}
    async with pool.acquire() as con:
        spaces = await con.fetch(
            "SELECT id, space_name, space_type, area_m2, max_occupancy "
            "FROM sentinel.spaces ORDER BY space_type, space_name"
        )
        for s in spaces:
            r = await con.fetchrow(
                "SELECT co2_ppm, pm25_ugm3, temperature, humidity, gas_raw, time "
                "FROM sentinel.sensor_readings WHERE space_id=$1 AND time > NOW() - INTERVAL '2 min' "
                "ORDER BY time DESC LIMIT 1",
                s["id"],
            )
            if r:
                vals = {"gas_raw": r["gas_raw"], "temp_c": r["temperature"],
                        "humidity": r["humidity"], "co2_ppm": r["co2_ppm"], "pm25": r["pm25_ugm3"]}
                source = "실센서"
            else:
                vals = _sim_reading(s["space_name"], s["space_type"])
                source = "시뮬"
            tier, poi, _f = compute_tier(vals["co2_ppm"], vals["gas_raw"], vals["temp_c"], vals["humidity"])
            if _TIER_RANK.get(boost, 0) > _TIER_RANK.get(tier, 0):
                tier = boost
            out.append({
                "space_id": str(s["id"]),
                "space_name": s["space_name"], "space_type": s["space_type"],
                "area_m2": s["area_m2"], "max_occupancy": s["max_occupancy"],
                "tier": tier, "poi": poi, "source": source, **vals,
            })
    return {"spaces": out, "boost": boost, "count": len(out)}


@router.get("/kpi")
async def performance_kpi():
    """Performance Tracker — 경영성과 지표(최근 24h). 대시보드 상단 카드용.

    - auto_actions: 자동 선제대응 횟수(tier≥ALERT 산출 건수)
    - avg_poi / poi_reduction_pct: 평균 감염확률 + 피크 대비 저감율(모델 기반)
    - spaces_monitored: 모니터링 중인 공간 수
    DB 미연결/데이터 부족 시 시연용 폴백값(정직 표기: 시뮬 기반).
    """
    from backend.api.main import state

    pool = state.get("db")
    fallback = {"auto_actions": 6, "avg_poi": 0.04, "poi_reduction_pct": 83,
                "spaces_monitored": 8, "source": "시뮬"}
    if not pool:
        return fallback
    try:
        async with pool.acquire() as con:
            row = await con.fetchrow(
                "SELECT COUNT(*) FILTER (WHERE risk_tier >= 3) AS acts, "
                "AVG(poi) AS avg_poi, MAX(poi) AS max_poi, "
                "COUNT(DISTINCT space_id) AS spaces "
                "FROM sentinel.rehva_results "
                "WHERE calculated_at > NOW() - INTERVAL '24 hours'"
            )
            total_spaces = await con.fetchval("SELECT COUNT(*) FROM sentinel.spaces")
        if not row or row["acts"] is None or (row["avg_poi"] is None):
            return fallback
        avg_poi = float(row["avg_poi"] or 0)
        max_poi = float(row["max_poi"] or 0)
        reduction = round((1 - avg_poi / max_poi) * 100) if max_poi > 0 else 0
        return {
            "auto_actions": int(row["acts"] or 0),
            "avg_poi": round(avg_poi, 4),
            "poi_reduction_pct": reduction,
            "spaces_monitored": int(total_spaces or row["spaces"] or 0),
            "source": "실측",
        }
    except Exception as e:  # noqa: BLE001
        logger.warning("KPI 집계 실패(폴백): %s", e)
        return fallback
