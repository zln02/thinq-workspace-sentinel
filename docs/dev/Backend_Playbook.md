# 백엔드 플레이북 — 박진 (@Parkjin0821) 전용

> **읽는 사람**: 5분 대기조 백엔드 담당 박진
> **언제 보나**: 새 작업 시작 전·PR 만들기 전·CI 빨강 떴을 때
> **목표**: 막힘 없이 W3 → W6 까지 완주

---

## 🎯 박진이 책임지는 영역

```
backend/
├── api/main.py              ← FastAPI 진입점 + 라우터
├── api/sse.py               ← Server-Sent Events (실시간 푸시)
├── services/
│   ├── thinq_mock.py        ← LG ThinQ SDK Mock (W2 완료)
│   ├── smart_protocol.py    ← 병원체 8종 → 가전 매칭 (W2 완료)
│   ├── uis_reader.py        ← UIS 외부 신호 read-only (W3 작업중)
│   ├── external_signal.py   ← 외부 신호 보정 로직 (W3 작업중)
│   └── gate.py              ← 다층 게이트 엔진 (W5 신규)
└── tests/                   ← (정욱현과 공동)
```

**박진이 손대지 않는 것:**
- `frontend/*` (윤재영 담당)
- `infra/*`, `.github/*` (정욱현 담당)
- `pipeline/*`, `ml/*`, `docs/*` (박진영 PM 담당)
- `migrations/*` (정욱현 담당, 박진은 스키마 요청만)

> 다른 모듈 수정이 필요하면 → **카톡으로 박진영(@zln02) 호출**, 직접 건드리지 말 것.

---

## 🚨 지금 박진이 해야 할 일 (W3 핫픽스 우선)

### 1️⃣ PR #13 핫픽스 — base 변경 + ruff 통과

**문제 2개:**
- ❌ base가 `main` → `develop` 으로 변경 필요
- ❌ CI `python` 실패 (ruff 7 errors, 다 자동수정 가능)

**해결 (3분):**

```bash
# 1. 로컬 브랜치 최신화
git checkout feature/w3-uis-external-signal
git pull origin feature/w3-uis-external-signal

# 2. ruff 자동수정 (한 번이면 됨)
ruff check backend pipeline --select=E,F,W,I --ignore=E501 --fix

# 3. 변경 확인 후 커밋
git diff
git add backend/
git commit -m "fix(be): ruff 7 errors 자동수정 (import order + trailing newline)"

# 4. 푸시 — CI 다시 돌아감
git push

# 5. PR base 변경: main → develop (웹에서)
#    https://github.com/zln02/thinq-workspace-sentinel/pull/13
#    "Edit" 클릭 → "base: main" 드롭다운 → "develop" 선택
#
#    또는 gh CLI:
gh pr edit 13 --base develop
```

**CI 그린 + 박진영 리뷰 → squash 머지.**

### 2️⃣ healthcheck-enhance 브랜치 PR 만들기

`feature/healthcheck-enhance` 가 푸시는 됐는데 **PR 미생성** 상태.

```bash
gh pr create --base develop --title "feat(be): /health 엔드포인트 강화 (status + timestamp + 503)" \
  --body "## 어떤 모듈
backend

## 왜
운영 모니터링용 — DB·Redis 연결 실패 시 503 반환, 정상 시 timestamp 포함

## 어떻게 검증했는지
- [x] 로컬 \`curl http://127.0.0.1:8003/health\` 200 + status:up 확인
- [x] DB 끄고 \`curl\` 시 503 확인"
```

---

## 📅 박진의 W3~W6 로드맵

### W3 (6/2~8) — 외부 신호 + 헬스체크 ⭐ 지금

| # | 작업 | 파일 | 상태 |
|---|---|---|---|
| 1 | UIS read-only 어댑터 | `services/uis_reader.py` | 🟡 PR #13 핫픽스 대기 |
| 2 | 외부 신호 보정 로직 | `services/external_signal.py` | 🟡 PR #13 핫픽스 대기 |
| 3 | 3개 엔드포인트 | `api/main.py` (`/external/signals`, `/risk-boost`, `/regional/{code}`) | 🟡 동일 |
| 4 | /health 강화 | `api/main.py` | 🟡 PR 생성 필요 |
| 5 | UIS 연결 실패 graceful | `uis_reader.py` 빈 리스트 반환 | ✅ 이미 구현 |

**W3 종료 기준 (자가 체크):**
- [ ] `curl http://127.0.0.1:8003/api/v1/external/signals` → JSON 응답
- [ ] `curl /api/v1/risk-boost?region=11&pathogen=COVID-19&tier=CAUTION` → 보정 tier 반환
- [ ] UIS DB 끄고도 500 안 뜨고 빈 결과 반환
- [ ] `/health` 가 DB/Redis 둘 다 체크

### W4 (6/9~15) — Smart Protocol 고도화 + ThinQ SDK 시뮬 콜

