"""carry-forward 캐시 검증 — 카메라(occupancy)와 CO2 센서가 별도 reading으로 들어와도
직전 신선값으로 보충돼 두 피드가 합쳐지는지, 빈 병실/stale 처리가 맞는지 확인."""
from backend.api.sensor import _carry_forward, _last_env, _ENV_CARRY_TTL


def setup_function():
    _last_env.clear()


def test_co2_sensor_then_camera_merge():
    """CO2센서(co2만) → 카메라(occupancy만) 순서로 와도 둘 다 채워진다."""
    t = 1000.0
    assert _carry_forward("ward_a", "co2", 1300.0, t) == 1300.0
    assert _carry_forward("ward_a", "occupancy", None, t) is None  # 아직 인원 미측정
    # 2초 뒤 카메라: co2 미측정 → 직전 1300 보충, 실측 인원 7
    t += 2
    assert _carry_forward("ward_a", "co2", None, t) == 1300.0
    assert _carry_forward("ward_a", "occupancy", 7, t) == 7


def test_empty_room_zero_is_preserved():
    """occupancy=0(빈 병실)은 실측이므로 carry로 덮어쓰지 않는다."""
    t = 1000.0
    _carry_forward("ward_a", "occupancy", 5, t)
    assert _carry_forward("ward_a", "occupancy", 0, t + 1) == 0


def test_stale_value_discarded_after_ttl():
    """TTL(기본 300s) 초과한 직전값은 폐기되고 None 반환."""
    t = 1000.0
    _carry_forward("ward_a", "co2", 1300.0, t)
    assert _carry_forward("ward_a", "co2", None, t + _ENV_CARRY_TTL - 1) == 1300.0  # 직전 신선
    assert _carry_forward("ward_a", "co2", None, t + _ENV_CARRY_TTL + 1) is None     # stale


def test_spaces_isolated():
    """공간별 캐시는 서로 독립이다 (ward_a 값이 ward_b로 새지 않음)."""
    t = 1000.0
    _carry_forward("ward_a", "co2", 1300.0, t)
    assert _carry_forward("ward_b", "co2", None, t) is None
