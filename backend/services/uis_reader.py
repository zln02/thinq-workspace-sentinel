"""UIS TimescaleDB Reader — 외부 감염병 신호 read-only 소비.

UIS 팀이 적재한 urban_immune DB의 실제 테이블을 읽어
sentinel 시스템의 공간 위험도(5-Tier) 사전 보정에 활용한다.

실제 UIS 스키마 (2026-06-03 검증):
  - public.layer_signals (10k+ rows): 외부 신호 (wastewater/search/otc/AUX)
  - public.risk_scores   (1k+ rows):  지역 종합 위험도 + alert_level
  - public.confirmed_cases:           확진자 수

규칙: UIS DB 절대 수정 금지 / SELECT only / 연결 실패 시 graceful degradation
"""
from __future__ import annotations

import os
from typing import Optional

import asyncpg

# UIS DB는 sentinel DB와 별개 — 전용 DSN (urban_immune)
# 자격증명은 소스에 두지 않음 — UIS_DATABASE_URL 을 .env 로 주입 (미설정 시 비번 없는 기본)
UIS_DSN = os.getenv(
    "UIS_DATABASE_URL",
    "postgresql://uis_user@localhost:5432/urban_immune",
)

# UIS 병원체명 → sentinel 병원체 코드
UIS_TO_SENTINEL = {
    "covid": "COVID-19", "covid19": "COVID-19",
    "influenza": "INFLUENZA",
    "rsv": "RSV",
    "norovirus": "NOROVIRUS",
    "tuberculosis": "TB",
    "pneumococcus": "PNEUMOCOCCUS",
    "cdi": "CDI",
    "scabies": "SCABIES",
}

# UIS layer → sentinel 신호 소스(가중치 키)
LAYER_TO_SOURCE = {
    "wastewater": "KOWAS",   # 질병청 하수 감시
    "search": "DataLab",     # 네이버 검색
    "otc": "OTC",            # 약국 판매
}

# 행정구역 코드 ↔ UIS 한글 지역명
REGION_CODE_TO_NAME = {
    "11": "서울특별시", "26": "부산광역시", "27": "대구광역시", "28": "인천광역시",
    "29": "광주광역시", "30": "대전광역시", "31": "울산광역시", "36": "세종특별자치시",
    "41": "경기도", "42": "강원특별자치도", "51": "강원특별자치도",
    "43": "충청북도", "44": "충청남도", "45": "전라북도", "52": "전라북도",
    "46": "전라남도", "47": "경상북도", "48": "경상남도", "50": "제주특별자치도",
}

# UIS alert_level(4단계) → sentinel 5-Tier
ALERT_TO_TIER = {
    "GREEN": "MONITOR",
    "YELLOW": "CAUTION",
    "ORANGE": "HIGH_RISK",
    "RED": "CRITICAL",
}


def resolve_region(region: str) -> str:
    """행정코드('11')나 한글명('서울특별시') 모두 한글명으로 정규화."""
    if region in REGION_CODE_TO_NAME:
        return REGION_CODE_TO_NAME[region]
    return region  # 이미 한글명


async def fetch_latest_signals(pool: asyncpg.Pool, limit: int = 20,
                               region: Optional[str] = None) -> list[dict]:
    """UIS layer_signals에서 최신 외부 신호 조회 (read-only).

    external_signal.normalize_signals()가 기대하는 dict 키 형식으로 반환:
    {source, pathogen_code, region_code, signal_value(0~1), signal_date}
    """
    where = "WHERE layer = ANY($2)"
    params: list = [limit, list(LAYER_TO_SOURCE.keys())]
    if region:
        where += " AND region = $3"
        params.append(resolve_region(region))
    query = f"""
        SELECT time, layer, region, value, source, pathogen
        FROM public.layer_signals
        {where}
        ORDER BY time DESC
        LIMIT $1
    """
    try:
        async with pool.acquire() as con:
            rows = await con.fetch(query, *params)
        out = []
        for r in rows:
            out.append({
                "source": LAYER_TO_SOURCE.get(r["layer"], "OTC"),
                "pathogen_code": (r["pathogen"] or "covid"),
                "region_code": r["region"],
                "signal_value": min(float(r["value"] or 0) / 100.0, 1.0),  # 0~100 → 0~1
                "signal_date": str(r["time"].date()) if r["time"] else "",
            })
        return out
    except Exception as e:
        # UIS 연결 불가 시 sentinel은 자체 데이터로만 동작 (서버 로그만)
        print(f"[uis_reader] fetch_latest_signals error: {str(e)[:120]}")
        return []


async def fetch_regional_risk(pool: asyncpg.Pool, region: str) -> Optional[dict]:
    """risk_scores에서 특정 지역 최신 종합 위험도 + alert_level → sentinel tier."""
    region_name = resolve_region(region)
    query = """
        SELECT time, region, composite_score, l1_score, l2_score, l3_score, alert_level
        FROM public.risk_scores
        WHERE region = $1
        ORDER BY time DESC
        LIMIT 1
    """
    try:
        async with pool.acquire() as con:
            row = await con.fetchrow(query, region_name)
        if not row:
            return None
        return {
            "region": region_name,
            "composite_score": round(float(row["composite_score"] or 0), 2),
            "alert_level": row["alert_level"],
            "suggested_tier": ALERT_TO_TIER.get(row["alert_level"], "MONITOR"),
            "layers": {
                "respiratory": round(float(row["l1_score"] or 0), 2),
                "environment": round(float(row["l2_score"] or 0), 2),
                "behavior": round(float(row["l3_score"] or 0), 2),
            },
            "as_of": str(row["time"].date()) if row["time"] else "",
        }
    except Exception as e:
        # ISMS-P: raw DB 에러 클라이언트 노출 금지 — 서버 로그에만
        print(f"[uis_reader] fetch_regional_risk({region}) error: {str(e)[:120]}")
        return None


def map_uis_pathogen(uis_code: str) -> str:
    return UIS_TO_SENTINEL.get((uis_code or "").lower(), "COVID-19")