| # | 작업 | 우선순위 |
|---|---|---|
| 1 | Smart Protocol에 외부 신호 반영 (`risk-boost` 결과로 가전 우선순위 조정) | 🔴 P0 |
| 2 | ThinQ Mock 어댑터 → 시뮬 가전 8종 동시 작동 API | 🔴 P0 |
| 3 | SSE 스트림에 5-Tier 변화 이벤트 추가 (윤재영 LiveSensorChart 연동) | 🟡 P1 |
| 4 | 액션 로그 DB 적재 (`sentinel.action_log`) | 🟡 P1 |

**W4 협업 포인트:**
- **윤재영(FE)** — SSE 메시지 포맷 합의 (월요일 회의)
- **박진영(PM)** — Smart Protocol 매트릭스 최종 검증
- **정욱현(QA)** — 액션 로그 스키마 마이그레이션 요청

### W5 (6/16~22) — 다층 게이트 엔진 ⭐ 1등 차별점

```python
# backend/services/gate.py (신규)
def evaluate_gate(
    tier: str,           # MONITOR/CAUTION/ALERT/HIGH_RISK/CRITICAL
    devices: list,       # 켤 가전 목록
    hour: int,           # 0~23 (야간 22~6시)
    power_kw: float,     # 총 전력 부하
    occupancy: int,      # 재실 인원
) -> str:
    """Returns: AUTO / MANUAL_APPROVAL / EMERGENCY_AUTO / NOTIFY_ONLY / BLOCKED"""
```

**게이트 규칙 표** (참고: 어제 박진영과 합의)

| Tier | 가전 수 | 시간대 | 전력 | 결과 |
|---|---|---|---|---|
| MONITOR | - | - | - | NOTIFY_ONLY |
| CAUTION | 1~2 | 주간 | <2kW | AUTO |
| CAUTION | 1~2 | 야간 | <2kW | AUTO(정숙모드) |
| ALERT | 3~4 | 주간 | 2~5kW | AUTO + 푸시 |
| ALERT | 3~4 | 야간 | 2~5kW | MANUAL_APPROVAL (5분) |
| HIGH_RISK | 5 | - | 5~8kW | MANUAL_APPROVAL + 간호사 통보 |
| CRITICAL | 5~8 | - | >8kW | EMERGENCY_AUTO + 사후 감사 |

**엔드포인트 추가:**
- `POST /api/v1/gate/evaluate` — 게이트 판단
- `POST /api/v1/gate/approve` — 승인 처리 (관리자만)
- `GET /api/v1/gate/pending` — 승인 대기 큐

### W6 (6/23~25) — 최종 발표 + 문서

| # | 작업 |
|---|---|
| 1 | API 문서 OpenAPI 자동 생성 (`/docs` URL 활성) |
| 2 | 시연 75초 + 라이브 3분 백엔드 시퀀스 점검 |
| 3 | 박진영 발표 자료에 들어갈 백엔드 KPI 정리 (응답시간 p95, SSE latency) |
| 4 | 인수인계 README 1p |

---

## 🛠 박진의 일상 워크플로 (매일 반복)

### 아침 시작 (5분)

```bash
# 1. develop 최신화
git checkout develop
git pull --ff-only origin develop

# 2. 새 feature 브랜치 (오늘 할 작업)
git checkout -b feature/be-<짧은이름>
# 예: feature/be-gate-engine
#     feature/be-action-log-schema

# 3. Docker 스택 부팅
docker compose -f infra/docker-compose.dev.yml up -d
curl http://localhost:8003/health   # → up 확인
```

### 작업 중 (코드 작성)

```bash
# 변경 후 ruff 자동수정 (커밋 전에 매번)
ruff check backend --select=E,F,W,I --ignore=E501 --fix

# 로컬 테스트
pytest tests/test_poi.py tests/test_tier.py -v   # 기존 통과 확인
curl http://localhost:8003/api/v1/<내가만든엔드포인트>   # 새 거 동작 확인
```

### PR 만들기 (5단계)

```bash
git add backend/
git commit -m "feat(be): <한 줄 요약>"
git push -u origin feature/be-<이름>

# PR 생성 (자동으로 base=develop, 템플릿 로드)
gh pr create --base develop
```

> **base 항상 `develop`**. `main` 절대 금지.

---

## 🚨 박진이 자주 막힐 패턴 + 즉시 해결

