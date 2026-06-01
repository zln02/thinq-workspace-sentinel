# ThinQ Workspace Sentinel · 팀 온보딩 가이드 v3 (친절판)

> LG DX School 5기 · **5분 대기조** · 2026.05.19 ~ 06.25 (6주짜리 시범 프로젝트)
> 발행: 2026-06-01 · v3 (전문용어 다 풀어씀)

---

## 0. 이 문서가 뭐고 왜 봐야 하나

**한 줄 요약**: 5명이 6주 동안 같이 코딩하는데, 이 문서대로만 따라 하면 처음 보는 사람도 첫날에 셋업하고 첫 PR 올릴 수 있게 만든 안내서.

**누가 봐야 하나**:
- 5분 대기조 5명 전원 (처음 합류한 사람 포함)
- 코드를 처음 만지는 신입~중급 개발자 기준으로 설명함

---

## 1. 우리가 뭘 만드는 거야?

**한 문장 요약**: **요양병원에서 RSV·인플루엔자·노로 같은 감염병이 터질 것 같으면 3주 전에 미리 알려주고, LG ThinQ 가전 8종(공기청정기·에어컨·환기·가습·제습·보일러·로봇청소기·스타일러)이 알아서 환경을 바꿔주는 시스템**.

**왜?**
- 요양병원에서 노인 한 명이 RSV 걸리면 줄줄이 옮음 → 의료법 36조에서 감염관리 의무
- 적정성평가(건보공단) 점수 = 병원 수가 직결 = 돈
- 우리 시스템 도입 시 자동 증빙 + 환경 자동 제어로 점수 가산

---

## 2. 처음 보는 용어 사전 (계속 옆에 두고 봐)

### 협업 관련

| 용어 | 한 문장 풀이 | 우리가 어떻게 쓰는지 |
|---|---|---|
| **GitHub** | 코드를 인터넷에 올려놓고 같이 작업하는 곳. 카카오톡 단톡방처럼 모두가 같은 내용 본다. | `github.com/zln02/thinq-workspace-sentinel` 가 우리 단톡방 |
| **레포(repo)** | GitHub에 올린 프로젝트 하나. 폴더 같은 거. | 우리 레포 = `thinq-workspace-sentinel` |
| **브랜치(branch)** | 본체 코드를 건드리지 않고 따로 작업하는 "사본". 망쳐도 본체에 영향 없음. | `feature/backend-sse-w3` 같은 게 내 사본 |
| **커밋(commit)** | 작업 한 단위를 기록함. "이만큼 했어요" 도장 찍기. | "feat(backend): SSE 추가" 같은 메시지로 기록 |
| **푸시(push)** | 내 컴퓨터에 있는 커밋을 GitHub로 올리기. 카톡 전송과 비슷. | `git push origin feature/...` |
| **PR (Pull Request)** | "내 작업 봐줘, 본체에 합쳐줘"라고 요청하기. 작업 완료 보고서 같은 거. | 우리는 PR로 모든 변경을 합침 |
| **머지(merge)** | PR을 본체에 합치기. 결재 완료 도장. | 리뷰 통과하면 머지 |
| **리뷰(review)** | 다른 사람 PR 보고 OK 또는 수정 요청. 서로의 코드 봐주기. | 모든 PR은 최소 1명 리뷰 필수 |

### 기술 관련

| 용어 | 한 문장 풀이 |
|---|---|
| **Docker** | 필요한 프로그램 묶음을 종이상자에 담아놓고 한 번에 켜는 도구. 누구 컴이든 똑같이 동작하게 해줌. |
| **Docker Desktop** | 위 Docker를 윈도우/맥에서 클릭으로 켜는 앱. 본인 PC에 깔아야 함. |
| **컨테이너(container)** | Docker로 켠 하나의 프로그램 상자. 우리 시스템은 컨테이너 4개 정도 같이 돈다. |
| **TimescaleDB** | 시간순 데이터(센서값 등) 빠르게 저장·조회하는 데이터베이스. PostgreSQL의 친척. |
| **Redis** | 자주 쓰는 값을 빨리 꺼내려고 두는 임시 메모리 저장소. |
| **FastAPI** | 파이썬으로 백엔드 서버 만드는 도구. |
| **Next.js** | 자바스크립트로 웹사이트 만드는 도구. (홈페이지·관리자페이지 만들 때) |
| **SSE (Server-Sent Events)** | 서버가 브라우저로 실시간으로 내용을 계속 밀어 보내는 기술. 라이브 스코어 같은 거 만들 때 씀. |
| **CI (Continuous Integration)** | "코드 올릴 때마다 자동으로 검사"하는 거. PR 올리면 GitHub가 자동 테스트해줌. |
| **CD (Continuous Deployment)** | "main에 합쳐지면 자동으로 서버에 올림". 우리는 main 머지 시 VM에 자동 배포. |
| **VM (Virtual Machine)** | 클라우드에서 빌린 컴퓨터. 우리는 GCP에서 `uis-capstone` 1대 빌려 씀. |
| **SSH** | 멀리 있는 컴퓨터에 원격 접속하는 방법. 우리는 VM 운영자(박진영)만 사용. |
| **API 엔드포인트** | 서버에서 받을 수 있는 주소 1개. 예: `/health` = 건강체크. |
| **헬스체크(health check)** | "너 살아있어?" 한 번 물어보는 거. 응답 오면 OK. |

