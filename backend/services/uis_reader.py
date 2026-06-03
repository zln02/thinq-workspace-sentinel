"""UIS TimescaleDB Reader — 외부 감염병 신호 read-only 소비.

UIS 팀이 적재한 urban_immune DB의 public.* 테이블을 읽어
sentinel 시스템의 위험도 보정에 활용한다.

규칙: public.* 절대 수정 금지 / SELECT only
"""
from __future__ import annotations

import os
from typing import Optional

import asyncpg

UIS_DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://uis_user:uis_dev_placeholder_20260414@localhost:5433/urban_immune",
)

# UIS 병원체 코드 → sentinel 병원체 코드 매핑
UIS_TO_SENTINEL = {
    "covid19": "COVID-19",
    "influenza": "INFLUENZA",
    "rsv": "RSV",
    "norovirus": "NOROVIRUS",
    "tuberculosis": "TB",
    "pneumococcus": "PNEUMOCOCCUS",
    "cdi": "CDI",
    "scabies": "SCABIES",
}


async def fetch_latest_signals(pool: asyncpg.Pool, limit: int = 20) -> list[dict]:
    """UIS에서 최신 감염병 신호 조회 (read-only).

    UIS 테이블이 없거나 연결 실패 시 빈 리스트 반환 (graceful degradation).
    """
    query = """
        SELECT
            source,
            pathogen_code,
            region_code,
            signal_value,
            signal_date,
            fetched_at
        FROM public.external_signals
        ORDER BY fetched_at DESC
        LIMIT $1
    """
    try:
        async with pool.acquire() as con:
            rows = await con.fetch(query, limit)
            return [dict(r) for r in rows]
    except Exception as e:
        # UIS 스키마 변경·연결 불가 시 sentinel은 자체 데이터로만 동작
        return [{"error": str(e)[:120], "source": "uis_reader"}]


async def fetch_regional_risk(pool: asyncpg.Pool, region_code: str) -> Optional[dict]:
    """특정 지역의 최신 위험 신호 집계."""
    query = """
        SELECT
            region_code,
            pathogen_code,
            MAX(signal_value) AS peak_signal,
            MAX(signal_date)  AS latest_date
        FROM public.external_signals
        WHERE region_code = $1
          AND signal_date >= NOW() - INTERVAL '14 days'
        GROUP BY region_code, pathogen_code
        ORDER BY peak_signal DESC
    """
    try:
        async with pool.acquire() as con:
            rows = await con.fetch(query, region_code)
            if not rows:
                return None
            return {
                "region_code": region_code,
                "signals": [dict(r) for r in rows],
            }
    except Exception as e:
        return {"error": str(e)[:120], "region_code": region_code}


def map_uis_pathogen(uis_code: str) -> str:
    """UIS 병원체 코드 → sentinel 병원체 코드 변환."""
    return UIS_TO_SENTINEL.get(uis_code.lower(), "COVID-19")
