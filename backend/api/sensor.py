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

import asyncio
import datetime
import logging
import math
import os
import time
from collections import defaultdict
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.api.auth import demo_mode, require_api_key
from backend.api.sse import publish_live
from pipeline.simulator.iaq import iaq_exceedances
from pipeline.simulator.rebreathed import infection_probability, tier_from_poi, quanta_for

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sensor", tags=["sensor"])


@router.get("/camera/stream")
async def camera_stream():
    """노트북 카메라 MJPEG를 VM이 중계(proxy) — 브라우저는 VM(공인IP)만 닿으면 영상을 본다.
    노트북은 Tailnet 안에 있고 VM은 거기 닿으므로, 시청 기기가 Tailnet이 아니어도 영상이 뜬다.
    소스는 CAM_SOURCE 환경변수(기본 노트북 Tailscale IP)."""
    src = os.getenv("CAM_SOURCE", "http://100.79.201.49:8089/video.mjpg")

    async def gen():
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, read=None)) as client:
                async with client.stream("GET", src) as r:
                    async for chunk in r.aiter_raw():
                        yield chunk
        except Exception as e:  # noqa: BLE001
            logger.warning("camera 중계 실패: %s", e)
            return

    return StreamingResponse(
        gen(), media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

_AUTO_TIER = "ALERT"                           # 자동 제어 허용 tier
_APPROVAL_TIERS = {"CRITICAL"}                 # 관리자 승인 필요 (위급만 — ALERT/HIGH_RISK는 자동)
_ACTIVE_TIERS = {"ALERT", "HIGH_RISK", "CRITICAL"}  # 강(强) 자동제어: 급속+송풍
_GENTLE_TIERS = {"CAUTION"}                    # 약(弱) 선제대응: 공기청정 LOW (외부 ORANGE/YELLOW 포함)
_last_tier: dict[str, str] = {}
_last_control_tier: dict[str, str] = {}
_control_active: dict[str, bool] = {}
_co2_baseline: dict[str, float] = {}
_prev_boost_space: dict[str, str] = {}  # space별 직전 외부boost — 발령 순간 baseline 재기준 감지용
_recovery_since: dict[str, float] = {}
_co2_active_peak: dict[str, float] = {}  # 가동 중 CO₂ 피크 — 회복은 '피크 대비 하강'으로 신속 판정(시연)
_co2_cooldown: dict[str, float] = {}  # 회복 직후 재가동 억제(같은 입김 잔류 CO₂로 깜빡임 방지)
_control_event_state: dict[str, dict] = {}  # 최근 전이 이벤트를 12초 유지해 SSE 프레임 유실 방지
_pending_approval: dict[str, dict] = {}

# 2단계 시연 상태기계: 외부 경보는 판정 기준만 상향하고, 실제 CO₂ 급상승 때만 가전 가동.
_CO2_SURGE_MIN = 700.0        # ppm: 입김/밀집으로 명확히 상승한 구간(평상 ~440 대비; 실측 입김이 ~900까지 도달)
_CO2_SURGE_DELTA = 300.0      # ppm: 평상 baseline 대비 급상승 최소폭
_CO2_RECOVERY_MAX = 800.0     # ppm: 정상 복귀 상한
_CO2_RECOVERY_HOLD = 3.0      # 초: 3초 연속 하강이면 복귀(시연 대기시간 단축)
_CO2_RECOVERY_DROP = 100.0    # ppm: 가동 피크 대비 이만큼 떨어지면(하강 전환) 회복 후보 — 입김 멈춘 뒤 ~10초에 포착(시연 리듬)
_CO2_RECOVERY_CEIL = 2000.0   # ppm: 회복은 이 수준 이하까지 내려와야 인정 — 포화가 고농도에서 꺼지는 어색함 방지(가볍게 불면 무관)
_CO2_REARM_COOLDOWN = 15.0    # 초: 회복 후 재가동 억제(입김 잔류 CO₂로 즉시 재발동·깜빡임 방지)
_control_mode: dict[str, str] = {}             # space_id -> "auto"|"manual" (기본 auto). manual이면 자동 액추에이션 보류
# space별 거버넌스 직렬화 락 — 같은 공간에 reading이 빠르게 연속 유입돼도
# tier 전이 판정~가전 액추에이션(await 다수)이 인터리브되어 명령이 뒤섞이지 않도록 보장.
_space_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
# 역할분리: 카메라(노트북 YOLO)가 실측 재실 '인원수'를 주력 제공, 라파이/아두이노는 환경센서 전용.
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


_OCC_HOLD_TTL = 10.0  # 초: 카메라가 사람을 놓쳐 0을 쏠 때 직전 인원을 이 시간 동안 유지(깜빡임 흡수)
_occ_last_nonzero: dict[str, tuple[int, float]] = {}


def _smooth_occupancy(space_id: str, value, now: float):
    """카메라 재실(occupancy) 디바운스 — YOLO가 프레임마다 사람을 놓쳐 0↔N 깜빡이면
    등급이 정상↔심각으로 튄다. 최근 _OCC_HOLD_TTL 안에 비영(非零)이 있었으면 0을 무시하고
    직전 인원을 유지. 진짜 비면 TTL 경과 후 0 수용(약간의 하강 지연만 발생).

    None(환경 POST)은 그대로 통과 → carry_forward가 처리.
    """
    if value is None:
        return None
    if value > 0:
        _occ_last_nonzero[space_id] = (value, now)
        return value
    prev = _occ_last_nonzero.get(space_id)  # value == 0
    if prev and (now - prev[1]) < _OCC_HOLD_TTL:
        return prev[0]
    return 0


# 시연 병동 파라미터 (Rudnick-Milton 입력)
DEMO_OCCUPANCY = 10
DEMO_INFECTORS = 1
DEMO_QUANTA = 30.0      # quanta/h (인플루엔자급)
DEMO_EXPOSURE_H = 1.0


_TIER_RANK = {"MONITOR": 0, "CAUTION": 1, "ALERT": 2, "HIGH_RISK": 3, "CRITICAL": 4}
_TIER_NAMES = ["MONITOR", "CAUTION", "ALERT", "HIGH_RISK", "CRITICAL"]


def _gov_level(t) -> str:
    """tier → 자동제어 단계(위험도 비례). '항상 최대'가 아니라 등급별 차등이 핵심.

    approval(CRITICAL) > strong(ALERT/HIGH_RISK) > gentle(CAUTION) > idle(MONITOR).
    """
    if t in _APPROVAL_TIERS:
        return "approval"
    if t in _ACTIVE_TIERS:
        return "strong"
    if t in _GENTLE_TIERS:
        return "gentle"
    return "idle"


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


def compute_tier(co2, gas_raw, temp=None, humidity=None, occupancy=None,
                 pathogen=None, quanta=None, infectors=None):
    """감염위험(CO2 재호흡률/가스) + 환경위험(온습도)을 종합해 더 높은 tier 채택.

    occupancy(재실 인원): None이면 시연 가정 DEMO_OCCUPANCY 사용. 0이면 빈 병실 →
    infection_probability가 (0, f) 반환 → PoI 0 → MONITOR(사람 없으면 감염위험 0).
    LD2310C는 재실 '유무'만 주므로 bridge가 재실=상수폴백(None)/부재=0 으로 게이팅.

    quanta/pathogen(선택): 병원체별 q(quanta/h)를 반영. 둘 다 미지정이면 기존 동작과 동일하게
    DEMO_QUANTA(인플루엔자급 30) 사용 → 라이브/데모 호환. pathogen 지정 시 quanta_for()로 해석.
    """
    n = DEMO_OCCUPANCY if occupancy is None else occupancy
    q = quanta if quanta is not None else (quanta_for(pathogen) if pathogen else DEMO_QUANTA)
    # PoI(전파 위험확률) = 1−exp(−f·(I/n)·q·t). 감염원 I=ctx(평상시 0 → PoI 0 → 정상,
    # 외부 경보 시 DEMO_INFECTORS). PoI 값과 등급(tier)이 같은 가정을 공유해 "56%인데 정상" 모순 제거.
    ctx = DEMO_INFECTORS if infectors is None else infectors
    if co2 is not None:
        poi, f = infection_probability(
            co2, ctx, n, q, DEMO_EXPOSURE_H
        )
        base = tier_from_poi(poi) if (ctx and ctx > 0) else "MONITOR"
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


def _actuation_on() -> bool:
    """실기기 작동 마스터 스위치. 기본 OFF — 센서 ingest마다 제어가 걸려 공청기가
    ON/OFF·풍량을 난무하던 문제 방지(데모 안정화). 상태 조회/대시보드 표시는 영향 없음.
    완성 후 `.env` 에 SENTINEL_ACTUATE=1 넣고 백엔드 재기동하면 완전 제어 복원."""
    return os.getenv("SENTINEL_ACTUATE", "0") == "1"


async def _control_coway(wind: str) -> Optional[dict]:
    if not _actuation_on():
        return None  # 실기기 미작동(마스터 스위치 OFF) — 표시/로직은 유지
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
    if not _actuation_on():
        return None  # 실기기 미작동(마스터 스위치 OFF)
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
    if not _actuation_on():
        return None  # 실기기 미작동(마스터 스위치 OFF)
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
    # 카메라 0 깜빡임 디바운스 후 carry-forward (환경 POST의 None은 그대로 통과)
    occ_in = _smooth_occupancy(r.space_id, r.occupancy, now)
    occ_eff = _carry_forward(r.space_id, "occupancy", occ_in, now)

    # 2) Rudnick-Milton 재호흡률 → PoI → tier
    #    재실 인원: 카메라가 occupancy 명시 → 채택+보존, 환경 POST(생략) → 직전값 carry(위 1.5),
    #    한 번도 안 붙었으면 DEMO_OCCUPANCY 폴백. 0=빈 공간→PoI 0. (carry_forward가 co2/pm25도 함께 보충)
    # n_eff = 유효 재실(미측정 시 DEMO 폴백). tier 판정·DB 적재·KPI 모두 이 단일값 사용.
    # (compute_tier도 내부적으로 같은 폴백을 적용하지만, 소스를 하나로 명시해 혼동 제거.)
    n_eff = DEMO_OCCUPANCY if occ_eff is None else occ_eff
    # 외부 조기경보 상태 먼저 확인 — 감염자 가정수 I 결정에 사용.
    tier_source = "sensor"
    ext_boost = "MONITOR"
    ext_region = None
    try:
        from backend.api.external_live import external_boost_info

        bi = external_boost_info()
        ext_boost = bi.get("tier", "MONITOR")
        ext_region = bi.get("region")
    except Exception:  # noqa: BLE001
        pass
    # Rudnick-Milton PoI = 1−exp(−f·(I/n)·q·t). 감염원 I가 0이면 PoI 0(평상시=정상).
    # 평상시(외부 경보 없음): I=0 → 감염위험 0. 외부 지역경보 시: 예방적 I=DEMO_INFECTORS.
    inf = DEMO_INFECTORS if ext_boost != "MONITOR" else 0
    tier, poi, f = compute_tier(co2, r.gas_raw, r.temp_c, r.humidity, occupancy=n_eff, infectors=inf)
    sensor_tier = tier  # 외부 boost 적용 전 순수 실내센서 판정 — 2단계 시연/음성 트리거용
    # 외부신호 선제 boost floor — 센서 정상이어도 tier 상향(사전예방).
    if _TIER_RANK.get(ext_boost, 0) > _TIER_RANK.get(tier, 0):
        tier = ext_boost
        tier_source = "external"
    exceed = iaq_exceedances(co2=co2, pm25=pm25)

    # 2.5) 외부 경보 대기 → 실제 CO₂ 급상승 가동 → 5초 연속 회복 종료.
    # 공기청정기는 CO₂를 제거하지 않으므로, 복귀는 가전 명령 시간이 아니라 실제 센서값으로만 판정한다.
    active_before = _control_active.get(r.space_id, False)
    baseline = _co2_baseline.get(r.space_id, float(co2) if co2 is not None else 450.0)
    # ★발령(MONITOR→armed) 순간 baseline을 현재 CO₂로 재기준 — 평상값이 뒤처져 있어도(예: CO₂가
    #   막 급등) 발령만으로 즉시 오발동하지 않게(delta=0에서 시작 → 입김 불어야만 발동).
    _prev_b = _prev_boost_space.get(r.space_id, "MONITOR")
    _prev_boost_space[r.space_id] = ext_boost
    if _prev_b == "MONITOR" and ext_boost != "MONITOR" and co2 is not None:
        baseline = float(co2)
        _co2_baseline[r.space_id] = baseline
    control_event = None
    # baseline = 이 공간의 평상시 평균 CO₂(처음 켜진 값에서 EMA로 적응). 환경마다 절대농도가
    # 달라(어떤 방은 500, 어떤 방은 1100) 절대 임계 대신 '이 방 평균 대비 상승폭'으로 급상승 판정.
    # ★발령(armed) 전 평상 구간에서만 baseline 갱신 → 발령되면 그 순간 평상값으로 동결되어
    #   입김 상승을 baseline이 쫓아가며 흡수하지 못한다(고ambient 방에서도 입김이 확실히 잡힘).
    if not active_before and ext_boost == "MONITOR" and co2 is not None and (float(co2) - baseline) < _CO2_SURGE_DELTA:
        baseline = baseline * 0.85 + float(co2) * 0.15
        _co2_baseline[r.space_id] = baseline
    surge = bool(
        ext_boost != "MONITOR" and co2 is not None
        and float(co2) - baseline >= _CO2_SURGE_DELTA   # 이 방 평균 대비 상승 → 환경 무관(절대 floor 없음)
        and _TIER_RANK.get(sensor_tier, 0) >= 2  # ALERT 이상(감염위험확률 PoI 상승)
        and now >= _co2_cooldown.get(r.space_id, 0.0)  # 회복 직후 쿨다운 중엔 재가동 금지(깜빡임 방지)
    )
    control_active = active_before
    if not active_before and surge:
        control_active = True
        control_event = "activated"
        _recovery_since.pop(r.space_id, None)
        _co2_active_peak[r.space_id] = float(co2)  # 가동 시작 CO₂를 피크 초기값으로
    elif active_before:
        # 가동 중 CO₂ 피크 추적 → 회복은 '피크 대비 하강' 또는 '평상 근접'으로 신속 판정.
        # 공기청정기는 CO₂를 직접 제거하지 않으므로 절대 baseline 복귀를 기다리면 시연이 길어진다.
        if co2 is not None:
            _co2_active_peak[r.space_id] = max(_co2_active_peak.get(r.space_id, float(co2)), float(co2))
        peak = _co2_active_peak.get(r.space_id, float(co2) if co2 is not None else baseline)
        # 회복: '피크 대비 명확한 하강'(환기 효과) + '믿을 만한 절대수준'을 함께 만족해야 OFF.
        #   - peak-DROP: 입김 멈춘 뒤 하강 전환을 ~15~20초에 신속 포착(시연 리듬).
        #   - CEIL 동반조건: 5000 포화 시 4800에서 꺼지는 어색함 방지(실제로 내려와야 OFF).
        recovered_now = bool(
            co2 is not None
            and (float(co2) <= baseline + 150.0                      # 평상 근접(절대)
                 or (float(co2) <= peak - _CO2_RECOVERY_DROP         # 피크 대비 하강(하강 전환)
                     and float(co2) <= _CO2_RECOVERY_CEIL))          # 동시에 믿을만한 수준까지 내려옴
        )
        if recovered_now:
            since = _recovery_since.setdefault(r.space_id, now)
            if now - since >= _CO2_RECOVERY_HOLD:
                control_active = False
                control_event = "recovered"
                _recovery_since.pop(r.space_id, None)
                _co2_active_peak.pop(r.space_id, None)
                _co2_cooldown[r.space_id] = now + _CO2_REARM_COOLDOWN  # 잔류 CO₂ 재발동 억제
        else:
            _recovery_since.pop(r.space_id, None)
    if ext_boost == "MONITOR":
        # 발령 해제(평상시) → 다음 시연을 위해 쿨다운/회복상태 깨끗이 정리
        _co2_cooldown.pop(r.space_id, None)
        if control_active:
            control_active = False
            control_event = "stopped"
            _recovery_since.pop(r.space_id, None)
            _co2_active_peak.pop(r.space_id, None)
    _control_active[r.space_id] = control_active
    if control_event:
        prev_event = _control_event_state.get(r.space_id, {})
        _control_event_state[r.space_id] = {
            "event": control_event, "id": int(prev_event.get("id", 0)) + 1, "t": now,
        }
    recent_event = _control_event_state.get(r.space_id)
    if recent_event and now - float(recent_event["t"]) <= 12.0:
        control_event_out = recent_event["event"]
        control_event_id = int(recent_event["id"])
    else:
        control_event_out = None
        control_event_id = None

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
                    "(calculated_at, site_id, space_id, poi, r_event, risk_tier, i_value, q_value, tier_source) "
                    "VALUES (NOW(), $1, $2, $3, NULL, $4, $5, $6, $7)",
                    site_uuid, space_uuid,
                    min(max(poi if poi is not None else 0.0, 0.0), 1.0),  # 가스 단독 경로는 poi=None
                    _TIER_RANK.get(tier, 0) + 1,
                    float(DEMO_INFECTORS), float(DEMO_QUANTA),
                    tier_source,  # sensor=실내센서발 / external=외부 조기경보발 — 사전예방 집계 분리용
                )
    except Exception as e:  # noqa: BLE001
        logger.warning("sensor 적재 실패(데모 진행): %s", e)

    # 4) 가전 제어 — 외부 경보 자체는 armed 상태일 뿐 실제 가전을 켜지 않는다.
    #    CO₂ 급상승으로 control_active가 전이될 때 TURBO, 5초 회복 시 OFF.
    coway_action = None
    approval_required = False
    governance = "armed" if ext_boost != "MONITOR" and not control_active else "none"

    async with _space_locks[r.space_id]:
        prev = _last_tier.get(r.space_id)
        _last_tier[r.space_id] = tier
        control_tier = "HIGH_RISK" if control_active else "MONITOR"
        # 프로세스 재시작 뒤 실제 기기 상태가 남아 있을 수 있어 첫 inactive reading은 OFF로 동기화한다.
        prev_control_tier = _last_control_tier.get(
            r.space_id, "MONITOR" if control_active else "HIGH_RISK"
        )
        _last_control_tier[r.space_id] = control_tier
        mode = _control_mode.get(r.space_id, "auto")
        if mode == "manual":
            governance = "manual"
        elif control_tier != prev_control_tier:
            if control_active:
                await _power_coway(True)
                coway_action = await _control_coway("TURBO")
                await _control_ac(True, mode="WIND", wind="HIGH")
                governance = "auto_sensor_surge"
            else:
                coway_action = await _power_coway(False)
                await _control_ac(False)
                _pending_approval.pop(r.space_id, None)
                governance = "auto_restore"

    # 5) SSE 푸시 (공식 대입값 포함 — 알고리즘 투명성)
    payload = {
        "space_id": r.space_id,
        "tier": tier,
        "sensor_tier": sensor_tier,
        "tier_source": tier_source,        # sensor=실내센서 감지 / external=외부 조기경보 상향
        "boost_region": ext_region,        # external일 때 발령 지역(예: 부산광역시)
        "control_active": control_active,
        "control_event": control_event_out,
        "control_event_id": control_event_id,
        "co2_baseline": round(baseline, 1),
        "co2_surge_delta": round(float(co2) - baseline, 1) if co2 is not None else None,
        "recovery_hold_s": _CO2_RECOVERY_HOLD,
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
        "ok": True, "tier": tier, "sensor_tier": sensor_tier, "tier_source": tier_source,
        "co2_ppm": co2, "rebreathed_fraction": f, "poi": poi,
        "control_active": control_active, "control_event": control_event_out,
        "control_event_id": control_event_id,
        "co2_baseline": round(baseline, 1),
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


class ModeReq(BaseModel):
    space_id: str = "ward_a"
    mode: str             # auto | manual
    password: str = ""


@router.post("/mode", dependencies=[Depends(require_api_key)])
async def set_control_mode(req: ModeReq):
    """자동/수동 제어 모드 전환 — 관리자 비밀번호 필요(ADMIN_CONTROL_PW).

    manual: 자동 거버넌스(코웨이/에어컨 자동 가동) 보류 → 관리자가 콘솔로 직접 제어.
    auto:   외부신호·센서 기반 자동 차등제어 재개.

    보안: ADMIN_CONTROL_PW 미설정 시 하드코딩 기본값('admin')으로 열리지 않는다(fail-closed).
          명시적 데모 모드(SENTINEL_DEMO=1)에서만 데모 전용 기본 비번('admin')을 임시 허용.
    """
    admin_pw = os.getenv("ADMIN_CONTROL_PW")
    if not admin_pw:
        if demo_mode():
            admin_pw = "admin"  # 데모 전용 임시 기본 — 운영에선 절대 사용 안 됨
            logger.warning("ADMIN_CONTROL_PW 미설정 — 데모 모드 기본 비번('admin') 사용. 운영 배포 전 설정 필수.")
        else:
            # fail-closed: 비번 미설정 + 비데모 → 제어모드 전환 거부.
            logger.warning("ADMIN_CONTROL_PW 미설정 & 비데모 — 제어모드 전환 거부(fail-closed).")
            raise HTTPException(status_code=403, detail="제어모드 전환 비활성: ADMIN_CONTROL_PW 미설정(운영 fail-closed)")
    if not req.password or req.password != admin_pw:
        raise HTTPException(status_code=403, detail="관리자 비밀번호가 올바르지 않습니다")
    mode = "manual" if req.mode == "manual" else "auto"
    _control_mode[req.space_id] = mode
    publish_live(req.space_id, {"space_id": req.space_id, "event": "mode_change", "mode": mode})
    return {"ok": True, "space_id": req.space_id, "mode": mode}


@router.get("/mode")
async def get_control_mode(space_id: str = "ward_a"):
    """현재 제어 모드(auto/manual) 조회."""
    return {"space_id": space_id, "mode": _control_mode.get(space_id, "auto")}


@router.get("/series")
async def sensor_series(space_id: str = "ward_a", minutes: int = 30, points: int = 30):
    """선택 공간 환경 시계열(CO2·PM2.5·온도·습도) — FM 실시간 차트용.

    실측(sensor_readings, co2 비어있지 않은 행)이 충분하면 실측, 없으면 라벨된 시뮬 폴백
    (실센서 미가동 시에도 데모 차트 유지 — overview의 시뮬 라벨 정책과 동일).
    """
    from backend.api.main import state

    out = []
    pool = state.get("db")
    if pool:
        try:
            async with pool.acquire() as con:
                if "-" in space_id and len(space_id) >= 32:
                    space_uuid = space_id
                else:
                    _, space_uuid = await _resolve_space(con, space_id)
                # 분단위 집계 — 브릿지가 초당 여러 건 적재해도 차트는 분당 1점(가독성).
                #   온습도(또는 co2) 실측이 하나라도 있으면 실측으로 취급(현재 CO2 센서 교체 중→온습도 위주).
                rows = await con.fetch(
                    "SELECT date_trunc('minute', time) AS t, "
                    "AVG(co2_ppm) co2, AVG(pm25_ugm3) pm25, AVG(temperature) temp, AVG(humidity) rh "
                    "FROM sentinel.sensor_readings "
                    f"WHERE space_id=$1 AND time > NOW() - INTERVAL '{int(minutes)} min' "
                    "AND (temperature IS NOT NULL OR humidity IS NOT NULL OR co2_ppm IS NOT NULL) "
                    "GROUP BY 1 ORDER BY 1",
                    space_uuid,
                )
                out = [{
                    "t": r["t"].strftime("%H:%M"),
                    "co2": round(r["co2"]) if r["co2"] is not None else None,
                    "pm25": round(r["pm25"]) if r["pm25"] is not None else None,
                    "temp": round(r["temp"], 1) if r["temp"] is not None else None,
                    "rh": round(r["rh"], 1) if r["rh"] is not None else None,
                } for r in rows]
        except Exception as e:  # noqa: BLE001
            logger.warning("series 조회 실패: %s", e)
    if len(out) >= 5:
        return {"space_id": space_id, "source": "실측", "points": out}
    # 시뮬 폴백 — 공간별로 다른 베이스라인(결정적), 라벨 명시
    base = 620 + (sum(ord(c) for c in space_id) % 140)
    sim = [{
        "t": f"-{points - i}m",
        "co2": base + int(150 * math.sin(i / 4.0)) + (i * 7 % 45),
        "pm25": 7 + (i * 3 % 6),
        "temp": round(23 + 1.3 * math.sin(i / 6.0), 1),
        "rh": round(48 + 5 * math.sin(i / 5.0), 1),
    } for i in range(points)]
    return {"space_id": space_id, "source": "시뮬", "points": sim}


@router.get("/risk-series")
async def risk_series(space_id: str = "ward_a", minutes: int = 30):
    """감염위험 확률(PoI) 시계열 — Rudnick-Milton CO2 재호흡 모델 산출값(rehva_results).

    간호사 위험확률 그래프용. 실측 PoI(0~1)를 분단위 평균으로 % 환산.
    근거: Rudnick SN & Milton DK (2003), Indoor Air 13(3):237-245.
    """
    from backend.api.main import state

    out = []
    pool = state.get("db")
    if pool:
        try:
            async with pool.acquire() as con:
                if "-" in space_id and len(space_id) >= 32:
                    space_uuid = space_id
                else:
                    _, space_uuid = await _resolve_space(con, space_id)
                rows = await con.fetch(
                    "SELECT date_trunc('minute', calculated_at) AS t, AVG(poi) poi, MAX(risk_tier) tier "
                    "FROM sentinel.rehva_results "
                    f"WHERE space_id=$1 AND calculated_at > NOW() - INTERVAL '{int(minutes)} min' "
                    "GROUP BY 1 ORDER BY 1",
                    space_uuid,
                )
                out = [{
                    "t": r["t"].strftime("%H:%M"),
                    "poi": round((r["poi"] or 0.0) * 100, 2),       # 감염확률 %
                    "tier": int(r["tier"]) if r["tier"] is not None else 1,
                } for r in rows]
        except Exception as e:  # noqa: BLE001
            logger.warning("risk-series 조회 실패: %s", e)
    if len(out) >= 5:
        return {"space_id": space_id, "source": "실측", "points": out}
    # 시뮬 폴백 — 결정적 완만 곡선(데모, 라벨 명시)
    base = sum(ord(c) for c in space_id) % 5
    n = min(int(minutes), 30)
    sim = [{
        "t": f"-{n - i}m",
        "poi": round(max(0.0, base + 4 * (math.sin(i / 5.0) + 1)), 2),
        "tier": 1,
    } for i in range(n)]
    return {"space_id": space_id, "source": "시뮬", "points": sim}


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


def _derive_reading(base, base_occ, space_name: str, space_type: str) -> dict:
    """타 호실값을 201호 '실측'에서 파생(추정) — 온습도는 실측 앵커, CO2/인원은 룸별 모델.

    센서 미설치 호실을 실센서로 위장하지 않기 위함(라벨='파생'). 실측 환경(온습도)을
    건물 공통 기준으로 깔고, 공간 타입별 밀집/환기 특성으로 CO2·재실을 변형한다.
    """
    import math

    seed = sum(ord(c) for c in space_name)
    t = time.time() / 60.0
    wave = math.sin(t + seed)  # 분 단위 완만 변동(라이브감)

    b_temp = base["temperature"] if base and base["temperature"] is not None else 23.5
    b_hum = base["humidity"] if base and base["humidity"] is not None else 50.0

    # 온습도: 201호 실측에 룸별 미세 편차(건물 공통 환경 반영)
    temp = round(b_temp + (seed % 3 - 1) * 0.4 + wave * 0.3, 1)
    hum = round(b_hum + (seed % 5 - 2) * 0.8 + wave * 1.5, 1)

    # CO2: 룸 타입별 baseline(실측 201호는 입김 포화 outlier라 직접 앵커 대신 모델) + 변동
    base_co2 = 480 + (seed % 200)
    if space_type == "ISOLATION":
        base_co2 += 700   # 환기 제한 격리실 → 고위험
    elif space_type == "DINING":
        base_co2 += 550   # 식사 밀집
    elif space_type == "LOUNGE":
        base_co2 += 120
    co2 = round(max(420, base_co2 + wave * 140), 0)

    gas = round(max(60, 140 + (seed % 60) + (220 if space_type == "ISOLATION" else 0) + wave * 50), 0)

    # 재실: 카메라 실측 인원(201호)을 기준으로 룸별 변형(빈 병실/밀집 다양성)
    if base_occ is not None:
        occ = max(0, int(base_occ) + (seed % 5 - 2))
    else:
        occ = (seed % 6)

    return {"gas_raw": gas, "temp_c": temp, "humidity": hum,
            "co2_ppm": co2, "pm25": round(15 + (seed % 25), 0), "occupancy": occ}


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
    pathogen_source = "explicit" if pathogen else None
    if pathogen is None:
        # 데모 일관성: 외부 조기경보로 선택된 병원체(예: 광주 influenza)를 계절기본보다 우선 반영
        # → "외부 인플루엔자 경보 → 인플루엔자 프로토콜" 이 한 화면에서 일치.
        try:
            from backend.api.external_live import external_boost_info
            from backend.services.uis_reader import UIS_TO_SENTINEL
            binfo = external_boost_info() or {}
            disease = (binfo.get("disease") or "").lower()
            if binfo.get("tier") and binfo.get("tier") != "MONITOR" and disease in UIS_TO_SENTINEL:
                pathogen = UIS_TO_SENTINEL[disease]
                pathogen_source = "external"
        except Exception:
            pass
    if pathogen is None:
        pathogen = _SEASON_DEFAULT_PATHOGEN.get(season, "COVID-19")
        pathogen_source = "season"
    plan = explain_plan(pathogen, tier, season)
    plan["space_id"] = space_id
    plan["tier_source"] = tier_source
    plan["pathogen_source"] = pathogen_source
    return plan


@router.get("/spaces/overview")
async def spaces_overview():
    """전 공간 현재 위험도(다병동 그리드·평면도 히트맵용).

    실센서 병동은 최근 적재값, 그 외는 라벨된 시뮬값. 외부신호 boost 공통 반영.
    """
    from backend.api.main import state

    boost_region = None
    try:
        from backend.api.external_live import external_boost_info
        bi = external_boost_info()
        boost = bi.get("tier", "MONITOR")
        boost_region = bi.get("region")
    except Exception:  # noqa: BLE001
        boost = "MONITOR"

    pool = state.get("db")
    out = []
    if not pool:
        return {"spaces": [], "boost": boost}
    async with pool.acquire() as con:
        # 실측 앵커 — 실센서(201호) 최신 온습도/CO2 + 카메라 최신 재실. 타 호실 '파생'의 기준값.
        base = await con.fetchrow(
            "SELECT co2_ppm, temperature, humidity FROM sentinel.sensor_readings "
            "WHERE temperature IS NOT NULL AND time > NOW() - INTERVAL '5 min' "
            "ORDER BY time DESC LIMIT 1"
        )
        base_occ = await con.fetchval(
            "SELECT occupancy FROM sentinel.sensor_readings "
            "WHERE occupancy IS NOT NULL AND time > NOW() - INTERVAL '5 min' "
            "ORDER BY time DESC LIMIT 1"
        )
        spaces = await con.fetch(
            "SELECT id, space_name, space_type, area_m2, max_occupancy "
            "FROM sentinel.spaces ORDER BY space_type, space_name"
        )
        for s in spaces:
            r = await con.fetchrow(
                "SELECT co2_ppm, pm25_ugm3, temperature, humidity, gas_raw, occupancy, time "
                "FROM sentinel.sensor_readings WHERE space_id=$1 AND time > NOW() - INTERVAL '2 min' "
                "ORDER BY time DESC LIMIT 1",
                s["id"],
            )
            if r:
                vals = {"gas_raw": r["gas_raw"], "temp_c": r["temperature"],
                        "humidity": r["humidity"], "co2_ppm": r["co2_ppm"], "pm25": r["pm25_ugm3"],
                        "occupancy": r["occupancy"]}
                source = "실센서"
            elif base:
                # 센서 미설치 호실 — 201호 실측 기반 파생(추정). 실센서로 위장하지 않음(정직 라벨).
                vals = _derive_reading(base, base_occ, s["space_name"], s["space_type"])
                source = "파생"
            else:
                vals = _sim_reading(s["space_name"], s["space_type"])
                source = "시뮬"
            # 실재실(카메라/센서 적재값)로 tier 계산 — /reading 의 실제 의사결정과 정합.
            # 빈 병실(occupancy 0)이면 PoI 0 → 정상(MONITOR). 미측정(None)이면 내부 DEMO 폴백(시뮬 공간).
            # 감염자 가정 I: 평상시 0(감염원 없음→PoI 0→정상), 외부 경보 시 예방적 I=DEMO_INFECTORS.
            tier, poi, _f = compute_tier(
                vals["co2_ppm"], vals["gas_raw"], vals["temp_c"], vals["humidity"],
                occupancy=vals.get("occupancy"),
                infectors=(DEMO_INFECTORS if boost != "MONITOR" else 0),
            )
            sensor_tier = tier
            tier_source = "sensor"
            if _TIER_RANK.get(boost, 0) > _TIER_RANK.get(tier, 0):
                tier = boost
                tier_source = "external"          # 이 공간 tier는 외부 조기경보발(發) 상향
            # 표시 전용 클램프: 재실 인원은 물리 정원을 넘을 수 없음.
            # (카메라 미실행 시 DEMO_OCCUPANCY=10 폴백이 1인실 격리실에 10명처럼 보이는 것 방지.
            #  tier/poi는 위에서 원시값으로 이미 계산됨 — 의사결정엔 영향 없음.)
            if vals.get("occupancy") is not None and s["max_occupancy"]:
                vals["occupancy"] = min(int(vals["occupancy"]), int(s["max_occupancy"]))
            control_fields = {}
            if source == "실센서":
                event_state = _control_event_state.get("ward_a")
                event_fresh = bool(event_state and time.time() - float(event_state["t"]) <= 12.0)
                control_fields = {
                    "control_active": _control_active.get("ward_a", False),
                    "control_event": event_state["event"] if event_fresh else None,
                    "control_event_id": int(event_state["id"]) if event_fresh else None,
                    "co2_baseline": round(_co2_baseline.get("ward_a", 450.0), 1),
                    "recovery_hold_s": _CO2_RECOVERY_HOLD,
                }
            out.append({
                "space_id": str(s["id"]),
                "space_name": s["space_name"], "space_type": s["space_type"],
                "area_m2": s["area_m2"], "max_occupancy": s["max_occupancy"],
                "tier": tier, "sensor_tier": sensor_tier,
                "tier_source": tier_source, "poi": poi, "source": source, **vals, **control_fields,
            })
    return {"spaces": out, "boost": boost, "boost_region": boost_region, "count": len(out)}


@router.get("/kpi")
async def performance_kpi():
    """Performance Tracker — 경영성과 지표(최근 24h). 대시보드 상단 카드용.

    - auto_actions: 자동 선제대응 횟수(tier≥ALERT 산출 건수)
    - avg_poi: 평균 감염확률
    - poi_reduction_pct: 평균이 기간 '피크' 대비 얼마나 낮은지(변동 폭 지표).
      ※ ThinQ 개입에 의한 '저감 효과'로 단정하지 말 것 — 단순 평균/최대 격차임.
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


# 추정 단가: 자동 선제대응 1건당 절감액(수동 방역 인건+에너지). 발표 시 심평원/현장수치로 교체.
EST_SAVING_PER_ACTION_KRW = 8000


@router.get("/report")
async def director_report(days: int = 30):
    """병원장(시설장) 경영 리포트 — 최근 N일 '실측' 집계.

    포지셔닝: 감염 '예방 효능'을 단정하지 않고, **측정 가능한 감염관리 활동**(자동
    선제대응·모니터링 커버리지·위험 저감율)만 보고한다. → 적정성평가 증빙 직결.
    비용 절감은 추정(EST_SAVING_PER_ACTION_KRW)이며 UI에서 '추정'으로 명시한다.
    DB 미연결/데이터 부족 시 시뮬 폴백(정직 표기).
    """
    from backend.api.main import state

    pool = state.get("db")
    fallback = {
        "period": {"start": None, "end": None, "days": days},
        "auto_actions": 84, "preemptive_actions": 52, "sensor_actions": 32,
        "alert_events": 0, "avg_poi": 0.02, "peak_poi": 0.05,
        "poi_reduction_pct": 83, "spaces_monitored": 8, "readings": 0,
        "est_cost_saved_krw": 84 * EST_SAVING_PER_ACTION_KRW, "compliance_pct": 100,
        "max_lead_days": 43, "preempt_region": "부산광역시", "preempt_disease": "influenza",
        "weekly": [{"week": "1주차", "actions": 84,
                    "est_saved_krw": 84 * EST_SAVING_PER_ACTION_KRW}],
        "source": "시뮬",
    }
    if not pool:
        return fallback
    try:
        interval = f"{int(days)} days"
        async with pool.acquire() as con:
            # 자동대응 '건수'는 개별 reading이 아니라 ALERT '진입 이벤트'로 집계.
            #   = tier가 ALERT 미만→ALERT↑ 로 바뀐 순간 = 가전 자동가동이 실제 트리거된 횟수.
            #   (reading 단위로 세면 한 번의 환기 에피소드가 수천 건으로 부풀어 오차).
            agg = await con.fetchrow(
                "WITH seq AS ("
                "  SELECT space_id, calculated_at, poi, risk_tier, tier_source, "
                "    LAG(risk_tier) OVER (PARTITION BY space_id ORDER BY calculated_at) prev "
                "  FROM sentinel.rehva_results "
                f"  WHERE calculated_at > NOW() - INTERVAL '{interval}') "
                "SELECT "
                "  COUNT(*) FILTER (WHERE risk_tier>=3 AND (prev IS NULL OR prev<3)) acts, "
                "  COUNT(*) FILTER (WHERE risk_tier>=3 AND (prev IS NULL OR prev<3) AND tier_source='external') preempt, "
                "  COUNT(*) FILTER (WHERE risk_tier>=5 AND (prev IS NULL OR prev<5)) crit, "
                "  AVG(poi) avg_poi, MAX(poi) max_poi, COUNT(DISTINCT space_id) spaces, "
                "  MIN(calculated_at) t0, MAX(calculated_at) t1 "
                "FROM seq"
            )
            readings = await con.fetchval(
                "SELECT COUNT(*) FROM sentinel.sensor_readings "
                f"WHERE time > NOW() - INTERVAL '{interval}'"
            )
            total_spaces = await con.fetchval("SELECT COUNT(*) FROM sentinel.spaces")
            weekly_rows = await con.fetch(
                "WITH seq AS ("
                "  SELECT space_id, calculated_at, risk_tier, "
                "    LAG(risk_tier) OVER (PARTITION BY space_id ORDER BY calculated_at) prev "
                "  FROM sentinel.rehva_results "
                f"  WHERE calculated_at > NOW() - INTERVAL '{interval}') "
                "SELECT date_trunc('week', calculated_at)::date wk, "
                "COUNT(*) FILTER (WHERE risk_tier>=3 AND (prev IS NULL OR prev<3)) acts "
                "FROM seq GROUP BY 1 ORDER BY 1"
            )
        if not agg or agg["acts"] is None or agg["avg_poi"] is None:
            return fallback
        acts = int(agg["acts"] or 0)
        preempt = int(agg["preempt"] or 0)        # 외부 조기경보발(선제) 대응
        sensor_acts = max(acts - preempt, 0)      # 실내센서 감지발 대응
        avg_poi = float(agg["avg_poi"] or 0)
        max_poi = float(agg["max_poi"] or 0)
        reduction = round((1 - avg_poi / max_poi) * 100) if max_poi > 0 else 0
        # 외부 조기경보 선행일수(확진피크 N일 전 사전 포착) — 사전예방 차별점 증거
        preempt_info = {}
        try:
            from backend.api.external_live import preemptive_lead
            preempt_info = await preemptive_lead()
        except Exception:  # noqa: BLE001
            preempt_info = {}
        spaces = int(agg["spaces"] or 0)
        total = int(total_spaces or spaces or 0)
        compliance = round(100 * spaces / total) if total else 0  # 모니터링 커버리지
        weekly = [
            {"week": f"{i + 1}주차", "date": str(r["wk"]),
             "actions": int(r["acts"] or 0),
             "est_saved_krw": int(r["acts"] or 0) * EST_SAVING_PER_ACTION_KRW}
            for i, r in enumerate(weekly_rows)
        ]
        return {
            "period": {
                "start": agg["t0"].isoformat() if agg["t0"] else None,
                "end": agg["t1"].isoformat() if agg["t1"] else None,
                "days": days,
            },
            "auto_actions": acts,
            "preemptive_actions": preempt,   # 외부 조기경보발 선제 대응(센서 정상이어도 미리 가동)
            "sensor_actions": sensor_acts,   # 실내센서 감지발 대응
            "alert_events": int(agg["crit"] or 0),
            "avg_poi": round(avg_poi, 4),
            "peak_poi": round(max_poi, 4),
            "poi_reduction_pct": reduction,
            "spaces_monitored": total,
            "readings": int(readings or 0),
            "est_cost_saved_krw": acts * EST_SAVING_PER_ACTION_KRW,
            "compliance_pct": compliance,
            # 사전예방 차별점: 외부 조기경보가 확진피크보다 며칠 선행했나(최대) + 지역/질환
            "max_lead_days": preempt_info.get("max_lead_days"),
            "preempt_region": preempt_info.get("region"),
            "preempt_disease": preempt_info.get("disease"),
            "weekly": weekly,
            "source": "실측",
        }
    except Exception as e:  # noqa: BLE001
        logger.warning("리포트 집계 실패(폴백): %s", e)
        return fallback
