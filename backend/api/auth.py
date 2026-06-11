"""API 인증 — 가전 제어/승인/ingest 같은 변경 엔드포인트 보호.

설계(데모 무중단 + 운영 보안):
  - 환경변수 `SENTINEL_API_KEY` 가 설정되면 → 변경 엔드포인트에 `X-API-Key` 헤더 강제.
  - 미설정(데모 기본) → 통과하되 경고 로그 1회. 운영 배포 시 키를 반드시 설정.
  - 키는 .env 로만 주입(하드코딩 금지). 브릿지/대시보드가 동일 키를 헤더로 전송.

읽기(GET·SSE)는 보호하지 않음 — 위험 동작은 POST(제어/승인/ingest)뿐.
"""
from __future__ import annotations

import logging
import os

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)
_warned = False


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """변경 엔드포인트 의존성. 키 설정 시 헤더 일치 강제, 미설정 시 통과(경고)."""
    expected = os.getenv("SENTINEL_API_KEY")
    if not expected:
        global _warned
        if not _warned:
            logger.warning("SENTINEL_API_KEY 미설정 — 제어 API 무인증(데모). 운영 배포 시 반드시 설정.")
            _warned = True
        return
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="유효한 X-API-Key 필요")
