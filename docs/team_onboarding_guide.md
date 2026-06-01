# ThinQ Workspace Sentinel · 팀 온보딩 가이드

> LG DX School 5기 · **5분 대기조** · 2026.05.19 ~ 06.25 (6주 PoC)
> 발행: 2026-06-01 · 인프라 W2 완료 시점

## 0. 한 줄 소개

요양병원 RSV·인플루엔자·노로를 **3주 전에 예측**해서 LG ThinQ 가전 8종이 자동 환경 제어하는 시스템.

### UIS와의 관계 (중요)

- **UIS (Urban Immune System, `~/urban-immune-system/`)** 는 **다른 캡스톤 팀**이 운영하는 외부 데이터 시스템임.
- UIS가 KOWAS·DataLab·OTC 등 외부 감염병 신호를 정제해서 TimescaleDB(`urban_immune` DB)에 적재 → 우리 Sentinel이 **read-only 로 소비**.
- 우리 5분 대기조의 작업물은 모두 `sentinel` 스키마 안에서만 생성/수정. UIS 스키마는 절대 건드리지 않음.
- VM은 UIS 팀과 공유(GCP `uis-capstone`). 포트·디렉토리·DB 스키마로 완전 분리.

---

## 1. VM 접속

| 항목 | 값 |
|---|---|
| 호스트 | `uis-capstone` (GCP e2-standard-2, VM 공유) |
| IP | `34.47.113.176` |
| 공용 계정 | `wlsdud5035` (박진영 — Tech Lead) |
| 접속 | `ssh wlsdud5035@34.47.113.176` |
| **SSH 키 등록** | 박진영에게 본인 공개키 (`~/.ssh/id_ed25519.pub`) 전달 → `~/.ssh/authorized_keys` 추가 |

### 작업 디렉토리

```
/home/wlsdud5035/
├ thinq-workspace-sentinel/   ← 우리 5분 대기조 메인 작업
│   ├ backend/      Backend 담당
│   ├ frontend/     Frontend 담당
│   ├ pipeline/     Data 담당
│   ├ ml/           ML 담당 (박진영)
│   ├ infra/        DevOps 담당
│   ├ docs/         공용 (박진영 관리)
│   └ migrations/   공용 (Backend 주도)
│
└ urban-immune-system/        ← 다른 팀 (UIS) · read-only 참조만
```

---

## 2. 역할 분담 (5분 대기조)

> 이름란은 박진영(Tech Lead)이 실제 5분 대기조 멤버 이름으로 채울 것.

| 모듈 | 담당 | 핵심 작업 (W3~W6) | 의존 모듈 |
|---|---|---|---|
| **`ml/`** | **박진영** (Tech Lead · ML) | XGBoost+TFT 하이브리드, REHVA 계산기, 5-Tier 모델, 전체 아키텍처 | pipeline (외부신호) |
| **`backend/`** | **〈Backend 담당〉** | FastAPI 확장, Smart Protocol 풀구현, ThinQ Mock 통합, DB 쿼리 최적화 | ml, pipeline |
| **`pipeline/`** | **〈Data 담당〉** | UIS DB 조회 어댑터, Kafka 토픽 구독, 시뮬레이터 시나리오 추가 | infra |
| **`frontend/`** | **〈Frontend 담당〉** | Next.js 대시보드, 5-Tier 시각화, 보호자 카톡 알림 UI | backend |
| **`infra/`** | **〈DevOps/QA 담당〉** | docker-compose 마무리, GitHub Actions CI, 부하 테스트, 모니터링·알람 | 전체 |

### 권한 메모

- **박진영(Tech Lead)** 은 모든 모듈 풀(full) 권한. 다른 모듈 직접 수정·머지 가능.
- 그 외 팀원은 자기 모듈에서만 작업, 타 모듈은 PR로 요청.
- **UIS 스키마(`public`, UIS 팀 테이블)는 누구도 수정 금지** — read-only.

---

## 3. 첫날 셋업 (15분)

```bash
# 1) SSH 접속
ssh wlsdud5035@34.47.113.176

# 2) 우리 프로젝트로 이동 (UIS 디렉토리 X)
cd ~/thinq-workspace-sentinel

# 3) develop 동기화 + 본인 feature 브랜치 생성
git checkout develop && git pull
git checkout -b feature/<모듈>-<기능>-w3
# 예) feature/backend-thinq-control-w3
# 예) feature/frontend-tier-dashboard-w3

# 4) 가상환경 활성화 (Python 작업자만)
source /home/wlsdud5035/.venv-sentinel/bin/activate

# 5) 헬스체크
curl http://127.0.0.1:8003/health
# → {"db":"up", "redis":"up", "simulator":"up"}

# 6) 시뮬레이션 한 번 돌려보기
curl -X POST http://127.0.0.1:8003/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario":"summer_norovirus","minutes":60}'
```

---

