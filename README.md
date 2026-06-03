# ThinQ Workspace Sentinel · 요양병원 도메인 PoC

> **컨셉**: "요양병원이 못 막던 RSV·인플루엔자·노로를, 가전이 3주 전에 알고 자동으로 막는다"

LG ThinQ 가전 8종 + IoT 센서 6종 + 외부 감염병 신호 (KOWAS·DataLab·OTC)를 결합해
요양병원 1개 병동의 공간 감염 위험을 사전 예측 → 자동 환경 제어하는 시스템.

LG DX School 5기 · 5분 대기조 · 2026.05.19 ~ 2026.06.25

## 팀 (5분 대기조)

| 이름 | GitHub | 역할 | 담당 모듈 |
|---|---|---|---|
| 박진영 | [@zln02](https://github.com/zln02) | PM / Tech Lead | `pipeline/`, `ml/`, `docs/`, 전체 아키텍처 |
| 박진 | [@Parkjin0821](https://github.com/Parkjin0821) | Backend | `backend/` (FastAPI + SSE + Smart Protocol) |
| 윤재영 | [@dsadsa2311245](https://github.com/dsadsa2311245) | Frontend | `frontend/` (Next.js 14 + PWA + PT 대시보드) |
| 정욱현 | [@ughyeon123-source](https://github.com/ughyeon123-source) | DevOps / QA | `infra/`, `.github/`, `tests/`, `migrations/` |

> 모듈별 책임은 [`docs/roles/Role_*.pptx`](docs/roles/) 7슬라이드 가이드 참고.
> 통합 개발 가이드는 [`docs/dev/Master_Dev_Guide.pdf`](docs/dev/Master_Dev_Guide.pdf) 16페이지.
> 역할별 플레이북 (W3~W6 로드맵 + 핫픽스 가이드): [`docs/dev/Backend_Playbook.md`](docs/dev/Backend_Playbook.md) — 박진

---

## 🌱 처음이신가요? — 이거부터 읽어요

**우리 팀은 다 같이 공부하면서 만드는 중이에요.** 모르는 게 정상이고 막히는 게 당연해요.

📖 **[`docs/dev/Friendly_Onboarding.pdf`](docs/dev/Friendly_Onboarding.pdf)** (9페이지 · 비개발자 친화 입문서)
- 영어 단어 30개+ 풀이 (repo, branch, PR, Docker, API… 다 한글 비유로)
- 첫날 시간표 (10/30/60분 단위) + "이러면 OK" 신호
- 막힘 처방전 7가지 + 누구한테 물어볼지 라우팅
- 요양병원·감염 도메인 단어 사전

> **막히면 5분 시도 → 바로 박진영(@zln02)에게 물어봐요. 30분 헤매는 거 아까워요. 우리 다 처음이에요.**

---

## 🚀 내 첫날 — 3분 셋업

```bash
# 1. clone (Docker Desktop · Node 20 · Python 3.11 미리 설치)
git clone https://github.com/zln02/thinq-workspace-sentinel.git
cd thinq-workspace-sentinel

# 2. 환경 변수 (placeholder 값 그대로 docker용)
cp .env.example .env

# 3. 로컬 스택 부팅 (DB + Redis + API 3개 컨테이너)
docker compose -f infra/docker-compose.dev.yml up -d
curl http://localhost:8003/health     # → {"status":"ok"} 확인

# 4. 프론트 (별도 터미널)
cd frontend && npm install && npm run dev
# → http://localhost:3000

# 5. 본인 역할 PPT 7슬 읽기
#    Role_Backend.pptx   ← 박진
#    Role_Frontend.pptx  ← 윤재영
#    Role_DevOps.pptx    ← 정욱현
#    Role_ML / Pipeline  ← 박진영(PM)
```

### 첫 PR 만드는 법 (5단계)

```bash
git checkout develop && git pull --ff-only origin develop
git checkout -b feature/<role>-<short-name>   # 예: feature/be-healthcheck
# 코딩 → 커밋 → 푸시
gh pr create -B develop                       # 템플릿 자동 로드
# 리뷰 1명 + CI 그린 → squash 머지
```

| 막힐 때 | 해결 |
|---|---|
| Docker 5432 충돌 | dev는 55432 사용 → 포트 충돌 X (호스트 PG와 무관) |
| CI ruff 빨강 | `ruff check backend pipeline --fix` 후 재푸시 |
| `develop` 과 충돌 | `git rebase develop` (merge 아님) → 충돌 해결 → `git push --force-with-lease` |
| `.env` 실수 푸시 | secret-scan 잡이 차단함. 그래도 노출되면 즉시 박진영(@zln02)에게 |

> 더 자세한 셋업/트러블슈팅은 [`docs/dev/Master_Dev_Guide.pdf`](docs/dev/Master_Dev_Guide.pdf) §8 참고.
> 시연·심사기준·6주 WBS는 같은 PDF §2, §5, §6 참고.

---

## 6주 PoC 일정

- **W1** (5/19~25) — 기획·설계 ✅
- **W2** (5/26~6/1) — **인프라·시뮬레이터·요양병원 피벗** ⭐ 현재
- W3 (6/2~8) — UIS 연동·외부신호 파이프라인
- W4 (6/9~15) — Smart Protocol·시연 영상 (75초)
- W5 (6/16~22) — 다층 게이트·자동 해제
- W6 (6/23~25) — 최종 발표·문서

## W2 완료 산출물

| # | 산출물 | 위치 |
|---|---|---|
| 1 | 가전 8종 물리 시뮬레이터 | `pipeline/simulator/devices.py` |
| 2 | 센서 6종 (CO2 ↔ ACH 역산 포함) | `pipeline/simulator/sensors.py` |
| 3 | 공간 환경 + REHVA Wells-Riley + 5-Tier | `pipeline/simulator/space.py` |
| 4 | 시나리오 5종 (4계절 + 폭염×노로 이중) | `pipeline/simulator/runner.py` |
| 5 | ThinQ Connect SDK Mock 어댑터 | `backend/services/thinq_mock.py` |
| 6 | 병원체 8종 Smart Protocol | `backend/services/smart_protocol.py` |
| 7 | FastAPI 6개 엔드포인트 | `backend/api/main.py` |
| 8 | DB 마이그레이션 (`sentinel` 스키마) | `migrations/001`, `002` |
| 9 | 법적 규제 매트릭스 (9개 법령) | `docs/legal/nursing_home_compliance_matrix.md` |

## 인프라

- **VM**: GCP e2-standard-2 (`uis-capstone`, 34.47.113.176) — UIS 팀과 **공유**
- **DB**: `uis-timescaledb` 컨테이너 공유 · 우리 데이터는 **`sentinel` 스키마**로 완전 분리
- **Cache**: `sentinel-redis` 컨테이너 (포트 6380) — 우리 단독
- **API**: FastAPI `sentinel-api` (포트 8003) — 우리 단독

### UIS와의 관계

`urban-immune-system/` 은 **다른 캡스톤 팀**이 운영하는 외부 데이터 시스템.
KOWAS·DataLab·OTC 등 외부 감염병 신호를 정제해 TimescaleDB(`urban_immune` DB)에 적재 → 우리는 **read-only 로만 소비**.
UIS 스키마(`public.*`)는 절대 수정하지 않음. 우리 작업은 `sentinel.*` 안에서만.

## 빠른 검증

```bash
# DB·Redis·시뮬레이터 헬스
curl http://127.0.0.1:8003/health

# 병원체 8종 (사망률 가중 정렬)
curl http://127.0.0.1:8003/api/v1/pathogens

# 가전 8종 (요양 우선순위)
curl http://127.0.0.1:8003/api/v1/devices

# 법령 9개
curl http://127.0.0.1:8003/api/v1/legal

# 시뮬레이션 (CRITICAL → MONITOR 자동 전환)
curl -X POST http://127.0.0.1:8003/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario":"winter_influenza","minutes":120}'
```

## 가전 8종 (요양병원 우선순위)

1. **공기청정기** — 24h RSV·인플루엔자·미세먼지
2. **에어컨** — 폭염 노인 사망 1순위 가전
3. **환기청정기** — Wells-Riley Q 직접 제어 (ACH 6+)
4. **가습기** — 노인 점막 보호 40~60%
5. **제습기** — 노로·곰팡이·욕창
6. **보일러** — 저체온증·인플루엔자 시즌
7. **로봇청소기** — 노로·CDI 표면 살균
8. **스타일러** — 옴·요양보호사 의류 살균

## 위협 병원체 8종

COVID-19 · 인플루엔자 · RSV · 노로바이러스 · 결핵 · 폐렴구균 · CDI · 옴

## 시연 시나리오 5종 (검증 완료)

| 시나리오 | 계절 | 병원체 | 초기 PoI | 최종 PoI | 적용 액션 |
|---|---|---|---|---|---|
| winter_influenza | 겨울 | 인플루엔자 | 30.2% | 0.5% | 4 |
| spring_tb | 봄 | 결핵 | 30.2% | 0.1% | 2 |
| summer_norovirus | 여름 | 노로 | 30.2% | 0.01% | 5 |
| autumn_covid | 가을 | COVID-19 | 30.2% | 0.2% | 3 |
| heatwave_norovirus_double | 여름 | 폭염×노로 이중 | 30.2% | 0.02% | 5 |

## 학술·법적 근거

- REHVA COVID-19 guidance v4.1 (Wells-Riley)
- Kim et al. 2025 (Applied Sciences 15:9145) — 5-Tier 분류
- Lowen et al. 2007 (PNAS) — 저온저습 인플루엔자 안정성
- Buonanno 2020 — COVID quanta rate
- KCDC 요양병원 감염관리 지침
- 의료법 36조·산안법·실내공기질법·결핵예방법 외 9개

## 개발 규칙

- `feature/*` → `develop` → `main` (PR 필수)
- `main` 직푸시 금지
- `.env` 절대 commit 금지

## 보안·개인정보 (ISMS-P)

- API 키·시크릿: `.env` (git ignored)
- 입소자 PII: `anonymized_id` (SHA-256), 원본 미저장
- 감염병 데이터: 집계값만 외부 전송, PHI 시스템 외부 미유출
- 자세히는 `docs/legal/nursing_home_compliance_matrix.md`
