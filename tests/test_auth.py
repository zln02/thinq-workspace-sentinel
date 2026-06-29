"""API 인증/제어 권한 단위테스트 (네트워크/DB/플러그인 없이).

커버리지:
  - require_api_key: 키 미설정 fail-closed / 데모 통과 / 키 강제
  - set_control_mode(/mode): ADMIN_CONTROL_PW 미설정 fail-closed / 데모 기본비번 / 비번 강제
"""
import asyncio

import pytest
from fastapi import HTTPException

import backend.api.auth as auth
from backend.api.sensor import ModeReq, set_control_mode


def _run(coro):
    return asyncio.run(coro)


# ── require_api_key (X-API-Key) ────────────────────────────────────────────

def test_no_key_not_demo_denied(monkeypatch):
    """키 미설정 + 비데모 → 거부(fail-closed). 운영에서 키 누락 시 무인증으로 열리지 않음."""
    monkeypatch.delenv("SENTINEL_API_KEY", raising=False)
    monkeypatch.delenv("SENTINEL_DEMO", raising=False)
    with pytest.raises(HTTPException) as e:
        _run(auth.require_api_key(x_api_key=None))
    assert e.value.status_code == 401


def test_no_key_demo_passes(monkeypatch):
    """키 미설정 + 명시적 데모(SENTINEL_DEMO=1) → 통과(데모 무중단)."""
    monkeypatch.delenv("SENTINEL_API_KEY", raising=False)
    monkeypatch.setenv("SENTINEL_DEMO", "1")
    auth._warned = False
    _run(auth.require_api_key(x_api_key=None))  # 예외 없이 통과


def test_key_set_requires_match(monkeypatch):
    monkeypatch.setenv("SENTINEL_API_KEY", "secret123")
    # 키 누락 → 401
    with pytest.raises(HTTPException) as e:
        _run(auth.require_api_key(x_api_key=None))
    assert e.value.status_code == 401
    # 틀린 키 → 401
    with pytest.raises(HTTPException) as e:
        _run(auth.require_api_key(x_api_key="wrong"))
    assert e.value.status_code == 401
    # 맞는 키 → 통과 (control allowed with correct key)
    _run(auth.require_api_key(x_api_key="secret123"))


def test_demo_mode_flag(monkeypatch):
    """demo_mode() 는 1/true/yes/on 만 참, 그 외/미설정은 거짓."""
    for v in ("1", "true", "TRUE", "yes", "on"):
        monkeypatch.setenv("SENTINEL_DEMO", v)
        assert auth.demo_mode() is True
    for v in ("0", "false", "", "no"):
        monkeypatch.setenv("SENTINEL_DEMO", v)
        assert auth.demo_mode() is False
    monkeypatch.delenv("SENTINEL_DEMO", raising=False)
    assert auth.demo_mode() is False


# ── set_control_mode (/mode, ADMIN_CONTROL_PW) ─────────────────────────────

def test_admin_unset_not_demo_denied(monkeypatch):
    """ADMIN_CONTROL_PW 미설정 + 비데모 → 제어모드 전환 거부(fail-closed, 하드코딩 'admin' 불가)."""
    monkeypatch.delenv("ADMIN_CONTROL_PW", raising=False)
    monkeypatch.delenv("SENTINEL_DEMO", raising=False)
    # 과거 하드코딩 기본값이었던 'admin' 으로도 통과되지 않아야 함
    with pytest.raises(HTTPException) as e:
        _run(set_control_mode(ModeReq(mode="manual", password="admin")))
    assert e.value.status_code == 403


def test_admin_unset_demo_uses_default(monkeypatch):
    """ADMIN_CONTROL_PW 미설정 + 데모 → 데모 전용 기본비번('admin')만 허용."""
    monkeypatch.delenv("ADMIN_CONTROL_PW", raising=False)
    monkeypatch.setenv("SENTINEL_DEMO", "1")
    # 틀린 비번 → 403
    with pytest.raises(HTTPException) as e:
        _run(set_control_mode(ModeReq(mode="manual", password="nope")))
    assert e.value.status_code == 403
    # 데모 기본비번 → 통과
    res = _run(set_control_mode(ModeReq(space_id="ward_test", mode="manual", password="admin")))
    assert res["ok"] is True and res["mode"] == "manual"


def test_admin_pw_set_enforced(monkeypatch):
    """ADMIN_CONTROL_PW 설정 시 정확히 일치해야 통과(데모 무관)."""
    monkeypatch.setenv("ADMIN_CONTROL_PW", "s3cret")
    monkeypatch.delenv("SENTINEL_DEMO", raising=False)
    with pytest.raises(HTTPException) as e:
        _run(set_control_mode(ModeReq(mode="manual", password="admin")))
    assert e.value.status_code == 403
    res = _run(set_control_mode(ModeReq(space_id="ward_test2", mode="auto", password="s3cret")))
    assert res["ok"] is True and res["mode"] == "auto"
