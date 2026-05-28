# LG ThinQ Workspace Sentinel

> 감염병 사전 예측 기반 사무실 공간 자동 살균·대응 시스템
> LG DX School 5기 · 5분 대기조 · 2026.05.19 ~ 2026.06.25

## 구조
- `ml/` — REHVA Calculator + XGBoost (박진영)
- `backend/` — FastAPI + TimescaleDB (박진)
- `pipeline/` — 외부 신호 수집기 + Multi-MCP (윤재영)
- `frontend/` — Streamlit/Next.js 대시보드 (조근범)
- `infra/` — Docker Compose + nginx + CI (정욱현)
- `docs/` — 산출 문서

## 빠른 시작
```bash
cp infra/.env.example .env
# .env 값 채우기
docker compose -f infra/docker-compose.yml up -d
```

## 개발 규칙
- `feature/*` → `develop` → `main` (PR 필수)
- main 직푸시 금지
- `.env` 절대 commit 금지

## 인프라
- VM: GCP e2-standard-2 (uis-capstone, 34.47.113.176)
- DB: TimescaleDB schema `sentinel` (UIS와 공유 인스턴스)
- 포트: 8003 (API) / 3001 (Grafana) / 8010~8013 (MCP)
