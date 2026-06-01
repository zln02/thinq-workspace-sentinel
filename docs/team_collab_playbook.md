# 5분 대기조 협업 플레이북 — 모듈별 첫 PR 가이드 (실제 OSS 사례 인용)

> ThinQ Workspace Sentinel · W2 (2026-06-01) 뼈대 완성 → W3 본격 개발 시작
> 발행: Tech Lead 박진영 · v1 (협업 부트스트랩)

지금까지 만든 코드는 **뼈대**. 각 모듈 담당자가 본인 영역을 살로 붙여 나가야 함.
이 문서는 "어디서 시작할지 모르겠다"를 없애기 위한 **모듈별 첫 PR 가이드** + **협업 문화 레퍼런스**.

---

## 1. 우리가 쓰는 협업 모델 — GitFlow 변형

```
feature/<모듈>-<기능>  ──PR──►  develop  ──release PR──►  main  ──auto──►  VM
```

**근거**: Vincent Driessen, [*A successful Git branching model*](https://nvie.com/posts/a-successful-git-branching-model/) (2010).
6주 PoC + 발표 시점 (2026-06-25) 명확 → release/main 분리가 적합.

### 다른 모델 비교 (왜 GitFlow를 골랐나)

| 모델 | 채택 사례 | 장점 | 우리한테 안 맞는 이유 |
|---|---|---|---|
| **Trunk-based** | Google · Facebook · 대규모 SaaS | 짧은 브랜치·feature flag·빠른 통합 | PoC는 통합 빈도 ↓·feature flag 인프라 X |
| **GitHub Flow** | GitHub 본사·Heroku | main 하나·feature 브랜치만·단순 | release 분리 없어 발표 시점 고정에 부적합 |
| **GitFlow (우리)** | Spring·Spotify(초기)·다수 SI | release/hotfix 분리·발표일 명확 | 적합 ✅ |
| **GitLab Flow** | GitLab·환경 브랜치 다층 | staging·production 자연스러움 | 5명 6주는 과함 |

→ "6주 PoC" + "발표 D-day" + "VM 단일 환경" 이라는 우리 조건에 GitFlow가 가장 단순.

---

## 2. 어떻게 협업하나 — 4대 OSS 사례에서 배운 패턴

### A. Kubernetes — **OWNERS + LGTM/Approval 2단계**

- 디렉토리마다 `OWNERS` 파일에 reviewer·approver 명시 (kubernetes/kubernetes/.../OWNERS)
- PR에 `/lgtm` (OK 사인) + `/approve` (최종) 봇 명령으로 머지
- **우리가 채택**: `.github/CODEOWNERS` 로 동일 효과 (지금 박진영 단독 — 멤버 확정 시 분리)

### B. Spring Framework — **Squash + Issue 링크**

- 모든 PR이 GitHub Issue 또는 JIRA에 1:1 연결 (`Closes #123`)
- 머지는 **squash** — 1 feature = 1 commit 원칙
- **우리가 채택**: PR 본문에 "어떤 모듈·왜·검증·UIS 경계" 4섹션 강제

### C. React (Meta) — **작은 PR + Reviewable**

- "PR 1개 < 400줄" 권장 (Code review 효율 연구 인용: SmartBear 2008, Cohen 2010)
- 큰 refactor도 **여러 PR로 쪼개기** (예: fiber 도입 → 30+ PR 시리즈)
- **우리가 채택**: 본인 모듈에서도 한 PR당 **하나의 의미 단위만** (예: "SSE 전체" X → "SSE space별 분리"·"SSE Redis 캐시" 따로)

### D. Next.js (Vercel) — **PR 템플릿 강제 + Changeset**

- PR 템플릿 8섹션 자동 로드 → 빠뜨림 방지
- 사용자 가시 변경은 `.changeset/*.md` 필수 → release notes 자동
- **우리가 채택**: PR 템플릿 4섹션 (Vercel만큼 빡세진 않게)

### 추가 레퍼런스 (필요 시 읽어보기)

- [Google: Code Review Developer Guide](https://google.github.io/eng-practices/review/) — "Lgtm + 1 Nit" 문화
- [Microsoft: Engineering Fundamentals](https://microsoft.github.io/code-with-engineering-playbook/) — 한 PR 최대 500줄
- [Atlassian: Git Flow vs GitHub Flow](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [SmartBear 2008](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) — "1시간에 400줄 이상 리뷰 시 결함 탐지율 급락"

---

## 3. 모듈별 첫 PR 가이드 (W3 시작점)

각자 본인 모듈 첫 PR을 어떻게 시작할지 구체적 예시. **그대로 따라 해도 OK**.

### 🤖 Backend (`backend/`) — 첫 PR 3개 추천

#### PR-B1: SSE 공간별 분리 (현재 demo만 → space-specific)
```bash
git checkout -b feature/backend-sse-by-space-w3
```
**작업 내용**:
- `backend/api/sse.py`에 `GET /api/v1/stream/space/{space_id}` 추가
- 현재 단일 `ward_a` → DB `sentinel.spaces`에서 동적 조회
- 클라이언트 1개 = 공간 1개 구독 (멀티탭 가능)

**참고할 사례**: [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)·
[FastAPI StreamingResponse 패턴](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)

#### PR-B2: REHVA 계산기 분리 (Pure function)
```bash
git checkout -b feature/backend-rehva-calculator-w3
```
**작업 내용**:
- `pipeline/simulator/space.py`의 `poi()`·`tier()`를 `backend/services/rehva.py`로 추출
- 순수 함수로 (입력 dict → 출력 dict) → 프론트도 호출 가능
- 단위 테스트 추가 (`tests/test_rehva.py`)

#### PR-B3: Slack/카톡 알림 어댑터 스텁
```bash
git checkout -b feature/backend-alert-adapter-w3
```
- `backend/services/alerts.py` 신규
- send_slack·send_kakao 함수만 stub (실제 키 없어도 dry-run 출력)

---

### 🖥 Frontend (`frontend/`) — 첫 PR 3개 추천

#### PR-F1: 병실 상세 모달 (`/admin/[roomCode]`)
```bash
git checkout -b feature/frontend-room-detail-w3
```
**작업 내용**:
- `app/admin/[roomCode]/page.tsx` 신규
- 가전 8종 상태 카드 + 센서 6종 실시간 값 + PoI 시계열 그래프 (Recharts)
- 뒤로가기로 평면도 복귀

**참고할 컴포넌트 패턴**: [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) 또는 라우트 모달 (Next.js Parallel Routes)

#### PR-F2: SSE EventSource 훅화
```bash
git checkout -b feature/frontend-sse-hook-w3
```
- `lib/useSentinelStream.ts` 신규: 커스텀 훅 `useSentinelStream(scenario)`
- `/demo` 페이지에서 사용 → 향후 `/admin`에서도 동일 훅 재사용

#### PR-F3: 페르소나별 화면 분기
```bash
git checkout -b feature/frontend-persona-router-w3
```
- ICN: 알림 센터 우선
- 원장: 적정성평가 KPI 위젯
- FM: 가전 운영 카드 그리드 (8종)

---

### 🔌 Pipeline (`pipeline/`) — 첫 PR 2개 추천

#### PR-P1: UIS DB read-only 어댑터
```bash
git checkout -b feature/pipeline-uis-adapter-w3
```
**작업 내용**:
- `pipeline/adapters/uis_reader.py` 신규
- UIS의 `public.kowas_signal_daily`·`public.datalab_trend` 등 테이블 조회 함수
- **read-only 검증**: 모든 쿼리 `SELECT` 만 — `INSERT/UPDATE/DELETE` 사용 시 PR 자동 거절 (CI 추가 검사 가능)

**참고**: [psycopg3 read-only transaction](https://www.psycopg.org/psycopg3/docs/api/connections.html)·
[asyncpg 매뉴얼](https://magicstack.github.io/asyncpg/current/usage.html)

#### PR-P2: 시나리오 추가 (병원체 5종 → 8종)
- 현재 시뮬레이터 `seed_scenario()` 5개 → 폐렴구균·CDI·옴 시나리오 3개 추가
- 시연 영상에서 발표하지 않더라도 "8종 다 다룬다" 증빙용

---

### 🧠 ML (`ml/`) — 박진영 (W3~W4 메인)

#### PR-ML1: XGBoost 베이스라인 5-Tier 학습
```bash
git checkout -b feature/ml-xgboost-baseline-w3
```
- `ml/train_baseline.py`: 시뮬레이터 1만회 돌려 학습 데이터 생성
- 5-Tier 분류 → F1·AUPRC·FAR 측정 → JSON 저장

#### PR-ML2: TFT 단기 예측 (옵션, W4)
- `ml/tft_short.py`: PyTorch Forecasting · 단기 7일 PoI 예측
- XGBoost 결과 + TFT attention weight 시각화

---

### ⚙️ DevOps (`infra/`·`.github/`)

#### PR-D1: CI hotfix (지금 이 PR)
- 본 PR로 처리

#### PR-D2: VM 모니터링 추가
- ntfy/Discord webhook 컨테이너 헬스 알림

#### PR-D3: 부하 테스트 스크립트
- k6 또는 locust로 SSE 100 동시 연결 검증

---

## 4. PR 만들기 4단계 (모든 모듈 공통)

```bash
# 1) 본인 feature 브랜치 생성
git checkout develop && git pull
git checkout -b feature/<모듈>-<기능>-w3

# 2) 로컬에서 실제 작업 → 커밋
docker compose -f infra/docker-compose.dev.yml up -d
# ...코드 작성...
git add <변경 파일>
git commit -m "feat(<모듈>): <한 줄 요약>"

# 3) push + PR 생성
git push -u origin feature/<모듈>-<기능>-w3
gh pr create --base develop --web   # 브라우저로 열림 → 템플릿 작성

# 4) CI 통과 + 리뷰 1명 → 머지
gh pr checks --watch                  # CI 모니터링
# 리뷰어가 Approve 누르면 머지 가능
gh pr merge --merge                   # 또는 GitHub UI
```

---

## 5. 코드 리뷰 — 어떻게 리뷰하나

### Google "Code Review Developer Guide" 기준

| 리뷰 항목 | 봐야 할 것 |
|---|---|
| **Design** | 변경이 시스템에 잘 통합되나? 더 단순한 방법은? |
| **Functionality** | 코드가 실제로 의도한 대로 동작하나? |
| **Complexity** | 더 단순히 못 만드나? over-engineered 아닌가? |
| **Tests** | 적절한 자동 테스트가 있나? |
| **Naming** | 변수·함수·클래스 이름이 명확한가? |
| **Comments** | 주석이 "왜"를 설명하나 (HOW가 아니라) |
| **Style** | 우리 컨벤션 따랐나 (`ruff` 통과) |

### 리뷰어 행동 강령 (요약)

- ✅ **24h 내 1차 응답** (완료 X·받았다는 사인이라도)
- ✅ "이거 어떻게 동작하는지 알려줘" — 질문은 자유롭게
- ✅ Nit (사소한 것)은 `nit:` prefix로 명시 — 머지 차단 X
- ❌ "그냥 다 다시 짜" 류 코멘트 — 구체적 변경 제안과 함께
- ❌ 인신 공격·취향 강요 (Stripe/GitLab 리뷰 가이드 공통)

### 머지 차단 코멘트 vs 단순 제안

- **차단**: "Blocker:" / "Must fix:" prefix
- **제안**: "Nit:" / "Consideration:" prefix
- 차단 코멘트 해결 안 하고 머지 → 머지자가 책임

---

## 6. 충돌·롤백 시 절차

### 충돌

```bash
# develop 최신 받기
git checkout develop && git pull

# 본인 feature 브랜치로 rebase
git checkout feature/<내브랜치>
git rebase develop
# 충돌 발생 시 해결 후
git add <충돌파일>
git rebase --continue

# 다시 force-push (본인 feature 브랜치만!)
git push --force-with-lease
```

### 롤백 (main에서 사고 발생)

```bash
# 1) Revert PR 생성 (즉시)
git checkout main && git pull
git revert <bad-commit-sha> -m 1
git push origin main

# 2) 자동 배포 트리거 → 이전 안정 상태 복귀
```

---

## 7. 주차별 마일스톤 (W3~W6)

| 주차 | 공동 목표 | 모듈 PR 예상 수 |
|---|---|---|
| **W3** (6/2~8) | 외부신호 → 예측 → 시뮬 통합 | B3·F3·P2·ML1·D1 = **~11 PR** |
| **W4** (6/9~15) | Smart Protocol + 시연 영상 | F2·F1·B1·ML2 = **~8 PR** |
| **W5** (6/16~22) | 다층 게이트·자동 해제·모바일 | B2·F1 (mobile)·D2 = **~6 PR** |
| **W6** (6/23~25) | 최종 발표 | hotfix·문서 = **~4 PR** |

→ 총 **~29 PR**, 인당 평균 5~6 PR. 부담 적당.

---

## 8. 자주 묻는 Q&A

**Q. `develop`이 자꾸 바뀌어서 내 PR이 충돌나요.**
A. 매일 한 번 `git checkout feature/... && git rebase develop` 권장. 충돌 작을 때 처리.

**Q. CI가 빨간 불인데 뭐가 문제죠?**
A. 본인 로컬에서 `ruff check backend pipeline` + `PYTHONPATH=. python tests/smoke_scenarios.py` 재현.
프론트는 `cd frontend && npm install && npm run build`.

**Q. 본인 모듈 외 다른 디렉토리 수정 필요한데요?**
A. PR 본문에 "왜 다른 모듈 수정했는지" 명시 + 해당 모듈 담당자 reviewer 지정. 거절되면 별도 PR.

**Q. VM에 직접 SSH 들어가서 코드 고치고 싶은데요?**
A. ❌ 절대 금지. VM은 자동 배포 결과만. 직접 수정 시 다음 배포에 덮어쓰임 = 작업 손실.

**Q. PR이 너무 커졌는데 쪼개도 되나요?**
A. 적극 권장. React fiber도 30+ PR로 쪼갰음. "이 PR 머지 후 후속 PR" 명시하면 OK.

**Q. 발표 임박해서 머지 빨리 해야 하는데요?**
A. **Hotfix 브랜치 `fix/*`** 사용 → main 직접 PR 가능 (develop 우회).
단 Tech Lead 박진영 승인 필수.

---

## 9. 단축 명령 모음 (자주 쓰는 것만)

```bash
# 본인 feature 브랜치에서 develop 동기화
git fetch origin && git rebase origin/develop

# 로컬 mini-stack 재시작
docker compose -f infra/docker-compose.dev.yml down
docker compose -f infra/docker-compose.dev.yml up -d

# 시뮬레이션 5종 일괄 검증
PYTHONPATH=. python tests/smoke_scenarios.py

# 본인 PR 상태 확인
gh pr status

# 본인 PR CI 모니터링
gh pr checks --watch

# 다른 사람 PR 리뷰
gh pr list --search "review-requested:@me"
```

---

## 10. 마지막 한 마디

**우리가 만든 코드는 W2까지 뼈대**. 각자 모듈의 살을 붙여가는 게 W3~W6.
혼자 다 못한다고 막혀 있지 말고, **막히면 24h 안에 박진영 DM**.
서로 PR 리뷰는 빠르게 (24h SLA), 차단 코멘트는 구체적으로, Nit은 가볍게.

**6주 PoC 끝에 발표 1번 잘 하면 끝나는 게 아니야** — 깃 히스토리·PR 트리거·자동 배포 로그·CI 통과 기록 모두 LG 인사평가·취업 포트폴리오의 증빙물이 됨. 처음부터 단단히 가자.

> *"Premature optimization is the root of all evil. Yet code review is not optimization."* — Donald Knuth (오용 + Linus Torvalds 변용)
