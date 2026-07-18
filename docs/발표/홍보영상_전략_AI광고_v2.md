# ThinQ Space Sentinel — AI 홍보영상 제작 패키지 (전략 재수립 v2)

> 작성 2026-06-23 · 용도 **CES 부스 루프 (60~75초, 무한 반복)** · 제작 **AI 영상 생성 + 컷편집**
> VO=Supertone · BGM=Suno · 영상=AI 텍스트→비디오 툴(Kling/Veo/Runway/Higgsfield 등)
> 새 VM 데모 URL: **http://<DEMO_VM_HOST>:3100** (구 <DEMO_VM_HOST> 폐기)
> ⚠️ 전제: "실제 광고영상" 퀄리티 = 데이터 슬라이드쇼❌ / 인간 스토리 + 제품 히어로 + 한 방 데이터 ⭕
> ⚠️ 과대포장=즉사. 모든 카피는 아래 §2 가드레일 통과분만.

---

## 1. 전략 한 줄 + 포맷

**한 줄 정의**
> "지역 감염이 병원에 닿기 **몇 주 전**, 외부 신호를 읽고 공간이 **스스로 먼저** 방역을 준비하는 요양병원 감염관리 시스템."

| 항목 | 값 |
|---|---|
| 용도 | CES 부스 루프 (무대 뒤 대형 화면, 무한 반복) |
| 길이 | 68초 (60~75초) |
| 해상도 | 1920×1080 (부스 화면에 맞춰 4K 업스케일 가능) |
| 사운드 | 있음(Supertone VO + Suno BGM) — 단 **무음에서도 자막으로 완결** |
| 톤 | 프리미엄 헬스케어-테크. 따뜻하지만 절제. (LG/삼성 제품필름 톤) |
| 루프 | 마지막 컷(따뜻한 아침) → 첫 컷(새벽) 자연 연결 |

---

## 2. 🔴 정직성 가드레일 (이번에 교정된 핵심)

| 폐기 ❌ | 교체 ✅ |
|---|---|
| **"15~43일 먼저" / "16·17개 시도 검증"** | 자체 DB 기반이라 검증 시 **순환·과적합**(합성 seed, target=자기자신, F1=1.0 in-sample). 광고 사용 금지. |
| "검색량으로 선행 예측" | 검색(L3)은 **후행**. 하수(L2)는 **동시**. 선행 근거로 쓰지 말 것. |
| "감염을 예측/예방/진단" | "감염 위험을 가시화 + 선제 대응 / 의사결정 보조. 의료기기 아님." |
| "LG·삼성 가전 제어"(단정) | **실증=코웨이 공기청정기 1종**. 타 가전은 제어계획(시뮬). 벤더무관 SW 레이어. |
| "전 병동 제어" | 현재 **시연 구간(201호)**. 다중 병동 확장 중. |

**✅ 광고에 쓸 수 있는 단 하나의 검증된 선행 데이터 (S3 핵심):**
> **약국 감기약 판매가 인플루엔자 확진 피크보다 평균 6~7주 먼저 움직인다.**
> 근거: WHO FluNet 한국 인플루엔자 양성률(임상 truth) × 실제 네이버 쇼핑 감기약 판매(2017~), Granger 단방향 인과 검정 통과(순방향 p=0.011, 역방향 비유의). → "약국에서 감기약이 팔리면 6주 뒤 병원이 위험" = 강하고 정직한 한 방.

**필수 엔딩/하단 고지 자막:**
- "실증 가전 = 코웨이 공기청정기 1종 · 타 가전 제어계획(시뮬)"
- "선행성: 약국 신호 기준 실데이터 검정 · 광역 예측은 외부 조기경보 시스템"
- "영상 비저장 — 카메라는 인원수만 추출 · PoC 단계 · 파일럿 문의"

---

## 3. 메시지 3축 (절대 흔들지 말 것)
1. **선제성** — 외부 신호(약국 6~7주 선행 실증)로 위험이 닿기 전에 감지
2. **자동 대응** — 위험도 계산 → 가전 비례 제어(항상 최대 아님), 사람 개입 없이
3. **신뢰** — 모든 대응 자동 기록 = 감염관리 증빙(적정성평가), 정직한 한계 공개

---

## 4. 스토리보드 (8컷 / 68초) — 씬별 AI 영상 프롬프트 + VO + 자막

