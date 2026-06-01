# ThinQ Workspace Sentinel · 팀 온보딩 가이드 v2 (GitHub 중심)

> LG DX School 5기 · **5분 대기조** · 2026.05.19 ~ 06.25 (6주 PoC)
> 발행: 2026-06-01 · v2 (로컬 + GitHub PR 워크플로 채택)

## 0. 한 줄 소개

요양병원 RSV·인플루엔자·노로를 **3주 전에 예측**해서 LG ThinQ 가전 8종이 자동 환경 제어하는 시스템.

### 일하는 방식 (v2 핵심 변경)

- 팀원은 **본인 PC**에서 코드 작성 (VM 접속 X)
- `docker compose -f infra/docker-compose.dev.yml up -d` 한 줄로 로컬 mini-stack 실행
- `feature/*` 브랜치 → PR → 자동 CI → develop 머지 → main PR → **자동 VM 배포**
- VM은 통합·시연 전용 (박진영 운영)

---

## 1. 사전 준비 (각자 본인 PC)

| 항목 | 설치 명령 / 비고 |
|---|---|
| Git | `git --version` 확인 |
| Docker Desktop | https://www.docker.com/products/docker-desktop/ |
| Node 20+ (Frontend) | `nvm install 20` 권장 |
| Python 3.11 (Backend/ML/Pipeline) | pyenv 권장 |
| GitHub 계정 | 박진영에게 ID 전달 → Collaborator 등록 |
| VSCode / 본인 IDE | 자유 |

---

## 2. 첫날 셋업 (15분)

```bash
# 1) 클론
git clone https://github.com/zln02/thinq-workspace-sentinel.git
cd thinq-workspace-sentinel

# 2) develop 동기화 + 본인 feature 브랜치
git checkout develop && git pull
git checkout -b feature/<모듈>-<기능>-w3

# 3) 로컬 mini-stack 실행 (Docker Desktop 켜져 있어야 함)
docker compose -f infra/docker-compose.dev.yml up -d

# 4) 헬스체크
curl http://127.0.0.1:8003/health
# → {"db":"up", "redis":"up", "simulator":"up"}

# 5) 시뮬레이션 한 번 돌려보기
curl -X POST http://127.0.0.1:8003/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario":"summer_norovirus","minutes":60}'

# 6) 종료할 때
docker compose -f infra/docker-compose.dev.yml down
```

---

## 3. 역할 분담 (5명)

> 이름란 〈 〉는 박진영(Tech Lead)이 실제 5분 대기조 멤버 이름으로 채울 것.

| 모듈 | 담당 | W3~W6 핵심 작업 |
|---|---|---|
| **`ml/`** | **박진영** (Tech Lead · ML) | XGBoost+TFT 하이브리드, REHVA 계산기, 5-Tier, 아키텍처 |
| **`backend/`** | **〈Backend 담당〉** | FastAPI 확장, Smart Protocol 풀구현, SSE 실시간 게이트웨이 |
| **`pipeline/`** | **〈Data 담당〉** | UIS DB 어댑터(read-only), Kafka 구독, 시뮬 시나리오 확장 |
| **`frontend/`** | **〈Frontend 담당〉** | Next.js 14 · `/admin`·`/mobile`·`/demo` 3종 클라이언트 |
| **`infra/`** | **〈DevOps/QA 담당〉** | GitHub Actions 유지보수, VM 모니터링, 배포 자동화 |

### 권한

- **박진영(Tech Lead)** 은 모든 모듈 풀 권한.
- 타인 모듈 수정은 PR로만.
- `~/urban-immune-system/` (다른 캡스톤 팀) 절대 수정 금지.

---

## 4. Git 워크플로 (반드시 준수)

```
feature/<모듈>-<기능>  ──PR──►  develop  ──PR──►  main  ──auto──►  VM 배포
```

### 브랜치 네이밍 (예시)

| 좋은 예 | 나쁜 예 |
|---|---|
| `feature/backend-sse-realtime-w3` | `dev` (모호) |
| `feature/frontend-admin-grid-w3` | `김나영-작업` (이름 X) |
| `feature/pipeline-uis-adapter-w3` | `temp` |
| `fix/migration-002-rollback` | `master` (사용 안 함) |

### 절대 금지

- ❌ `main` · `develop` 직접 push
- ❌ `.env`, 비밀키 commit (CI가 차단)
- ❌ `--no-verify` (pre-commit 우회)
- ❌ UIS 디렉토리·UIS 스키마 수정
- ❌ 본인 모듈 외 직접 수정 (PR로만)

