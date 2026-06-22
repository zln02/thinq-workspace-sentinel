# 백엔드 클라우드 배포 — Koyeb (VM·PC 완전 독립)

> 목표: 라즈베리파이 → **Koyeb의 FastAPI** → **Supabase Postgres**.
> GCP VM도, 개발 PC도 켜둘 필요 없음. 라파이만 인터넷 되면 24시간 동작.

```
[라파이] --HTTPS--> [Koyeb: FastAPI :PORT] --asyncpg--> [Supabase(서울)]
                          └ 대시보드는 Vercel(별도) 또는 로컬
```

## 0. 사전 준비 (이미 완료된 것)
- Supabase 프로젝트 `thinq-sentinel` 생성 + 마이그레이션 5종 적용 완료.
- 백엔드 클라우드 대응 코드 반영 (이 브랜치):
  - `Dockerfile`: `CMD` 가 `${PORT}` 동적 바인딩 (호스트가 주입).
  - `main.py`: Redis 선택적 — `REDIS_URL` 없으면 비활성, `/health` 는 DB만 필수.

## 1. Koyeb 가입 & GitHub 연결
1. https://app.koyeb.com → GitHub 로 가입 (카드 불필요, 무료 1서비스).
2. **Create Web Service → GitHub** → `zln02/thinq-workspace-sentinel` 선택.
3. Branch: 이 배포 브랜치(또는 머지 후 `develop`).

## 2. 빌드 설정 (Dockerfile)
- Builder: **Dockerfile**
- Dockerfile location: `backend/Dockerfile`
- Work directory: (비움 = 저장소 루트) — Dockerfile 이 루트 기준 `COPY backend`, `COPY pipeline` 하므로 **반드시 루트 컨텍스트**.
- Instance: **Free** / Region: **Washington 또는 Frankfurt** (Koyeb 무료 리전; Supabase 서울과 떨어져도 PoC 지연은 무시 가능).

## 3. 환경변수 (Settings → Environment)
| 키 | 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | 아래 **풀러** 문자열 | ⚠️ 직결 아님 |
| `CORS_ORIGINS` | `https://<vercel-도메인>` | 프론트 별도 호스팅 시 |
| `SENTINEL_API_KEY` | 임의 랜덤문자열 | (선택) POST 인증 |
| `ADMIN_CONTROL_PW` | 임의 비번 | (선택) 제어모드 |

> `REDIS_URL` 은 **설정하지 않음** → Redis 자동 비활성(정상).

### ⚠️ DATABASE_URL 은 반드시 "Session Pooler" 사용
백엔드는 `asyncpg` 영속 풀 + prepared statement 를 쓴다. Supabase **직결**(`db.<ref>.supabase.co`)은 IPv6 전용이라 다수 클라우드에서 막히고, **Transaction 풀러(:6543)** 는 prepared statement 미지원으로 asyncpg 가 깨진다. → **Session 풀러(:5432)** 를 써야 한다.

```
postgresql://postgres.agjcclpqxhmuntgzarte:[DB비밀번호]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```
- `[DB비밀번호]` = Supabase 대시보드 → **Settings → Database → Database password** (생성 시 1회 표시, 모르면 *Reset database password*).
- 정확한 풀러 호스트/문자열은 Supabase → **Connect** 버튼 → **Session pooler** 탭에서 복사.

## 4. 배포 & 확인
1. **Deploy** → 빌드 로그 확인 (pip install → uvicorn 기동).
2. 발급된 공개 URL `https://<app>.koyeb.app` 로:
   ```
   curl https://<app>.koyeb.app/health
   # → {"db":{"status":"up",...}, "redis":{"status":"disabled"}, "overall":"ok"}
   ```
3. `overall: ok` 면 성공.

## 5. 라즈베리파이 전환
`~/sentinel-bridge/bridge.env`:
```
SENTINEL_API=https://<app>.koyeb.app/api/v1/sensor/reading
```
재시작: `sudo systemctl restart sentinel-bridge`

## 6. (선택) 대시보드도 Vercel 로 → PC 완전 제거
- Vercel → `frontend/` import, `NEXT_PUBLIC_API_BASE_URL=https://<app>.koyeb.app`.
- 라파이 키오스크 URL(`SENTINEL_DASHBOARD`)을 Vercel 주소로 변경.

## 트러블슈팅
- **빌드 실패(COPY 못 찾음)**: Work directory 가 루트인지 확인 (backend/ 아님).
- **`/health` db down**: DATABASE_URL 이 직결/Transaction 풀러임 → Session 풀러(:5432)로 교체.
- **포트 안 열림**: Koyeb 가 주입한 `$PORT` 로 바인딩되는지 — shell 형식 `CMD` 확인.