> AI 영상 프롬프트는 영어(텍스트→비디오 모델 최적). 각 컷 4~10초 클립 생성 후 컷편집에서 이어붙임.
> "REAL ASSET" = AI 말고 실제 대시보드 화면녹화/병동 렌더를 인서트.

### CUT 1 — 후크: 보이지 않는 위협 (0:00–0:08)
- **AI 프롬프트:** `Cinematic slow push-in, a quiet nursing hospital ward at dawn, soft cool blue light through blinds, an elderly patient sleeping peacefully in a clean bed. Almost-invisible fine particles drift slowly in the air, catching faint light. Calm but subtly unsettling mood, shallow depth of field, premium medical documentary look, 4k, gentle camera move.`
- **VO (S1):** "요양병원이 가장 두려워하는 것. 눈에 보이지 않는, 공기 속 감염입니다."
- **자막(대형):** 보이지 않는 위협

### CUT 2 — 인간적 무게 (0:08–0:16)
- **AI 프롬프트:** `Cinematic, a single nurse alone at a dimly lit nursing station at 3am, soft glow of monitors on her tired face, long corridor with many patient room doors stretching behind her. Sense of one person responsible for many lives. Warm-cool contrast, realistic, emotional, slow dolly.`
- **VO (S2):** "간호사 한 명이 수십 명을 돌보는 새벽. 한 번 번지면, 병동 전체가 멈춥니다."
- **자막:** 한 번 번지면, 병동 전체

### CUT 3 — ★데이터 한 방: 약국 6주 선행 (0:16–0:30)
- **AI 프롬프트:** `Cinematic close-up of a hand picking up a box of cold medicine at a brightly lit pharmacy counter, then a smooth match-cut/dissolve into a calendar with pages flipping forward, ending on a hospital exterior. Clean, modern, data-story feel, warm lighting transitioning to clinical.`
- **REAL ASSET 오버레이:** 화면 위에 미니 라인차트 모션(약국 곡선 → 6주 뒤 확진 곡선) — 모션그래픽
- **VO (S3):** "신호는 먼저 옵니다. 약국에서 감기약이 팔리기 시작하면, 평균 6주 뒤 병원이 위험해집니다."
- **자막(대형):** 약국 감기약 → **6주 뒤** 병원 / (소) WHO FluNet × 실판매 데이터 검정

### CUT 4 — 시스템이 읽는다 (0:30–0:40)
- **AI 프롬프트:** `Premium tech visualization, a glowing data control room, multiple live data streams (pharmacy sales, wastewater, search, weather, public-health) flowing as luminous lines converging into a single calm hub. Dark UI aesthetic, teal and blue accents, cinematic, futuristic but trustworthy.`
- **REAL ASSET 인서트:** 실제 역학 지도 대시보드(epidemic) 화면녹화 1~2초
- **VO (S4):** "Sentinel은 약국과 하수, 검색, 기온 같은 외부 신호를 실시간으로 읽고, 실내 센서와 합칩니다."
- **자막:** 외부 신호 + 실내 센서

### CUT 5 — ★선제 가동: 공간이 먼저 (0:40–0:52)
- **AI 프롬프트:** `Cinematic, a hospital room subtly transforms on its own: an air purifier's indicator light softly turns on, gentle airflow visualized as faint clean streams, the room's color temperature warms from cold blue to a safe calm teal. No human pressing buttons. Serene, "the space wakes up to protect", premium product-film look.`
- **REAL ASSET 인서트:** 실제 관제 대시보드 tier 상승 + 코웨이 공청기 TURBO 가동 화면녹화
- **VO (S5):** "위험을 계산해, 센서가 정상이어도 공기 청정과 환기를 미리 가동합니다. 사람의 개입 없이."
- **자막:** 증상 전에, 공간이 먼저

### CUT 6 — 근거·기록 (0:52–0:58)
- **AI 프롬프트:** `Clean elegant motion of a digital report/log being generated on a tablet, neat rows of timestamped entries forming, a calm family member glancing at a reassuring notification on a phone. Soft warm light, trustworthy, minimal.`
- **VO (S6):** "모든 대응은 자동으로 기록돼, 감염관리 증빙으로 남습니다."
- **자막:** 모든 대응이 증빙으로

