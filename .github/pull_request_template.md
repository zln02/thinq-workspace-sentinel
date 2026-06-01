## 어떤 모듈

<!-- ml / backend / pipeline / frontend / infra / docs 중 -->

## 왜

<!-- 어떤 문제·요구를 해결하는지 1~3줄 -->

## 어떻게 검증했는지

- [ ] 로컬에서 `docker compose -f infra/docker-compose.dev.yml up -d` 통과
- [ ] `curl http://127.0.0.1:8003/health` 가 `up` 응답
- [ ] (해당 시) `curl -X POST /api/v1/simulate` 결과 정상
- [ ] (frontend) 로컬 `npm run build` 통과
- [ ] (해당 시) 새 테스트 추가 또는 기존 테스트 통과

## UIS 경계 확인

- [ ] `~/urban-immune-system/` 디렉토리 미수정
- [ ] `public.*` UIS 스키마 미수정 (변경은 `sentinel.*` 안에서만)

## 비고

<!-- 리뷰어 주목 포인트·트레이드오프·후속 작업 -->