### 도메인 관련

| 용어 | 한 문장 풀이 |
|---|---|
| **REHVA** | 유럽 환기·공조 표준 협회. 코로나 때 환기율 가이드 만든 곳. |
| **Wells-Riley 방정식** | 공기 중 감염 확률 계산 공식. 1955년부터 쓰는 검증된 식. |
| **PoI (Probability of Infection)** | 감염 확률. 0~100% 사이 숫자. 우리 시스템 핵심 지표. |
| **5-Tier** | 위험도 5단계: 안전(🟢)·주의(🟡)·경보(🟠)·고위험(🔴)·심각(⚫). 신호등 같은 거. |
| **ACH (Air Changes per Hour)** | 시간당 환기 횟수. 1시간에 공기가 몇 번 통째로 갈리는지. 의료기관 권장 ACH 6+. |
| **quanta** | 감염력 단위. 1 quanta = 50% 확률로 감염시키는 양. |
| **KOWAS** | 질병관리청 하수 기반 감염병 감시 시스템. 우리가 받는 외부 신호 1번. |
| **UIS (Urban Immune System)** | 다른 캡스톤 팀이 만드는 외부 데이터 시스템. 우리한테 KOWAS·DataLab·OTC 정제 데이터 줌. **우리 팀 X, 다른 팀.** |
| **ICN** | 감염관리 간호사 (Infection Control Nurse). 요양병원 메인 사용자. |

---

## 3. 우리가 일하는 방식 (한 번에 그림으로)

```
[본인 PC]                       [GitHub]                       [VM (서버)]
  ↓ 코드 작성                     ↓ PR · 리뷰                    ↓ 자동 배포
  로컬에서 Docker로              자동 검사 (CI)                 main이 합쳐지면
  미니 서버 켜고 테스트          → develop 합침                  GitHub가 SSH로
                                 → main PR                       VM 들어가서 갱신
                                 → 합치면 자동 배포
```

**핵심 3가지**:
1. 코드는 본인 PC에서 짠다. **VM에 직접 접속해서 코드 고치면 안 됨** (다음 배포에 다 덮어쓰임).
2. 작업은 항상 본인 브랜치에서. 본체(`main`·`develop`)에 직접 푸시 금지.
3. PR 올리면 자동으로 검사(CI) 돌아감. 빨간 불 뜨면 고쳐야 합칠 수 있음.

---

## 4. 처음 PC에 깔아야 할 것 (15분)

| 항목 | 설명 | 어디서 받음 |
|---|---|---|
| **Git** | 코드 버전관리 기본 도구 | macOS: `brew install git` / Windows: https://git-scm.com |
| **Docker Desktop** | 미니 서버 한 번에 켜는 도구. **필수** | https://www.docker.com/products/docker-desktop |
| **Node 20+** | Frontend 작업자만. JS 실행 환경 | https://nodejs.org (LTS 선택) |
| **Python 3.11** | Backend·ML·Pipeline 작업자만 | https://www.python.org (3.11.x) |
| **IDE** | 코드 에디터. **VSCode 추천**. 자유 | https://code.visualstudio.com |
| **GitHub 계정** | 본인 ID. 박진영에게 ID 알려줘서 초대 받기 | https://github.com |

