"""실내공기질관리법 유지기준 상수 (의료기관·노인요양시설 그룹).

근거: 실내공기질관리법 시행규칙 별표3 (환경부)
      — 의료기관, 산후조리원, 노인요양시설, 어린이집 등에 적용되는 유지기준.
시뮬레이터/알림 로직에서 import해 "법정기준 초과" 플래그를 산출한다.
"""
from __future__ import annotations

# 항목별 유지기준 (초과 시 법적 부적합)
IAQ_LIMITS = {
    "pm10": 75.0,        # 미세먼지 ㎍/㎥
    "pm25": 35.0,        # 초미세먼지 ㎍/㎥
    "co2_ppm": 1000.0,   # 이산화탄소 ppm
    "hcho": 80.0,        # 폼알데하이드 ㎍/㎥
    "co_ppm": 10.0,      # 일산화탄소 ppm
    "bioaerosol": 800.0,  # 총부유세균 CFU/㎥
}

# 사람이 읽는 라벨 (대시보드/리포트용)
IAQ_LABELS = {
    "pm10": "미세먼지(PM10)",
    "pm25": "초미세먼지(PM2.5)",
    "co2_ppm": "이산화탄소(CO₂)",
    "hcho": "폼알데하이드(HCHO)",
    "co_ppm": "일산화탄소(CO)",
    "bioaerosol": "총부유세균",
}


def iaq_exceedances(co2: float | None = None, pm25: float | None = None,
                    pm10: float | None = None) -> list[str]:
    """주어진 측정값 중 실내공기질관리법 유지기준을 초과한 항목 키 목록을 반환.

    측정 가능한 항목만 인자로 받는다(센서 미보유 항목은 None → 평가 제외).
    """
    over: list[str] = []
    if co2 is not None and co2 > IAQ_LIMITS["co2_ppm"]:
        over.append("co2_ppm")
    if pm25 is not None and pm25 > IAQ_LIMITS["pm25"]:
        over.append("pm25")
    if pm10 is not None and pm10 > IAQ_LIMITS["pm10"]:
        over.append("pm10")
    return over