## 4. 현재 가동 중인 서비스

| 서비스 | 컨테이너/프로세스 | 포트 (localhost) | 소유 | 비고 |
|---|---|---|---|---|
| TimescaleDB | `uis-timescaledb` | 5432 | **UIS 팀** | 공유 (sentinel 스키마로 분리) |
| Kafka | `uis-kafka` | 9092 | **UIS 팀** | 공유 (read-only 구독) |
| Qdrant | `uis-qdrant` | 6333 | **UIS 팀** | 공유 (우리는 미사용) |
| Redis | `sentinel-redis` | 6380 | **우리** | W2 신규 |
| FastAPI | uvicorn 프로세스 | 8003 | **우리** | /health · /api/v1/* |

**우리 DB 스키마 접속**:
```bash
docker exec -it uis-timescaledb psql -U uis_user -d urban_immune
\dt sentinel.*   # 우리 테이블만. UIS 테이블(public.*)은 건드리지 말 것.
```

---

## 5. Git 워크플로 (반드시 준수)

```
feature/<모듈>-<기능> → develop → main
```

- ❌ `main` · `develop` 직접 push 금지
- ❌ `.env` 절대 commit 금지 (이미 `.gitignore`)
- ❌ UIS 디렉토리(`~/urban-immune-system/`) 수정 금지
- ✅ PR 본문에 "어떤 모듈 · 왜 · 테스트 결과" 3줄 필수
- ✅ 본인 모듈 머지 후 발견된 버그는 본인이 핫픽스
- ✅ PR 리뷰 SLA 24h 내 1차 응답

---

## 6. 주차별 마일스톤 (W3~W6)

| 주차 | 공동 목표 | 모듈별 핵심 |
|---|---|---|
| **W3** (6/2~8) | 외부신호 → 예측 → 시뮬 통합 | pipeline: UIS DB 어댑터 / ml: XGBoost / backend: API 연결 |
| **W4** (6/9~15) | Smart Protocol + 75초 시연 영상 | backend: 정책 / frontend: 대시보드 / ml: 5-Tier |
| **W5** (6/16~22) | 다층 게이트·자동 해제 | ml: FAR 검증 / backend: 알림 / infra: CI |
| **W6** (6/23~25) | 최종 발표·문서 | 전체 발표 자료·PPT·시연 영상 |

---

## 7. 디버깅 첫 5가지

1. **API 죽었을 때**: `ps aux | grep uvicorn` → 없으면 `cd ~/thinq-workspace-sentinel && PYTHONPATH=. uvicorn backend.api.main:app --port 8003 &`
2. **Redis 죽었을 때**: `docker start sentinel-redis`
3. **DB 마이그레이션 재적용**: `docker exec -i uis-timescaledb psql -U uis_user -d urban_immune < migrations/002_nursing_home_pivot.sql`
4. **시뮬레이션 결과 이상**: `pipeline/simulator/space.py:tier()` 임계값 확인
5. **포트 충돌**: UIS는 5432·9092·6333·8001 / Sentinel은 5432(sentinel 스키마만)·8003·6380 — UIS 컨테이너에 새 마이그레이션 던지지 말 것

---

## 8. 학술·법적 근거 (Q&A 대비)

- **REHVA** COVID-19 guidance v4.1 — Wells-Riley 방정식
- **Kim et al. 2025** (Applied Sciences 15:9145) — 5-Tier 분류
- **Lowen 2007** (PNAS) — 저온저습 인플루엔자 안정성
- **Buonanno 2020** — COVID quanta rate
- **KCDC** 요양병원 감염관리 지침
- **9개 법령** 매핑: `docs/legal/nursing_home_compliance_matrix.md`

---

## 9. 핵심 명령어 치트시트

```bash
# 시뮬레이션 5종 모두 검증
for s in winter_influenza spring_tb summer_norovirus autumn_covid heatwave_norovirus_double; do
  curl -s -X POST http://127.0.0.1:8003/api/v1/simulate \
    -H "Content-Type: application/json" -d "{\"scenario\":\"$s\",\"minutes\":120}" \
    | python3 -c "import json,sys; r=json.load(sys.stdin); print(f\"$s: {r['initial']['tier']} → {r['final']['tier']} (PoI {r['initial']['poi']:.3f} → {r['final']['poi']:.4f})\")"
done

# 도커 컨테이너 상태
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 우리 스키마만 보기
docker exec -it uis-timescaledb psql -U uis_user -d urban_immune -c "\dt sentinel.*"
```

---

## 10. 연락처·소통

- **Slack 채널**: `#sentinel-dev` (가칭, 박진영이 개설)
- **데일리 스탠드업**: 매일 21:00 (KST) 10분, 모듈별 1줄
- **블로커 즉시 보고**: 24h 이상 막히면 박진영에게 DM
- **PR 리뷰 SLA**: 24h 내 1차 리뷰
