"""Performance Tracker KPI 엔드포인트 스모크 (DB 없이 폴백 경로)."""
import asyncio
import sys
import types

# 로컬/CI 어디서나 동작하도록 외부 드라이버를 가볍게 스텁(없을 때만).
for _m in ("redis", "redis.asyncio", "asyncpg"):
    if _m not in sys.modules:
        try:
            __import__(_m)
        except ImportError:
            sys.modules[_m] = types.ModuleType(_m)
if not hasattr(sys.modules["redis"], "asyncio"):
    sys.modules["redis"].asyncio = sys.modules["redis.asyncio"]

import backend.api.main as main
import backend.api.sensor as sensor


def _run(coro):
    return asyncio.run(coro)


def test_kpi_fallback_no_db(monkeypatch):
    """DB 풀 미연결 → 시뮬 폴백값 반환, 필수 키 모두 존재."""
    monkeypatch.setattr(main, "state", {}, raising=False)
    out = _run(sensor.performance_kpi())
    for k in ("auto_actions", "avg_poi", "poi_reduction_pct", "spaces_monitored", "source"):
        assert k in out
    assert out["source"] == "시뮬"
    assert isinstance(out["auto_actions"], int)
    assert 0 <= out["poi_reduction_pct"] <= 100
