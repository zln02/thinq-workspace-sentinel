"""Rudnick-Milton CO2 기반 Wells-Riley 감염확률.

근거: Rudnick SN, Milton DK (2003)
      "Risk of indoor airborne infection transmission estimated from
       carbon dioxide concentration", Indoor Air 13(3):237-245.

핵심 아이디어: 실내 CO2 농도는 '남이 내쉰 공기를 다시 들이마신 비율(재호흡 분율 f)'을
직접 반영한다. 따라서 환기율(ACH)을 따로 추정하지 않고도 CO2 측정값만으로
공기감염 확률을 산출할 수 있다.

    f = (C_in - C_out) / C_exhaled         (재호흡 분율)
    P = 1 - exp( - f · (I/n) · q · t )      (감염확률)

이로써 "센서 CO2(코웨이 실측) → 재호흡률 → 감염확률 → 5-Tier" 경로가 완성된다.
"""
from __future__ import annotations

import math

# Rudnick-Milton 2003 상수
C_EXHALED_PPM = 38000.0  # 사람 호기(날숨)의 CO2 농도
C_OUTDOOR_PPM = 420.0     # 외기 CO2 기준 (현대 대기)

# 5-Tier PoI 임계 (기존 space.tier() 와 정합: Kim et al. 2025)
_POI_THRESHOLDS = [
    (0.30, "CRITICAL"),
    (0.15, "HIGH_RISK"),
    (0.05, "ALERT"),
    (0.01, "CAUTION"),
]


def rebreathed_fraction(
    co2_ppm: float | None,
    co2_outdoor: float = C_OUTDOOR_PPM,
    co2_exhaled: float = C_EXHALED_PPM,
) -> float:
    """재호흡 분율 f = (C_in - C_out)/C_exhaled (0~1).

    실내 CO2가 외기보다 높을수록, 남이 내쉰 공기를 더 많이 재호흡한다는 의미.
    """
    if co2_ppm is None:
        return 0.0
    return max(0.0, (co2_ppm - co2_outdoor) / co2_exhaled)


def infection_probability(
    co2_ppm: float | None,
    infectors: float = 1.0,
    total_people: float = 10.0,
    quanta_rate: float = 30.0,
    exposure_h: float = 1.0,
) -> tuple[float, float]:
    """Rudnick-Milton 감염확률 P = 1 - exp(-f·(I/n)·q·t).

    Args:
        co2_ppm: 실내 CO2 측정값(ppm)
        infectors: 공간 내 감염자 수 I
        total_people: 전체 재실 인원 n
        quanta_rate: 감염자 1인당 quanta 발생률 q (quanta/h)
        exposure_h: 노출 시간 t (h)

    Returns:
        (P, f) — 감염확률, 재호흡 분율
    """
    f = rebreathed_fraction(co2_ppm)
    if total_people <= 0:
        return 0.0, f
    exponent = f * (infectors / total_people) * quanta_rate * exposure_h
    p = 1.0 - math.exp(-exponent)
    return p, f


def infection_probability_transient(
    co2_series: list[tuple[float, float]],
    infectors: float = 1.0,
    total_people: float = 10.0,
    quanta_rate: float = 30.0,
) -> tuple[float, float]:
    """과도기(transient) 감염확률 — 정상상태 가정을 벗어나 CO2 시계열을 시간적분.

    근거: Edwards (2024) "The Wells-Riley model revisited: Randomness,
          heterogeneity, and transient behaviours", Risk Analysis 44(?).
          정상상태(일정 f·t) 가정 대신 노출구간 동안 재호흡 분율 f(t)의
          실측 변화를 누적해 흡입 quanta 선량을 계산한다.

    기존 infection_probability() 가 P = 1 - exp(-f·(I/n)·q·t) (f·t 고정)인 반면,
    여기서는 누적선량 D = (I/n)·q·∫ f(t) dt ≈ (I/n)·q·Σ f(co2_i)·Δt_i 로
    환기 변동(창문 개방, 인원 변화에 따른 CO2 등락)을 그대로 반영한다.
    환기량 Q·체적 V 추정이 불필요한 CO2-프록시 방식을 그대로 유지한다.

    Args:
        co2_series: [(t_hours, co2_ppm), ...] 시간 오름차순. t는 시(hour) 단위.
        infectors / total_people / quanta_rate: infection_probability 와 동일.

    Returns:
        (P, f_mean) — 과도기 감염확률, 노출구간 평균 재호흡 분율.
    """
    if total_people <= 0 or len(co2_series) < 2:
        f0 = rebreathed_fraction(co2_series[0][1]) if co2_series else 0.0
        return 0.0, f0
    f_integral = 0.0     # ∫ f dt  (시간가중 재호흡 분율 누적)
    span = co2_series[-1][0] - co2_series[0][0]
    for (t0, c0), (t1, c1) in zip(co2_series, co2_series[1:]):
        dt = t1 - t0
        if dt <= 0:
            continue
        f_avg = 0.5 * (rebreathed_fraction(c0) + rebreathed_fraction(c1))  # 사다리꼴 적분
        f_integral += f_avg * dt
    dose = (infectors / total_people) * quanta_rate * f_integral
    p = 1.0 - math.exp(-dose)
    f_mean = f_integral / span if span > 0 else rebreathed_fraction(co2_series[-1][1])
    return p, f_mean


# 병원체별 quanta 방출률 시나리오 (quanta/h) — Buonanno et al. 2020, Env. Int.
#   민감도 분석용: q 불확실성(활동/변종)을 worst·typical·best 로 명시해 방어.
QUANTA_SCENARIOS: dict[str, dict[str, float]] = {
    "INFLUENZA": {"best": 15.0, "typical": 30.0, "worst": 100.0},
    "COVID-19":  {"best": 14.0, "typical": 60.0, "worst": 300.0},
    "RSV":       {"best": 8.0,  "typical": 20.0, "worst": 70.0},
}


def sensitivity_analysis(
    co2_ppm: float | None,
    total_people: float = 10.0,
    exposure_h: float = 1.0,
    infectors: float = 1.0,
    pathogens: tuple[str, ...] = ("INFLUENZA", "COVID-19", "RSV"),
) -> dict[str, dict[str, float]]:
    """q값 불확실성 민감도 — 병원체×(worst/typical/best)별 PoI 표 (발표·QA 방어용).

    Wells-Riley 의 최대 약점인 quanta 불확실성을 숨기지 않고, 시나리오 구간으로
    제시해 "범위를 알고 설계했다"를 보여주기 위한 헬퍼.
    """
    out: dict[str, dict[str, float]] = {}
    for code in pathogens:
        scen = QUANTA_SCENARIOS.get(code)
        if not scen:
            continue
        out[code] = {
            level: infection_probability(co2_ppm, infectors, total_people, q, exposure_h)[0]
            for level, q in scen.items()
        }
    return out


def tier_from_poi(poi: float) -> str:
    """PoI → 5-Tier (MONITOR ~ CRITICAL)."""
    for threshold, name in _POI_THRESHOLDS:
        if poi >= threshold:
            return name
    return "MONITOR"