| 막힘 | 원인 | 해결 |
|---|---|---|
| `ruff` 7 errors | import 순서 + 빈 줄 공백 + 파일 끝 newline | `ruff check backend --select=E,F,W,I --ignore=E501 --fix` |
| `pytest` failed | import path 또는 fixture 이름 변경 | `tests/conftest.py` 와 비교 |
| `asyncpg` 연결 실패 | DB 컨테이너 죽음 | `docker compose -f infra/docker-compose.dev.yml ps` → `up -d` |
| 5432 포트 충돌 | 호스트에 PG 깔려있음 | **dev는 55432 사용**, 우리 docker-compose는 이미 맞음 |
| UIS DB 못 읽음 | `UIS_DATABASE_URL` 미설정 | `.env` 에 추가하거나 빈 리스트 반환 분기 확인 |
| CI 빨강 | ruff or pytest or secret-scan | Actions 탭에서 로그 → 해당 명령어 로컬 재현 |
| `develop` 과 충돌 | 박진영이 develop을 업데이트함 | `git fetch origin && git rebase origin/develop` |
| `.env` 실수 푸시 | secret-scan이 차단 | 박진영(@zln02)에게 즉시 톡 |

---

## 💬 박진이 박진영(PM)에게 물어볼 것 (월~금)

이번 주(W3) 박진영이 답할 준비된 질문:

1. **SSE 메시지 포맷** — 윤재영 LiveSensorChart에 어떤 JSON 형태로 push?
2. **action_log 스키마** — 정욱현 마이그레이션 요청 전에 컬럼 합의
3. **승인 게이트 시간대** — "야간 22~6시" 가 맞나? (요양병원 실무 기준)
4. **외부 신호 가중치** — KOWAS·DataLab·OTC 각각 몇 % 반영?
5. **/health 503 기준** — DB 다운만? Redis도? 시뮬레이터도?

**원칙**: 5분 시도 → 막히면 박진영에게 바로 톡. 30분 헤매는 거 아까움.

---

## 📚 박진이 알아야 할 학술·도메인 (시연 Q&A 대비)

### REHVA Wells-Riley 식 (외부 신호와 어떻게 결합?)
```
PoI = 1 - exp(-I × p × q × t / Q)
  I: 감염자 수 (실내, 우리 센서)
  p: 호흡량 (병원체별 고정)
  q: quanta 방출 (병원체별 고정)
  t: 노출 시간
  Q: 환기율 (가전이 제어)
```
**외부 신호 역할**: I(감염자 수) 와 q(병원체 위험도) 를 **사전 추정**해서 PoI 가중.

### 외부 신호 4가지 역할 (왜 외부 데이터가 필요한가)
1. **3주 사전 예측** — KOWAS 추세 → 21일 사전 가전 세팅
2. **병원체 식별** — "이 지역 RSV" vs "인플루엔자" → 다른 가전 매칭
3. **임계값 동적 조정** — CO2 1000ppm 고정 → 평시 1200, 유행기 800
4. **승인 게이트 법적 정당성** — "왜 야간 환기?" → "지역 노로 +50%" 근거

### 박진의 코드가 만드는 점수 (1등 매트릭스)
- 외부 신호 없으면 = **IoT 환기 시스템** (40점)
- 박진 PR #13 이 만들어내는 가치 = **사전 예방** (90~100점 가능)

---

## ✅ 박진의 W3 종료 자가 점검 체크리스트

이번 주(6/8)까지 모두 ✅ 면 W4 진입.

- [ ] PR #13 머지됨 (base=develop, CI 그린)
- [ ] PR `healthcheck-enhance` 머지됨
- [ ] 외부 신호 3개 엔드포인트 동작 확인 (curl 통과)
- [ ] UIS DB 다운 시 graceful (빈 결과) 확인
- [ ] `/health` 가 DB+Redis 둘 다 체크
- [ ] 박진영과 W4 SSE 포맷 합의 완료
- [ ] 정욱현에게 action_log 스키마 요청 전달

---

## 📂 박진이 참고할 다른 문서

| 문서 | 언제 보나 |
|---|---|
| [README.md](../../README.md) | 첫날 셋업·PR 만드는 5단계 |
| [Friendly_Onboarding.pdf](Friendly_Onboarding.pdf) | 단어 모를 때 (PR=과제검사, Docker=레시피박스) |
| [Master_Dev_Guide.pdf](Master_Dev_Guide.pdf) §3 | 전체 스토리라인 10페이지·심사기준 매핑 |
| [Role_Backend.pptx](../roles/Role_Backend.pptx) | 박진 역할 7슬라이드 요약 |
| [handoff_2026-06-02.md](handoff_2026-06-02.md) | 4 critical 핸드오프 (SHAP→XGB, 1000ppm 등) |

---

## 🆘 정말 막히면

1. **5분 시도** — Friendly_Onboarding.pdf p6 "막힘 처방전 7가지" 먼저
2. **카톡 박진영(@zln02)** — 30분 헤매지 말고 바로
3. **5분 대기조 단톡** — 윤재영(FE)·정욱현(DevOps) 도 봄
4. **GitHub Issue** — 비동기로 정리할 거리 (스키마 변경 같은 거)

> 우리 다 처음이에요. 막힘은 자연스럽고, 빠른 호출이 30분 헤매기보다 팀에 이득.

— *박진영 (PM/Tech Lead) · 2026-06-02 작성*
