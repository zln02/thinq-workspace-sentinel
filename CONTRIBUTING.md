# 기여 가이드 (CONTRIBUTING)

ThinQ Workspace Sentinel 개발에 참여하기 위한 규칙과 환경 설정을 정리합니다.

## 개발 환경 설정

```bash
# 1) 백엔드 (Python 3.12)
make venv            # .venv 생성
make install         # 백엔드 의존성 + 개발도구(ruff·pytest·pre-commit)
cp .env.example .env # 로컬 값 채우기 (실제 키는 절대 커밋 금지)
pre-commit install   # 커밋 훅 활성화

# 2) 프론트엔드 (Node 20)
make install-frontend

# 3) 전체 스택 (Docker)
make up              # infra/docker-compose.dev.yml
```

주요 명령은 `make help` 로 확인하세요.

## 저장소 구조

```
thinq-workspace-sentinel/
├── backend/          FastAPI 서버 — API 라우터, 센서 ingest, 상태기계, 가전 어댑터
│   ├── api/          엔드포인트(sensor·external_live·sse·auth·main)
│   └── services/     UIS DB 리더, 외부신호 정규화, Coway·SmartThings 어댑터
├── pipeline/         시뮬레이션 — Wells-Riley PoI 엔진(rebreathed.py), 병실·가전·센서 모델
├── ml/               예측 모델 설계(XGBoost, Phase 2 — 백엔드 미통합)
├── rpi/              라즈베리파이 브리지 — Arduino 시리얼 ↔ HTTP/SSE, systemd 서비스
├── frontend/         Next.js 14 대시보드 + 보호자 PWA
├── migrations/       TimescaleDB 스키마(하이퍼테이블·시드)
├── infra/            docker-compose, nginx 설정
├── tests/            pytest 단위테스트 + smoke 시나리오
├── docs/             산출문서·포트폴리오(BX·CX·DX)·발표·검증·규제  (docs/README.md 인덱스)
└── .github/workflows CI(lint·test·secret-scan) + deploy(EC2)
```

## 브랜치 전략

- `main` — 배포 가능한 안정 브랜치. 직접 커밋 금지, PR 병합만.
- `develop` — 통합 개발 브랜치.
- 작업 브랜치는 목적별 접두사를 사용합니다:
  - `feature/<이름>` — 신규 기능
  - `fix/<이름>` — 버그 수정
  - `docs/<이름>` — 문서
  - `hotfix/<이름>` — 긴급 수정

## 커밋 컨벤션

Conventional Commits 형식을 따릅니다.

```
<type>(<scope>): <요약>

예) feat(sensor): CO2 서지 감지 히스테리시스 추가
    fix(ci): ruff I001 import 정렬 수정
    docs(portfolio): DX 문서 API 개수 정정
```

- type: `feat` · `fix` · `docs` · `refactor` · `test` · `chore` · `ci`
- 요약은 명령형·현재형으로 간결하게.

## 코드 품질

- 커밋 전 `make check` (ruff lint + pytest) 통과.
- `pre-commit` 훅이 trailing whitespace·대용량 파일(10MB↑)·개인키·`.env` 커밋을 자동 차단합니다.
- 파이썬은 Ruff(E·F·W·I) 규칙을 따릅니다 — `make format` 으로 자동 정리.

## 보안 원칙

- **`.env` 파일은 절대 커밋하지 않습니다.** 실제 API 키·비밀번호는 `.env.example` 에 넣지 않습니다(플레이스홀더만).
- 공인 IP·인스턴스 ID·개인정보(이메일·전화·학번)를 코드/문서에 남기지 않습니다.
- CI `secret-scan` 잡과 로컬 pre-commit 훅이 이중으로 방어합니다.
