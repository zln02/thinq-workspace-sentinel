# 저장소 재구조화 플랜 (Repo Restructure Plan)

> 작성: 2026-06-23 · 상태: **발표 후 깨끗한 develop에서 실행 예정**
> 원칙: 돌아가는·테스트된 코드는 안 건드린다. 클러터(중복·산만한 단일파일 디렉토리)만 정리한다.

---

## 0. 왜 "지금 당장 전체 이동"을 안 했나 (반드시 읽을 것)

분석 결과 전면 디렉토리 이동은 **위험만 크고 이득이 없음**:

1. **backend <-> pipeline 강결합**: 교차 import 50곳+, `tests/` 11개 파일이 전부
   `backend.*` / `pipeline.*` 모듈 경로에 의존. 이름만 바꿔도 전부 수정해야 함.
2. **인프라가 평면 구조 전제**: `backend/Dockerfile`(COPY backend, pipeline),
   `infra/docker-compose*.yml`(`../backend`, `../pipeline`), `.github/workflows/ci.yml`
   (`ruff check backend pipeline`, `PYTHONPATH=repo root`), `infra/nginx-sentinel.conf`.
3. **머지 충돌 위험**: 실행 시점에 develop에 커밋 안 된 변경 다수 + 활성 feature 브랜치 18개.
   파일을 옮기면 팀원 작업과 충돌 폭발. -> **develop이 깨끗할 때(전원 커밋/머지 후) 실행.**

결론: `backend/ pipeline/ tests/ frontend/ migrations/ infra/ scripts/` 는 **현 위치 유지**.
정리 대상은 **단일파일 디렉토리 통합 + docs 정리 + 하드코딩 경로 수정**.

---

## 1. 이미 완료한 안전 정리 (2026-06-23, 메인 트리)

- [x] `__pycache__` / `*.pyc` / `.pytest_cache` / `.DS_Store` 제거
- [x] `backend_uvicorn.log` / `frontend_dev.log` truncate
- [x] `docs/발표/deck_site/` 의 중복 docx 2개 제거 (원본은 `docs/설계서/` 보존, md5 동일 확인)

## 2. 발표 후 실행 (clean develop, 별도 PR)

### 2-A. 최상위 단일파일 디렉토리 통합 (import 영향 없음 — 확인됨)
```bash
# edge/ 신설: 라즈베리파이/엣지 디바이스 코드 한 곳으로
git mv camera  rpi/camera          # camera/counter.py (importer 없음)
git mv tools/occupancy_cam.py rpi/occupancy_cam.py
# 부하테스트는 scripts로
git mv tools/loadtest.py scripts/loadtest.py
rmdir tools 2>/dev/null
# 디자인 mockup -> docs 산하
git mv design docs/design
# ml/ 은 코드 없이 README 포인터뿐 -> docs로 흡수
git mv ml/README.md docs/ml-pointer.md && rmdir ml
```
> 위 대상은 모두 **다른 코드가 import하지 않음**(매핑으로 확인). 단순 이동 + 참조 grep만.

### 2-B. docs 정리
- `docs/설계서/` docx 버전 정리: 캐논은 **검증판**(구현 대조 완료본) 1개로 명시,
  나머지(v2 46K, 완성본, O반O팀, 요구사항정의서)는 `docs/설계서/_versions/`로 이동.
- `docs/발표/deck_site/Workspace_Sentinel.pptx`(8.5M, generate_pptx 산출물) -> `docs/발표/`로 올리거나
  `.gitignore`에 추가(산출물). 덱은 .dc.html 본체라 pptx는 export 부산물.
- `docs/발표/deck_site/_archive`(364K 구버전 HTML) / `_ref`(15M cx_ref.pdf) -> 이미 gitignore.
  보존 불필요 시 삭제로 디스크 15M 회수.

### 2-C. 하드코딩 절대경로 -> 상대경로 (이식성)
- `intro-video/server.mjs`: `const ROOT="/home/ubuntu/.../intro-video"`
  -> `path.dirname(fileURLToPath(import.meta.url))`
- `docs/발표/deck_site/generate_pptx.py`: `ASSETS`/`OUT` 절대경로 -> `Path(__file__).parent` 기준

### 2-D. README 갱신
- 최상위 구조 표 + 각 디렉토리 1줄 목적 + 서버 포트 맵(8080 덱 / 3100 프론트 / 8090 인트로 /
  8103 센서API / 18001 UIS) 반영.

## 3. 절대 건드리지 않음 (NO-TOUCH)
`backend/` `pipeline/` `tests/` `frontend/`(node_modules 포함) `migrations/` `infra/`
`.github/` `.venv/` — 코드 패키지 구조·도커·CI·nginx가 의존. 이동 시 순손실.

## 4. 실행 체크리스트 (2-A~2-D 후)
- [ ] `grep -rn "from camera\|import camera\|tools/\|design/" --include=*.py --include=*.mjs --include=*.json .` -> 잔여 참조 0 확인
- [ ] `PYTHONPATH=. pytest tests/ -q` 통과
- [ ] 8090 인트로 서버 재시작 후 정상(상대경로화 검증)
- [ ] `generate_pptx.py` 재실행 정상
- [ ] README 포트/구조 표 최신화
- [ ] PR -> develop (팀원 동기화 후)
