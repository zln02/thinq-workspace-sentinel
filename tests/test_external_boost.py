"""외부신호 조기경보 boost + 하강국면 후행 오경보(FP) 차단 단위테스트.

근거 데이터(UIS risk_scores, 경기도 2025-26 인플루엔자 시즌):
  2026-02-08 RED 82.7(피크) → 02-15 ORANGE 68.8 → 02-22 GREEN 39.7
  → 피크 이후 alert_level이 ORANGE로 남아도 점수는 하강 → 추세로 boost를 낮춰 FP 차단.
"""
import pytest

from backend.api.external_live import (
    _boost_from_level,
    _downgrade,
    _level_from_score,
    _trend_adjust,
)


@pytest.mark.parametrize("level,expected", [
    ("RED", "ALERT"),
    ("ORANGE", "CAUTION"),
    ("YELLOW", "CAUTION"),
    ("GREEN", "MONITOR"),
    (None, "MONITOR"),
])
def test_boost_from_level(level, expected):
    assert _boost_from_level(level) == expected


@pytest.mark.parametrize("score,expected", [
    (86.5, "RED"), (75.0, "RED"),
    (60.0, "ORANGE"), (55.0, "ORANGE"),
    (50.0, "YELLOW"), (45.0, "YELLOW"),
    (44.9, "GREEN"), (13.4, "GREEN"), (None, "GREEN"),
])
def test_level_from_score(score, expected):
    assert _level_from_score(score) == expected


def test_downgrade():
    assert _downgrade("ALERT") == "CAUTION"
    assert _downgrade("CAUTION") == "MONITOR"
    assert _downgrade("MONITOR") == "MONITOR"  # 바닥
    assert _downgrade("HIGH_RISK") == "ALERT"


def test_trend_rising_keeps_boost():
    """상승국면(onset) — 선제 경보 그대로 유지."""
    boost, _ = _trend_adjust("ALERT", {"trend": "rising", "slope": 30.0}, 82.7)
    assert boost == "ALERT"


def test_trend_falling_elevated_downgrades():
    """하강이지만 아직 높음(경기 02-15 ORANGE 68.8) → 한 단계 완화."""
    boost, reason = _trend_adjust("ALERT", {"trend": "falling", "slope": -14.0}, 68.8)
    assert boost == "CAUTION"
    assert "하강" in reason


def test_trend_falling_low_releases():
    """하강+ORANGE미만(경기 02-22 39.7) → 후행경보 완전 해제."""
    boost, reason = _trend_adjust("ALERT", {"trend": "falling", "slope": -29.0}, 39.7)
    assert boost == "MONITOR"
    assert "해제" in reason


def test_trend_flat_keeps_boost():
    boost, _ = _trend_adjust("CAUTION", {"trend": "flat", "slope": 1.0}, 58.0)
    assert boost == "CAUTION"