설치 다 됐는지 확인:
```
git --version          # 2.x 이상
docker --version       # 24 이상
node --version         # v20 이상 (Frontend 작업자)
python --version       # 3.11.x (Backend 작업자)
```

---

## 5. 첫날 셋업 (실제 명령 다 들어있음)

### Step 1. 코드 받기

```bash
# 본인 PC에서 작업할 폴더로 이동 (예: ~/projects)
cd ~/projects

# GitHub에서 코드 다운로드
git clone https://github.com/zln02/thinq-workspace-sentinel.git
cd thinq-workspace-sentinel
```

이러면 우리 프로젝트 전체가 본인 PC에 복사됨.

### Step 2. 본인 작업용 브랜치 만들기

```bash
# 1) 최신 develop 받기 (다른 사람 작업 합쳐진 본체)
git checkout develop
git pull

# 2) 본인 작업용 브랜치로 갈라치기
git checkout -b feature/<모듈>-<무엇할지>-w3
```

**예시**:
- Backend 담당이 SSE 작업: `feature/backend-sse-by-space-w3`
- Frontend 담당이 병실 상세 페이지: `feature/frontend-room-detail-w3`
- Pipeline 담당이 UIS 데이터 받기: `feature/pipeline-uis-adapter-w3`

브랜치 이름 규칙: `feature/모듈명-할일-주차`. 한글·공백·이름은 X.

### Step 3. 미니 서버 켜기 (Docker)

```bash
# Docker Desktop 미리 켜져 있어야 함 (앱 실행)
docker compose -f infra/docker-compose.dev.yml up -d
```

위 명령 한 번이면 본인 PC에서:
- TimescaleDB (데이터베이스) 컨테이너 1개
- Redis (캐시) 컨테이너 1개
- FastAPI (백엔드 서버) 컨테이너 1개

이렇게 3개가 자동으로 켜짐. 약 30초 기다리면 다 준비됨.

### Step 4. 잘 켜졌는지 확인

```bash
# 브라우저 또는 터미널에서
curl http://127.0.0.1:8003/health
```

아래처럼 나오면 OK:
```json
{
  "service": "sentinel-api",
  "db": {"status": "up", "pathogens_count": 8},
  "redis": {"status": "up"},
  "simulator": {"status": "up"}
}
```

`up`이 안 보이면 컨테이너가 제대로 안 켜진 것. Step 3 다시.

### Step 5. 시뮬레이션 한 번 돌려보기

```bash
curl -X POST http://127.0.0.1:8003/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario":"summer_norovirus","minutes":60}'
```

여름 노로 시나리오 1시간 시뮬 돌림. 결과로 `PoI 30% → 0.01%` 같은 게 나오면 모든 게 정상.

### Step 6. 종료 (PC 끌 때나 작업 끝났을 때)

```bash
docker compose -f infra/docker-compose.dev.yml down
```

컨테이너 다 꺼짐. 데이터는 디스크에 남아있어서 다음에 `up -d`로 켜면 그대로.

---

## 6. 첫 PR 만들기 (제일 중요한 부분)

### Step 1. 코드 수정

본인 IDE(VSCode 등) 에서 자기 모듈 파일을 수정한다.

예: Backend 담당이 `backend/services/rehva.py` 새 파일 만듦.

### Step 2. 변경사항 저장 (커밋)

```bash
# 어떤 파일 변경했는지 확인
git status

# 변경 파일 스테이지 (다음 커밋에 포함시키기)
git add backend/services/rehva.py
# 또는 모든 변경을 추가
git add -A

# 커밋 (메시지 형식: feat/fix/chore + 모듈 + 한 줄 요약)
git commit -m "feat(backend): REHVA calculator 분리"
```

**커밋 메시지 prefix 규칙**:
- `feat:` 새 기능
- `fix:` 버그 수정
- `chore:` 잡일 (설정·문서·정리)
- `docs:` 문서만 수정
- `refactor:` 기능 변화 없이 코드 정리
- `test:` 테스트만 추가/수정

### Step 3. GitHub로 보내기 (푸시)

```bash
git push -u origin feature/<내브랜치>
```

처음 푸시할 때 `-u origin`을 붙임. 두 번째부터는 그냥 `git push`만.

### Step 4. PR 만들기

옵션 A — **GitHub 웹에서 (추천, 처음엔 이게 편함)**:
1. 푸시 후 터미널에 뜨는 URL 클릭 또는
2. `https://github.com/zln02/thinq-workspace-sentinel` 접속 → "Compare & pull request" 버튼