### PR 규칙

- PR 템플릿 자동 로드됨 (어떤 모듈·왜·검증·UIS 경계 4섹션)
- **최소 1명 리뷰 필수** (Tech Lead 또는 다른 모듈 담당)
- CI 4개 (lint·smoke·frontend·secret-scan) 모두 통과해야 머지
- 머지 후 develop이 자동 업데이트되면 본인 로컬 `git pull` 권장

---

## 5. 자동 배포 흐름 (CD)

```
GitHub  ──[push to main]──►  GitHub Actions  ──[SSH]──►  VM (uis-capstone)
                                  │
                                  ├ git fetch → main reset --hard
                                  ├ migrations 적용 (있으면)
                                  ├ sentinel-api 재시작
                                  └ /health smoke check
```

- 자동 트리거: **main 머지 시**
- 수동 트리거: Actions 탭 → "Deploy to VM" → Run workflow (긴급 롤백 등)
- 배포 실패 시: Tech Lead(박진영) 즉시 확인
- VM Secrets (박진영 설정): `VM_SSH_KEY`·`VM_HOST`·`VM_USER`

---

## 6. 현재 VM 가동 서비스 (시연·통합용)

| 서비스 | 컨테이너 | 포트 | 소유 | 비고 |
|---|---|---|---|---|
| TimescaleDB | `uis-timescaledb` | 5432 | UIS팀 | sentinel 스키마만 우리 |
| Kafka | `uis-kafka` | 9092 | UIS팀 | read-only 구독 |
| Redis | `sentinel-redis` | 6380 | 우리 | W2 신규 |
| FastAPI | uvicorn | 8003 | 우리 | `/health`·`/api/v1/*` |

**팀원은 일반적으로 VM 접속 X**. 통합 테스트·발표 리허설 시 박진영이 안내.

---

## 7. 주차별 마일스톤

| 주차 | 공동 목표 | 모듈별 핵심 |
|---|---|---|
| **W3** (6/2~8) | 외부신호 → 예측 → 시뮬 통합 | pipeline: UIS DB 어댑터 / ml: XGBoost / backend: SSE |
| **W4** (6/9~15) | Smart Protocol + 75초 시연 영상 | frontend: 평면도+그리드+demo / backend: 정책 |
| **W5** (6/16~22) | 다층 게이트·자동 해제·모바일 | ml: FAR / frontend: PWA / infra: 모니터링 |
| **W6** (6/23~25) | 최종 발표·문서·시연 영상 | 전체 발표·PPT·라이브 리허설 |

---

## 8. 디버깅 첫 5가지

1. **Docker Desktop 안 켜짐**: 켜고 `docker ps` 확인
2. **포트 충돌**: 로컬 dev 포트 (`55432`·`56379`·`8003`) 다른 앱이 쓰는지 확인
3. **DB 마이그레이션 재적용**: `docker compose -f infra/docker-compose.dev.yml down -v && up -d` (완전 리셋)
4. **CI 실패**: PR 페이지 Actions 탭에서 로그 확인 → 본인 로컬에서 `ruff check backend pipeline` 재현
5. **자동 배포 실패**: 박진영에게 즉시 알림 → Actions 탭에서 SSH 출력 확인

---

## 9. 학술·법적 근거 (Q&A 대비)

- REHVA COVID-19 guidance v4.1 (Wells-Riley)
- Kim et al. 2025 (Applied Sciences 15:9145) — 5-Tier
- Lowen 2007 (PNAS) — 저온저습 인플루엔자
- Buonanno 2020 — COVID quanta
- KCDC 요양병원 감염관리 지침
- 9개 법령: `docs/legal/nursing_home_compliance_matrix.md`

---

## 10. 소통

- **Slack 채널**: `#sentinel-dev` (박진영 개설)
- **데일리 스탠드업**: 매일 21:00 KST · 10분 · 모듈별 1줄
- **블로커**: 24h 이상 막히면 박진영에게 DM
- **PR 리뷰 SLA**: 24h 내 1차 응답

---

## 11. UIS와의 관계 (재확인)

- **UIS (`~/urban-immune-system/`)** = **다른 캡스톤 팀** 운영
- UIS는 KOWAS·DataLab·OTC 정제 데이터를 TimescaleDB(`urban_immune` DB)에 적재
- 우리 5분 대기조는 **read-only로만 소비**
- 절대 수정 금지: UIS 디렉토리·UIS 스키마(`public.*`)·UIS 컨테이너 환경
