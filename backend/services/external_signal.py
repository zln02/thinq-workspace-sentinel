"""External Signal Pipeline — KOWAS·DataLab·OTC 신호 → 5-Tier 위험도 보정.

외부 감염병 신호를 UIS에서 읽어 sentinel의 공간 위험도(tier)를
사전 보정(pre-alert)하는 파이프라인.

흐름:
    UIS DB (public.external_signals)
        → fetch_latest_signals()
        → normalize_signals()
        → compute_external_risk_boost()
        → SpaceEnv.tier() 보정값 반환
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from backend.services.uis_reader import map_uis_pathogen

# 외부 신호 소스별 신뢰 가중치
SOURCE_WEIGHT = {
    "KOWAS": 1.0,    # 질병관리청 공식
    "DataLab": 0.7,  # 네이버 검색 트렌드
    "OTC": 0.5,      # 약국 판매 데이터
}

# 신호 강도 → tier 보정 매핑
BOOST_TIER_MAP = [
    (0.8, "CRITICAL"),
    (0.6, "HIGH_RISK"),
    (0.4, "ALERT"),
    (0.2, "CAUTION"),
    (0.0, "MONITOR"),
]

TIER_RANK = {
    "MONITOR": 0,
    "CAUTION": 1,
    "ALERT": 2,
    "HIGH_RISK": 3,
    "CRITICAL": 4,
}


@dataclass
class ExternalRisk:
    """외부 신호 기반 위험도 결과."""
    pathogen: str
    source: str
    raw_signal: float
    weighted_signal: float
    suggested_tier: str
    region_code: str
    signal_date: Optional[str] = None


def normalize_signals(raw_signals: list[dict]) -> list[ExternalRisk]:
    """UIS raw 신호 → ExternalRisk 정규화."""
    results = []
    for s in raw_signals:
        if "error" in s:
            continue
        source = s.get("source", "KOWAS")
        weight = SOURCE_WEIGHT.get(source, 0.5)
        raw_val = float(s.get("signal_value", 0.0))
        weighted = min(raw_val * weight, 1.0)  # 0~1 클램프

        # 가중 신호 → tier 추천
        suggested = "MONITOR"
        for threshold, tier in BOOST_TIER_MAP:
            if weighted >= threshold:
                suggested = tier
                break

        results.append(ExternalRisk(
            pathogen=map_uis_pathogen(s.get("pathogen_code", "covid19")),
            source=source,
            raw_signal=raw_val,
            weighted_signal=round(weighted, 3),
            suggested_tier=suggested,
            region_code=s.get("region_code", "KR"),
            signal_date=str(s.get("signal_date", "")),
        ))
    return results


def compute_external_risk_boost(
    signals: list[ExternalRisk],
    space_tier: str,
    target_pathogen: str,
    region_code: str = "KR",
) -> dict:
    """외부 신호 + 공간 tier → 최종 보정 tier 계산.

    외부 신호가 공간 측정값보다 높으면 상향 보정 (사전 경보).
    낮으면 공간 측정값 유지 (보수적 원칙).
    """
    relevant = [
        s for s in signals
        if s.pathogen == target_pathogen and s.region_code == region_code
    ]

    if not relevant:
        return {
            "original_tier": space_tier,
            "boosted_tier": space_tier,
            "boost_applied": False,
            "reason": "외부 신호 없음 — 공간 측정값 유지",
            "signals_used": 0,
        }

    # 가장 강한 외부 신호 선택
    strongest = max(relevant, key=lambda s: s.weighted_signal)
    external_rank = TIER_RANK.get(strongest.suggested_tier, 0)
    space_rank = TIER_RANK.get(space_tier, 0)

    if external_rank > space_rank:
        boosted = strongest.suggested_tier
        boost_applied = True
        reason = (
            f"{strongest.source} 신호({strongest.weighted_signal:.2f}) → "
            f"{space_tier} 상향 → {boosted}"
        )
    else:
        boosted = space_tier
        boost_applied = False
        reason = f"공간 측정값({space_tier}) 유지 — 외부 신호 미만"

    return {
        "original_tier": space_tier,
        "boosted_tier": boosted,
        "boost_applied": boost_applied,
        "reason": reason,
        "signals_used": len(relevant),
        "strongest_signal": {
            "source": strongest.source,
            "weighted": strongest.weighted_signal,
            "suggested_tier": strongest.suggested_tier,
            "signal_date": strongest.signal_date,
        },
    }