옵션 B — 명령어로:
```bash
gh pr create --base develop --web
# 브라우저로 자동 열림 → PR 템플릿 작성
```

### Step 5. PR 템플릿 작성

자동으로 4개 칸 뜸. 채우는 법:

```markdown
## 어떤 모듈
backend  ← 본인 모듈명만

## 왜
REHVA 계산기를 백엔드 서비스로 분리. 프론트에서도 호출 가능하도록.

## 어떻게 검증했는지
- [x] 로컬에서 `curl /health` OK
- [x] 단위 테스트 추가 (`tests/test_rehva.py`)
- [x] 시뮬 5종 PoI 결과 동일 (변동 없음)

## UIS 경계 확인
- [x] UIS 디렉토리·스키마 미수정
```

PR 제목은 커밋 메시지와 같게: `feat(backend): REHVA calculator 분리`

### Step 6. 자동 검사(CI) 통과 기다리기

PR 페이지 아래에 동그라미 3개 뜸:
- 🟢 **python** — 파이썬 코드 검사 통과
- 🟢 **frontend** — 프론트 빌드 통과 (Frontend 작업 시)
- 🟢 **secret-scan** — 비밀번호 같은 거 안 들어갔는지 검사

다 🟢이면 OK. 🔴 빨간색이면 클릭해서 로그 보고 수정.

### Step 7. 리뷰 받기

GitHub에서 reviewer를 박진영(또는 다른 모듈 담당자)으로 지정. 리뷰어가 "Approve" 누르면 OK.

수정 요청 받으면:
1. 본인 PC에서 코드 수정
2. `git add` → `git commit` → `git push`
3. 자동으로 PR이 갱신됨 (새 PR 만들 필요 X)

### Step 8. 머지 (합치기)

CI 🟢 + 리뷰 ✅ 둘 다 되면 머지 버튼 활성화.
"Merge pull request" 클릭 → 끝.

본인 브랜치 코드가 `develop`에 합쳐짐. 본인 작업 완료.

---

## 7. 만약 문제 생기면 (자주 있는 5가지)

### A. Docker Desktop이 안 켜짐

**증상**: `docker compose up` 입력해도 "Cannot connect to Docker daemon" 에러
**해결**: Docker Desktop 앱을 직접 실행 (Mac은 Applications·Windows는 시작 메뉴) → 고래 아이콘이 안정될 때까지 30초 기다림

### B. 8003 포트가 이미 사용 중

**증상**: `Bind for 0.0.0.0:8003 failed: port is already allocated`
**해결**: 다른 앱이 그 포트 쓰고 있음. 끄거나, `infra/docker-compose.dev.yml` 에서 포트 변경 (예: 8003 → 8004)

### C. CI(자동검사)가 빨간 불

**증상**: PR 페이지에서 ❌ python failed
**해결**:
1. ❌ 클릭해서 로그 보기 (어디서 에러났는지)
2. 본인 PC에서 재현:
   ```bash
   # 파이썬 코드 검사
   pip install ruff
   ruff check backend pipeline --select=E,F,W,I --ignore=E501
   ```
3. 에러 메시지대로 수정 → 다시 push → CI 자동 재실행

### D. develop이 자꾸 바뀌어서 내 PR 충돌남

**증상**: PR 페이지에 "This branch has conflicts that must be resolved" 빨간 메시지
**해결**:
```bash
# 본인 PC에서
git checkout develop && git pull              # develop 최신 받기
git checkout feature/<내브랜치>                # 내 브랜치로
git rebase develop                            # develop을 기반으로 내 작업 다시 쌓기

# 충돌 파일 IDE로 열어서 수정 (충돌 부분이 표시됨)
# 수정 후
git add <충돌해결한 파일>
git rebase --continue

# 갱신된 내 브랜치 GitHub에 다시 푸시
git push --force-with-lease
```

### E. 다른 사람이 머지한 후 내 코드 최신 상태로

```bash
git checkout develop
git pull
```

---

## 8. 6주 일정 (W3부터 본격 작업)

| 주차 | 우리가 다 같이 해야 할 것 |
|---|---|
| **W3** (6/2~8) | 외부 신호(KOWAS) → 예측(XGBoost) → 시뮬레이션 통합. 백엔드·파이프라인 메인. |
| **W4** (6/9~15) | 화면 만들기 + 75초 시연 영상. 프론트 메인. |
| **W5** (6/16~22) | 다층 검증·자동 해제·모바일 화면 |
| **W6** (6/23~25) | 최종 발표 + 시연 영상 녹화 |

