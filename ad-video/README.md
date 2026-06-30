# ThinQ Space Sentinel — 부스 루프 광고 (Remotion)

CES/발표 부스 **무한루프** 홍보영상. 68초 · 1920×1080 · H.264 · 무음에서도 자막 완결.
**목업(라이브 대시보드) 중심 — 인물 없음.** 확대/축소/커서 클릭 인터랙션 + 페르소나 뷰 + UIS 회전 모션그래픽.

## 결과물
- `out/sentinel-ad.mp4` — 최종 영상 (USB → 부스 화면 반복재생)

## 재렌더
```bash
npm run render      # out/sentinel-ad.mp4 (concurrency 최대 = 코어수 4)
npm run dev         # Remotion Studio 미리보기
```

## 8컷 구성 (src/cuts/)
1. 보이지 않는 위협 (센서 목업 다크+파티클)
2. 한 번 번지면 병동 전체 (간호사 관제 목업 팬+ALERT 펄스)
3. ★UIS 모델 — 3신호(호흡기·행동·환경) 학습 → 실제 확진 선행 추적 (회전 모션그래픽)
4. 위험이 닿기 전에 먼저 (역학 목업, 커서 클릭→발령, 가전 대기 = 1단계)
5. ★증상 전에 공간이 먼저 (3D 병동 + 코웨이 콘솔 PiP, 가전 자동가동 = 2단계)
6. 역할마다 하나의 플랫폼 (간호사·시설관리자·병원장·보호자 페르소나 몽타주)
7. 브랜드 클로징 (ThinQ Space Sentinel 로크업 + 태그라인)
8. 정직성 고지 엔드카드 → 루프

## 라이브 목업 캡처
`public/live/*.png` = http://54.116.75.169:3100 실시간 캡처 (playwright/CDP).
재캡처: `node $JOBTMP/shot2.mjs`(데모 3화면+발령) / `shot3.mjs`(admin/admin 세션주입 → 페르소나 4종).
demo 3화면(epidemic/control/sensor)은 공개, 페르소나 대시보드는 admin/admin 로그인.

## 정직성 가드레일 (수정 금지)
- 선행성/정확도(F1 0.907 등)는 **외부 조기경보 시스템(UIS)** 모델 성능. 예측=UIS, Sentinel=라스트마일.
- "15~43일·16시도" 자체DB 순환 → 사용 금지. 약국 단독 클레임도 비노출(UIS 3신호 모델로 표현).
- 실증 가전 = **코웨이 공기청정기 1종 · 시연구간 201호**. 그 외 시뮬. LG ThinQ 지향(제어 단정 금지).
- "예측/예방/진단" 단정 금지. 의료기기 아님. 영상 비저장(인원수만). PoC.

## 퀄리티 스택
@remotion/transitions 크로스디졸브 · 오로라 배경 · 필름그레인 · 마스크 텍스트 리빌 · crf 18 / jpeg 96.

## 오디오 입히기 (Phase 2)
Supertone VO + Suno BGM → `public/audio/`(s1~s7.mp3, bgm.mp3) → `src/SentinelAd.tsx` 오디오 블록 활성화 → 재렌더.
