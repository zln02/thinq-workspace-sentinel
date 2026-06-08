"""API 인증 의존성 단위테스트 (네트워크/플러그인 없이)."""
import asyncio

from fastapi import HTTPException

import backend.api.auth as auth


def _run(coro):
    return asyncio.run(coro)


def test_no_key_env_passes(monkeypatch):
    """SENTINEL_API_KEY 미설정 → 데모 통과(인증 비활성)."""
    monkeypatch.delenv("SENTINEL_API_KEY", raising=False)
    auth._warned = False
    _run(auth.require_api_key(x_api_key=None))  # 예외 없이 통과


def test_key_set_requires_match(monkeypatch):
    monkeypatch.setenv("SENTINEL_API_KEY", "secret123")
    # 키 누락 → 401
    try:
        _run(auth.require_api_key(x_api_key=None))
        assert False, "401 이 발생해야 함"
    except HTTPException as e:
        assert e.status_code == 401
    # 틀린 키 → 401
    try:
        _run(auth.require_api_key(x_api_key="wrong"))
        assert False, "401 이 발생해야 함"
    except HTTPException as e:
        assert e.status_code == 401
    # 맞는 키 → 통과
    _run(auth.require_api_key(x_api_key="secret123"))