---

## 9. 역할 분담

> 〈 〉 자리는 박진영(Tech Lead)이 실제 멤버 이름으로 채울 예정.

| 모듈 | 담당 | 주로 뭐 함 |
|---|---|---|
| **`ml/`** | **박진영** (Tech Lead · ML) | 머신러닝 모델 (XGBoost·TFT) · 감염 확률 계산 |
| **`backend/`** | **〈Backend 담당〉** | 서버 (FastAPI) · 가전 제어 로직 · 데이터베이스 쿼리 |
| **`pipeline/`** | **〈Data 담당〉** | UIS에서 외부 데이터 받기 · 시뮬레이터 |
| **`frontend/`** | **〈Frontend 담당〉** | 화면 (Next.js) · 병실 그리드 · 시연 모드 |
| **`infra/`** | **〈DevOps/QA 담당〉** | 자동 검사·배포 · 모니터링 · 부하 테스트 |

---

## 10. 절대 하면 안 되는 5가지

1. ❌ **`main` 또는 `develop` 브랜치에 직접 푸시 금지** — 항상 PR 통해서만
2. ❌ **`.env` 파일 commit 금지** — 비밀번호·API 키 들어있음
3. ❌ **VM에 직접 SSH 접속해서 코드 수정 금지** — 다음 배포에 덮어쓰여 작업 손실
4. ❌ **`~/urban-immune-system/` 디렉토리 수정 금지** — 다른 캡스톤 팀(UIS) 영역
5. ❌ **`public.*` 스키마(DB 안) 수정 금지** — UIS 팀 테이블. 우리는 `sentinel.*` 만

---

## 11. 어디서 도움 받나

| 막혔을 때 | 어디로 |
|---|---|
| Git/PR/CI 등 협업 도구 | Slack `#sentinel-dev` 채널 + 박진영 DM |
| 본인 모듈 코드 | Slack `#sentinel-dev` 채널에서 질문 |
| 다른 모듈 코드 봐달라 | 해당 담당자에게 PR 리뷰 요청 |
| 시스템 전체 설계 | 박진영(Tech Lead) |

**24h 안에 막혔으면 무조건 박진영에게 DM** — 혼자 끙끙 앓지 말 것.

---

## 12. UIS와 우리(5분 대기조)의 관계 (헷갈리니까 한 번 더)

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│  UIS (다른 캡스톤 팀)            │         │  5분 대기조 (우리)              │
│  ~/urban-immune-system/         │         │  ~/thinq-workspace-sentinel/   │
│                                 │         │                                 │
│  외부 데이터 수집·정제          │  데이터  │  요양병원 감염 예측 + ThinQ    │
│  - KOWAS 하수                   │  -----►  │  - REHVA Wells-Riley            │
│  - DataLab 검색 트렌드          │  공급    │  - XGBoost 5-Tier               │
│  - OTC 약국 판매                │          │  - ThinQ 가전 8종 자동 제어    │
│                                 │          │  - Next.js 대시보드             │
│  DB: public.* 스키마            │          │  DB: sentinel.* 스키마          │
└─────────────────────────────────┘         └─────────────────────────────────┘
        UIS 팀 소유                                  우리 5분 대기조 소유
        절대 건드리지 X                              우리가 자유롭게 작업
```

**같은 VM에 살지만, 우리 작업은 완전히 분리된 폴더·DB 스키마 안에서만 한다.**

---

## 부록. 한 줄 명령어 모음

```bash
# 처음 셋업
git clone https://github.com/zln02/thinq-workspace-sentinel.git
cd thinq-workspace-sentinel
docker compose -f infra/docker-compose.dev.yml up -d
curl http://127.0.0.1:8003/health

# 매일 시작할 때
git checkout develop && git pull
git checkout -b feature/<모듈>-<할일>-w3

# 작업 끝나면
git add -A
git commit -m "feat(<모듈>): <한 줄>"
git push -u origin feature/<내브랜치>
gh pr create --base develop --web

# PC 끌 때
docker compose -f infra/docker-compose.dev.yml down
```

여기까지가 첫날에 필요한 전부. 막히면 박진영 DM!
