"""Rudnick-Milton transient 확장 + 민감도 분석 단위테스트.

대상: pipeline/simulator/rebreathed.py
  - infection_probability_transient (Edwards 2024 과도기 시간적분)
  - sensitivity_analysis (q 불확실성 worst/typical/best)
"""
import pytest

from pipeline.simulator.rebreathed import (
    infection_probability,
    infection_probability_transient,
    sensitivity_analysis,
    QUANTA_SCENARIOS,
)


def test_transient_equals_steady_for_constant_co2():
    """CO2가 일정하면 과도기 적분 = 정상상태 공식과 정확히 일치해야 한다."""
    co2 = 1200.0
    span_h = 1.0
    series = [(0.0, co2), (0.5, co2), (span_h, co2)]
    p_t, f_mean = infection_probability_transient(series, 1.0, 10.0, 30.0)
    p_s, f_s = infection_probability(co2, 1.0, 10.0, 30.0, span_h)
    assert p_t == pytest.approx(p_s, rel=1e-9)
    assert f_mean == pytest.approx(f_s, rel=1e-9)


def test_transient_empty_room_is_zero():
    series = [(0.0, 1500.0), (1.0, 1500.0)]
    p, _ = infection_probability_transient(series, 1.0, 0.0, 30.0)
    assert p == 0.0


def test_transient_monotonic_in_co2():
    """CO2 시계열이 전반적으로 높을수록 감염확률이 커야 한다."""
    low = [(0.0, 600.0), (1.0, 700.0)]
    high = [(0.0, 1600.0), (1.0, 1800.0)]
    p_low, _ = infection_probability_transient(low, 1.0, 10.0, 30.0)
    p_high, _ = infection_probability_transient(high, 1.0, 10.0, 30.0)
    assert p_high > p_low


def test_transient_bounded_and_degenerate_series():
    # 단일 샘플(<2) → 0 반환, f는 해당 CO2 기준
    p, f = infection_probability_transient([(0.0, 1000.0)], 1.0, 10.0, 30.0)
    assert p == 0.0 and f > 0.0


def test_sensitivity_ordering_and_bounds():
    """worst >= typical >= best, 모든 값 0~1."""
    table = sensitivity_analysis(1400.0, total_people=8.0, exposure_h=2.0)
    assert set(table) == {"INFLUENZA", "COVID-19", "RSV"}
    for code, scen in table.items():
        assert 0.0 <= scen["best"] <= scen["typical"] <= scen["worst"] <= 1.0


def test_sensitivity_uses_scenario_quanta():
    assert QUANTA_SCENARIOS["COVID-19"]["worst"] > QUANTA_SCENARIOS["COVID-19"]["best"]
