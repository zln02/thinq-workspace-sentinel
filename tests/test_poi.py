"""Wells-Riley PoI 계산 단위테스트.

코드 실재 시그니처 (pipeline/simulator/space.py) 기준.
"""
import pytest
from pipeline.simulator.space import SpaceEnv, PATHOGEN_QUANTA


def make_space(pathogen='COVID-19', occupancy=4, volume_m3=60, ach=2.0, infected=1):
    """virus_conc=0 초기화 (감염자 영향만 계산)."""
    sp = SpaceEnv(
        space_id='test-room',
        volume_m3=volume_m3,
        occupancy=occupancy,
        pathogen=pathogen,
        infected_count=infected,
        fresh_air_ach=ach,
        virus_conc=0.0,
    )
    return sp


def test_poi_zero_when_no_infected_and_clean_air():
    sp = make_space(infected=0)
    # 한 step 만 — 비활성화로 0 유지
    sp.step(dt_min=60, devices=[])
    assert sp.poi() == 0.0


def test_poi_strictly_grows_in_short_window():
    """짧은 윈도우 (10분) 에서 quanta emission > decay → PoI 증가."""
    sp = make_space()
    sp.step(dt_min=5, devices=[])
    poi_a = sp.poi()
    sp.step(dt_min=5, devices=[])
    poi_b = sp.poi()
    # 5분 시점 → 10분 시점 PoI 증가 확인
    assert poi_b > poi_a


def test_poi_bounded_0_to_1():
    sp = make_space(pathogen='INFLUENZA', occupancy=10, volume_m3=30, ach=0.3)
    for _ in range(60):
        sp.step(dt_min=10, devices=[])
    assert 0.0 <= sp.poi() <= 1.0


def test_known_pathogens_have_quanta():
    """코드 실재 6 병원체 (핸드오프 §정직성 — CDI/Scabies 는 W3 추가 백로그)."""
    expected = {'COVID-19', 'INFLUENZA', 'RSV', 'TB', 'NOROVIRUS', 'PNEUMOCOCCUS'}
    assert expected.issubset(PATHOGEN_QUANTA.keys())


def test_r_event_nonneg():
    sp = make_space()
    sp.step(dt_min=30, devices=[])
    assert sp.r_event() >= 0.0


def test_poi_higher_for_more_infected():
    """감염자 수 ↑ → PoI ↑."""
    one = make_space(infected=1)
    three = make_space(infected=3)
    for _ in range(6):
        one.step(dt_min=10, devices=[])
        three.step(dt_min=10, devices=[])
    assert three.poi() > one.poi()
