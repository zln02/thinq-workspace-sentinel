# -*- coding: utf-8 -*-
"""요양병원 VOC 크롤링 키워드 플랜 (페르소나 5 × 채널 다중).

Naver Search API는 키워드당 최대 1,000건(display 100 × start 1000)이 상한이므로,
4만 건 규모를 모으려면 서로 다른 키워드가 40개 이상 필요하다.
각 키워드를 (페르소나, 채널 목록)으로 매핑한다.
채널: news / blog / cafe / kin  (search_news / search_blog / search_cafearticle / search_kin)
"""

# (query, persona, [channels])
PLAN = [
    # ── family (보호자): 시설 품질·돌봄·면회·학대 ──────────────
    ("요양병원 냄새",            "family",   ["blog", "cafe", "kin"]),
    ("요양병원 욕창",            "family",   ["blog", "cafe", "kin"]),
    ("요양병원 학대 방치",       "family",   ["news", "cafe", "kin"]),
    ("요양병원 면회 제한",       "family",   ["blog", "cafe", "kin"]),
    ("요양병원 부모님 후회",     "family",   ["blog", "cafe", "kin"]),
    ("요양병원 추천 어디",       "family",   ["cafe", "kin"]),
    ("요양병원 환경 위생",       "family",   ["blog", "cafe"]),
    ("요양병원 돌봄 불만",       "family",   ["cafe", "kin"]),
    ("요양병원 낙상 사고",       "family",   ["news", "cafe", "kin"]),
    ("요양병원 코로나 감염 보호자", "family", ["cafe", "kin"]),

    # ── staff (종사자): 야간·이직·처우·번아웃·인력 ────────────
    ("요양병원 야간근무",        "staff",    ["blog", "cafe", "kin"]),
    ("요양보호사 이직 처우",     "staff",    ["blog", "cafe", "kin"]),
    ("요양병원 간호사 번아웃",   "staff",    ["blog", "cafe"]),
    ("요양보호사 힘들다",        "staff",    ["blog", "cafe", "kin"]),
    ("요양병원 인력부족",        "staff",    ["news", "blog", "cafe"]),
    ("요양보호사 야간 수당",     "staff",    ["cafe", "kin"]),
    ("요양병원 교대근무 과로",   "staff",    ["blog", "cafe"]),
    ("요양보호사 퇴사 이유",     "staff",    ["blog", "cafe", "kin"]),
    ("요양병원 감염관리 업무",   "staff",    ["news", "blog"]),

    # ── manager (시설장/경영): 집단감염·폐업·경영난·수가·처분 ──
    ("요양병원 집단감염",        "manager",  ["news", "cafe"]),
    ("요양병원 폐업",            "manager",  ["news", "cafe"]),
    ("요양병원 경영난",          "manager",  ["news", "blog"]),
    ("요양병원 수가 인상",       "manager",  ["news"]),
    ("요양병원 행정처분",        "manager",  ["news", "cafe"]),
    ("요양병원 감염관리료",      "manager",  ["news", "blog"]),
    ("요양병원 인증평가",        "manager",  ["news", "blog", "cafe"]),
    ("요양병원 환수 부당청구",   "manager",  ["news", "cafe"]),
    ("요양병원 코로나 손실",     "manager",  ["news"]),

    # ── policy (정책/제도): 감염예방·제도·국정·기준 ───────────
    ("요양병원 감염예방관리료",  "policy",   ["news"]),
    ("요양병원 감염관리 의무화", "policy",   ["news"]),
    ("권역책임의료기관 감염병전문병원", "policy", ["news"]),
    ("요양병원 KONIS 감시체계",  "policy",   ["news"]),
    ("요양병원 의료관련감염",    "policy",   ["news"]),
    ("요양병원 감염병 대응 정책","policy",   ["news"]),
    ("요양병원 환자안전법",      "policy",   ["news"]),
    ("고령화 요양 인프라 정책",  "policy",   ["news"]),
    ("호흡기감염병 유행 예측",   "policy",   ["news"]),

    # ── competitor (경쟁/시장): 스마트병원·모니터링·공기·헬스케어 ─
    ("스마트병원 환자 모니터링", "competitor", ["news", "blog"]),
    ("요양병원 공기청정기",      "competitor", ["news", "blog", "cafe"]),
    ("병원 실내공기질 관리",     "competitor", ["news", "blog"]),
    ("의료기관 살균 방역 시스템","competitor", ["news", "blog"]),
    ("요양병원 IoT 헬스케어",    "competitor", ["news", "blog"]),
    ("환자 활력징후 원격 모니터링","competitor", ["news", "blog"]),
    ("스마트 요양 솔루션",       "competitor", ["news", "blog"]),
    ("코웨이 삼성 헬스케어 가전","competitor", ["news", "blog"]),
]