### CUT 7 — 클로징/브랜드 (0:58–1:06)
- **AI 프롬프트:** `Pull-back reveal of the same elderly patient now resting safely as warm morning sunlight fills the clean ward (callback to opening, now warm and safe). Peaceful, hopeful, cinematic.`
- **REAL ASSET:** 마지막 1.5초 로고 카드 — `● Sentinel` + "ThinQ Space Sentinel"
- **VO (S7):** "ThinQ Space Sentinel. 증상이 나타나기 전에, 공간이 먼저 깨어납니다."
- **자막:** 로고 + 태그라인

### CUT 8 — 고지 엔드카드 (1:06–1:08, 루프 직전)
- 검은 배경에 §2 고지 자막 3줄 빠르게 + "파일럿 문의" → 페이드 → CUT1로 루프.

---

## 5. Supertone VO 전체 스크립트 (이대로 한 컷씩 녹음)
> 보이스: 차분·신뢰감 한국어 내레이터, 속도 0.97×. 부스 루프라 마지막이 첫 톤으로 회귀.

1. "요양병원이 가장 두려워하는 것. 눈에 보이지 않는, 공기 속 감염입니다."
2. "간호사 한 명이 수십 명을 돌보는 새벽. 한 번 번지면, 병동 전체가 멈춥니다."
3. "신호는 먼저 옵니다. 약국에서 감기약이 팔리기 시작하면, 평균 6주 뒤 병원이 위험해집니다."
4. "Sentinel은 약국과 하수, 검색, 기온 같은 외부 신호를 실시간으로 읽고, 실내 센서와 합칩니다."
5. "위험을 계산해, 센서가 정상이어도 공기 청정과 환기를 미리 가동합니다. 사람의 개입 없이."
6. "모든 대응은 자동으로 기록돼, 감염관리 증빙으로 남습니다."
7. "ThinQ Space Sentinel. 증상이 나타나기 전에, 공간이 먼저 깨어납니다."

---

## 6. Suno BGM 프롬프트
```
Cinematic emotional ambient, instrumental, no vocals. Soft cool piano intro with subtle heartbeat-like pulse (tension of an invisible threat), building with warm strings and gentle synth pads into a hopeful, protective resolve. Premium healthcare brand film mood — restrained, trustworthy, human. Slow ~78 bpm. Start and end quiet/ambient so it loops seamlessly. Length ~70 seconds.
```
- `[Instrumental]`, 가사 비움. 2~3 variation 뽑아 CUT1(차갑)→CUT7(따뜻) 곡선에 맞는 것 선택.

---

## 7. 제작 워크플로우 (진영님 실행 순서)
1. **AI 영상 생성** — §4 CUT1~7 프롬프트를 텍스트→비디오 툴에 넣어 클립 생성.
   - 추천: **Kling**(사실적 인물/저렴), **Google Veo 3**(고퀄·오디오), **Runway Gen-3**, 또는 **Higgsfield**(크레딧 충전 시 내가 여기서 직접 생성 가능).
   - 인물 클립은 1~2개 variation 더 뽑아 자연스러운 것 선택.
2. **REAL ASSET 녹화** — 새 VM(http://<DEMO_VM_HOST>:3100)에서: ① epidemic 지도, ② 관제 tier 상승+코웨이 TURBO, ③ 센서 그래프. OBS로 화면녹화.
3. **VO** — Supertone에서 §5 7줄 녹음 → mp3.
4. **BGM** — Suno에서 §6 → mp3.
5. **컷편집** — CapCut/Vrew/프리미어에서 클립+인서트+자막+VO+BGM 합성, 68초 타임라인, 루프 연결.
6. **고지 자막** — §2 엔드카드 + 하단 고지 삽입.
7. **검수** — §2 가드레일 전수 체크 후 export(1080p, 부스용 4k 업스케일 옵션).

---

## 8. 필요 실제 에셋 체크리스트
- [ ] epidemic 역학 지도 화면녹화 (외부 신호 흐름)
- [ ] 관제 대시보드 tier 상승 + 코웨이 공청기 TURBO 가동 녹화
- [ ] 실시간 센서 그래프(CO₂) 녹화
- [ ] 로고 에셋(● Sentinel / ThinQ Space Sentinel)
- [ ] (선택) 코웨이 공청기 실물 가동 실사 클립
</content>
