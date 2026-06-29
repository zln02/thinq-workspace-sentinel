"""API 인증 — 가전 제어/승인/ingest 같은 변경 엔드포인트 보호.

설계(운영 fail-closed + 명시적 데모 무중단):
  - 환경변수 `SENTINEL_API_KEY` 가 설정되면 → 변경 엔드포인트에 `X-API-Key` 헤더 강제.
  - 미설정 + `SENTINEL_DEMO=1`(명시적 데모) → 통과하되 경고 로그 1회.
  - 미설정 + 데모 아님 → **거부(fail-closed)**. 운영 배포에서 키를 빼먹어도 무인증으로
    열리지 않도록 안전한 기본값을 보장. 운영은 SENTINEL_API_KEY 를 반드시 설정.
  - 키는 .env 로만 주입(하드코딩 금지). 브릿지/대시보드가 동일 키를 헤더로 전송.

읽기(GET·SSE)는 보호하지 않음 — 위험 동작은 POST(제어/승인/ingest)뿐.
"""
from __future__ import annotations

import logging
import os

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)
_warned = False


def demo_mode() -> bool:
    """명시적 데모 모드 여부. `SENTINEL_DEMO=1`(또는 true/yes)일 때만 무인증/기본비번 허용.

    의도적으로 켜야만 동작하는 escape hatch — 기본은 fail-closed(운영 안전).
    """
    return os.getenv("SENTINEL_DEMO", "").strip().lower() in ("1", "true", "yes", "on")


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """변경 엔드포인트 의존성.

    키 설정 시 헤더 일치 강제. 키 미설정이면 데모 모드에서만 통과, 그 외엔 거부(fail-closed).
    """
    expected = os.getenv("SENTINEL_API_KEY")
    if not expected:
        if demo_mode():
            global _warned
            if not _warned:
                logger.warning("SENTINEL_API_KEY 미설정 — 데모 모드(SENTINEL_DEMO)로 제어 API 무인증 통과. 운영에선 키 설정 필수.")
                _warned = True
            return
        # fail-closed: 키도 없고 데모도 아님 → 무인증으로 열지 않는다.
        logger.warning("SENTINEL_API_KEY 미설정 & 비데모 — 제어 API 거부(fail-closed). 키를 설정하거나 SENTINEL_DEMO=1 로 데모 활성.")
        raise HTTPException(status_code=401, detail="제어 API 비활성: SENTINEL_API_KEY 미설정(운영 fail-closed)")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="유효한 X-API-Key 필요")
