"""5-Tier 분류 단위테스트 (Kim et al. 2025, Applied Sciences 15:9145).

space.py:tier() 는 2축 (PoI × R_event) 중 더 엄격한 쪽으로 결정.
본 테스트는 R_event가 충분히 작은 케이스 (저밀도 1인실) 에서
PoI 임계값 단독으로 분류되는지 검증.
"""
import pytest
from pipeline.simulator.space import SpaceEnv


def low_density_space():
    """1인실 (occupancy=1, infected=0) → r_event ≈ 0, PoI 단독 판정."""
    return SpaceEnv(space_id='t', volume_m3=400, occupancy=1, infected_count=0)


def tier_for_poi(poi: float) -> str:
    """PoI 값을 강제로 주입한 tier 호출."""
    sp = low_density_space()
    # virus_conc 를 역산해서 원하는 PoI 만들기 — 간단한 1-1 대입
    # poi = 1 - exp(-dose), dose = virus_conc * 0.36 * 1 * 1 (exposure=60)
    # → virus_conc = -ln(1-poi) / 0.36
    from math import log
    if poi <= 0:
        sp.virus_conc = 0
    elif poi >= 1:
        sp.virus_conc = 100
    else:
        sp.virus_conc = -log(1 - poi) / 0.36
    return sp.tier()


@pytest.mark.parametrize('poi,expected', [
    (0.001, 'MONITOR'),
    (0.009, 'MONITOR'),
    (0.02, 'CAUTION'),
    (0.04, 'CAUTION'),
    (0.07, 'ALERT'),
    (0.14, 'ALERT'),
    (0.20, 'HIGH_RISK'),
    (0.29, 'HIGH_RISK'),
    (0.35, 'CRITICAL'),
    (0.90, 'CRITICAL'),
])
def test_tier_thresholds(poi, expected):
    assert tier_for_poi(poi) == expected


def test_tier_boundary_exact():
    """Kim 2025 임계값 정확히 일치 (PoI 단독 케이스)."""
    assert tier_for_poi(0.0099) == 'MONITOR'
    assert tier_for_poi(0.0100) == 'CAUTION'
    assert tier_for_poi(0.0499) == 'CAUTION'
    assert tier_for_poi(0.0500) == 'ALERT'
    assert tier_for_poi(0.1499) == 'ALERT'
    assert tier_for_poi(0.1500) == 'HIGH_RISK'
    assert tier_for_poi(0.2999) == 'HIGH_RISK'
    assert tier_for_poi(0.3000) == 'CRITICAL'
