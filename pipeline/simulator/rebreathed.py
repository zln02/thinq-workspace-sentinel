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


def tier_from_poi(poi: float) -> str:
    """PoI → 5-Tier (MONITOR ~ CRITICAL)."""
    for threshold, name in _POI_THRESHOLDS:
        if poi >= threshold:
            return name
    return "MONITOR"
