# 프론트 ↔ 백엔드 실연동 배선 공유 (→ YJY)

> 2026-06-08 · 박진영(PL) · PR #43 develop 머지 완료

## 무엇을 했나
YJY 프론트(`feature/frontend-초기세팅`) 위에 **백엔드(:8003) 실데이터 배선**을 붙여서 develop에 머지했어.

- **`frontend/lib/useSentinel.ts`** (신규): 재사용 데이터 훅
  - `useLiveWard("ward_a")` — 실센서 SSE 실시간 (tier/CO₂/온습도/PM2.5)
  - `useSpacesOverview()` — 전 병동 위험도 폴링
  - `useCowayStatus()`, `useAcStatus()` — 가전 상태
  - `sendControl(action)` — 가전 제어
- **`FloorPlan.tsx`**: 201호(=ward_a)만 실센서 LIVE, "● 실센서 LIVE" 뱃지. 나머지 11호실은 시드
- **`family/page.tsx`**: 병실 환경(온습도·PM2.5)을 실센서 SSE로

## ⚠️ YJY가 해줄 것
1. **develop을 pull 받아서 작업 이어가** — 너 브랜치가 이제 develop보다 뒤처졌어
   ```
   git checkout feature/frontend-초기세팅
   git merge origin/develop   # 또는 rebase
   ```
   (충돌 나면 frontend/ 는 네 최신을 우선, lib/useSentinel.ts 는 유지)

## 배선 패턴 (다른 페이지도 붙일 때)
프록시(`next.config.mjs`)가 이미 있어: `/api/sentinel/*` → 백엔드 `:8003/api/v1/*`
```tsx
import { useLiveWard, useSpacesOverview } from "@/lib/useSentinel";
const { data: live } = useLiveWard("ward_a");   // live.tier, live.co2_ppm, live.temp_c ...
const spaces = useSpacesOverview();             // [{space_name, tier, source, ...}]
```

## 실데이터 / 시드 구분 (정직하게)
- 실센서는 **ward_a(201호) 1개뿐** → 거기만 실데이터, 나머지는 `source:'시뮬'` 라벨
- 센서 더 사면(MH-Z19B 등) `useSpacesOverview`로 전체 호실 실데이터화 가능 — 훅은 이미 준비됨

## 아직 백엔드 API 없는 것 (목업 유지해도 됨)
환자 바이탈·ESG/비용 차트·로그인 인증 → 백엔드 엔드포인트 미존재

## 디자인 개선안 참고
`docs/설계서/디자인_개선안_2026-06-08.md` — 색맹안전 상태색, 보호자앱 "안심 기본", 타임스탬프 등. 프론트 반영하면 좋음.
