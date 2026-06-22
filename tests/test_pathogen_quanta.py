"""병원체별 quanta(q) 배선 회귀 테스트.

2026-06 모델 고도화: 라이브 PoI(compute_tier)가 병원체별 q 를 반영하도록 배선.
핵심 보증:
  1) 기존 동작 불변 — pathogen/quanta 미지정 시 인플루엔자급(q=30) 과 동일.
  2) 병원체별 q 차등 — 노로(q=1)는 같은 CO2 에서 인플루엔자보다 PoI 낮음.
  3) quanta_for 단일 소스 — 별칭/미지 폴백/레벨 처리.
"""
from pipeline.simulator.rebreathed import (
    PATHOGEN_QUANTA, QUANTA_SCENARIOS, quanta_for, infection_probability,
)
from backend.api.sensor import compute_tier, DEMO_QUANTA


def test_quanta_table_has_five_pathogens():
    assert set(PATHOGEN_QUANTA) == {"INFLUENZA", "COVID-19", "RSV", "TB", "NOROVIRUS"}
    # 시나리오는 best<typical<worst 단조
    for code, scen in QUANTA_SCENARIOS.items():
        assert scen["best"] <= scen["typical"] <= scen["worst"], code


def test_quanta_for_resolves_and_falls_back():
    assert quanta_for("INFLUENZA") == 30.0
    assert quanta_for("COVID-19") == 60.0
    assert quanta_for("covid19") == 60.0          # 별칭 정규화
    assert quanta_for("rsv") == 20.0              # 대소문자 무관
    assert quanta_for("UNKNOWN") == 30.0          # 미지 → 인플루엔자급 폴백
    assert quanta_for(None) == 30.0
    assert quanta_for("COVID-19", "worst") == 300.0


def test_compute_tier_default_unchanged():
    """pathogen/quanta 미지정 = 기존 DEMO_QUANTA(인플루엔자) 동작과 동일(데모 호환)."""
    assert DEMO_QUANTA == 30.0
    base = compute_tier(1200, None, occupancy=10)
    flu = compute_tier(1200, None, occupancy=10, pathogen="INFLUENZA")
    assert base[0] == flu[0]
    assert base[1] == flu[1]  # PoI 동일


def test_pathogen_differentiates_poi():
    """같은 CO2 에서 노로(q=1)는 인플루엔자(q=30)보다 PoI 낮고 tier 도 낮거나 같음."""
    flu = compute_tier(1200, None, occupancy=10, pathogen="INFLUENZA")
    noro = compute_tier(1200, None, occupancy=10, pathogen="NOROVIRUS")
    covid = compute_tier(1200, None, occupancy=10, pathogen="COVID-19")
    assert noro[1] < flu[1] < covid[1]            # PoI: 노로 < 인플루 < 코로나
    assert noro[0] == "MONITOR"                    # 노로는 공기전파 미미 → 정상


def test_explicit_quanta_overrides_pathogen():
    """quanta 명시값이 pathogen 보다 우선."""
    p, _ = infection_probability(1200, 1, 10, 30.0, 1.0)
    tier, poi, _ = compute_tier(1200, None, occupancy=10, pathogen="NOROVIRUS", quanta=30.0)
    assert abs(poi - p) < 1e-9                     # quanta=30 → 인플루엔자급 PoI
