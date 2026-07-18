# ThinQ Workspace Sentinel — 개발 태스크
# 사용: make <target>   (make help 로 전체 목록)

.DEFAULT_GOAL := help
PY := .venv/bin/python
PIP := .venv/bin/pip
RUFF := .venv/bin/ruff
PYTEST := .venv/bin/pytest

.PHONY: help
help: ## 사용 가능한 명령 목록
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ── 환경 ──────────────────────────────────────────────────────────────────────
.PHONY: venv
venv: ## 파이썬 가상환경 생성(.venv)
	python3 -m venv .venv

.PHONY: install
install: ## 백엔드 의존성 + 개발도구 설치
	$(PIP) install -r backend/requirements.txt
	$(PIP) install -e ".[dev]"

.PHONY: install-frontend
install-frontend: ## 프론트엔드 의존성 설치
	cd frontend && npm ci

# ── 품질 ──────────────────────────────────────────────────────────────────────
.PHONY: lint
lint: ## Ruff 린트(backend·pipeline)
	$(RUFF) check backend pipeline

.PHONY: format
format: ## Ruff 자동 정렬·포맷
	$(RUFF) check --fix backend pipeline
	$(RUFF) format backend pipeline

.PHONY: test
test: ## 백엔드 단위테스트(pytest)
	$(PYTEST)

.PHONY: smoke
smoke: ## 5개 시나리오 스모크 테스트
	PYTHONPATH=. $(PY) tests/smoke_scenarios.py

.PHONY: test-frontend
test-frontend: ## 프론트엔드 테스트(Jest/RTL)
	cd frontend && npm test -- --ci

.PHONY: check
check: lint test ## 커밋 전 통합 체크(lint + test)

# ── 실행 ──────────────────────────────────────────────────────────────────────
.PHONY: run-backend
run-backend: ## 백엔드 개발 서버(FastAPI :8103)
	$(PY) -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8103

.PHONY: run-frontend
run-frontend: ## 프론트엔드 개발 서버(Next.js :3000)
	cd frontend && npm run dev

.PHONY: up
up: ## 전체 스택 기동(docker compose dev)
	docker compose -f infra/docker-compose.dev.yml up -d

.PHONY: down
down: ## 전체 스택 종료
	docker compose -f infra/docker-compose.dev.yml down

# ── 정리 ──────────────────────────────────────────────────────────────────────
.PHONY: clean
clean: ## 캐시·빌드 아티팩트 정리
	find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache .ruff_cache
