# 📁 문서 지도 — ThinQ Workspace Sentinel

> 요양병원 공기감염 조기경보 + LG ThinQ 가전 자동방역 (B2G PoC · LG DX School 5기 "오대기")
> **이 파일 하나로 모든 산출물을 찾는다.** 상태: ⭐정본 · 📄참고 · 🗄️구버전(archive)

라이브: http://34.47.113.176/sentinel · 정본 산출문서: [`설계서/최종산출문서_정본_2026-06-09.md`](설계서/최종산출문서_정본_2026-06-09.md)

---

## 📌 발표 · 심사 (`발표/`)
| 파일 | 용도 | 상태 |
|---|---|---|
| [`발표/발표덱_통합본_2026-06-11.pdf`](발표/발표덱_통합본_2026-06-11.pdf) | **최종 발표덱(25p)** · BX/CX/DX 풀스토리 | ⭐ |
| [`발표/발표덱_DX정식_2026-06-11.pdf`](발표/발표덱_DX정식_2026-06-11.pdf) | DX 정식 발표 PDF(20p) | ⭐ |
| [`발표/정직성_프레이밍_QA.md`](발표/정직성_프레이밍_QA.md) | 심사 Q&A 모범답변 · "진단 아님/실측CO2 아님" 방어 | ⭐ 필독 |
| [`발표/벤치마킹_차별성_포지셔닝.md`](발표/벤치마킹_차별성_포지셔닝.md) | 경쟁 5기준 비교 · 차별점 | 📄 |
| [`발표/방어논리_가전제어_정당성.md`](발표/방어논리_가전제어_정당성.md) | 가전 자율제어 정당성 반박논리 | 📄 |
| [`발표/개인정보_아키텍처.md`](발표/개인정보_아키텍처.md) | 영상 비저장·ISMS-P 개인정보 설계 | 📄 |
| [`발표/prior_art_비교_특허방어.md`](발표/prior_art_비교_특허방어.md) | 선행기술 비교·특허 방어 | 📄 |
| [`발표/CX_BX_산출문서_심사정합_체크리스트.md`](발표/CX_BX_산출문서_심사정합_체크리스트.md) | BX/CX 산출 정합 체크 (⚠️ P4/P5/P6 미완) | 📄 |
| [`발표/ROI_감염예방관리료.md`](발표/ROI_감염예방관리료.md) | 감염예방관리료 ROI (수가 [확정필요]) | 📄 |

## 🏗️ 설계 · 아키텍처 (`설계서/`, `architecture/`)
| 파일 | 용도 | 상태 |
|---|---|---|
| [`설계서/최종산출문서_정본_2026-06-09.md`](설계서/최종산출문서_정본_2026-06-09.md) | **통합 정본 산출문서** (요구사항·UC·FR·ERD·정정이력) | ⭐ |
| [`설계서/디자인_개선안_2026-06-08.md`](설계서/디자인_개선안_2026-06-08.md) | 대시보드 UX 개선안 | 📄 |
| [`설계서/ERD.pdf`](설계서/ERD.pdf) | DB ERD (13테이블/4 Hypertable) | ⭐ |
| [`architecture/system_architecture.html`](architecture/system_architecture.html) / `.pdf` / `.png` | 4-Stage 전체 시스템 아키텍처 v1.1 | ⭐ |
| [`architecture/sentinel_expansion_roadmap.html`](architecture/sentinel_expansion_roadmap.html) | 확장 로드맵(도메인 독립 코어) | 📄 |
| [`architecture/sentinel_nursing_hospital_market_sizing_by_region.html`](architecture/sentinel_nursing_hospital_market_sizing_by_region.html) | 시·도별 시장규모·TAM | 📄 |

## ✅ 검증 · 성능 (`test/`)
| 파일 | 용도 | 상태 |
|---|---|---|
| [`test/실무적용성_종합평가_2026-06-08.md`](test/실무적용성_종합평가_2026-06-08.md) | 최종 판정(PoC 가능/납품 갭) + P0/P1/P2 | ⭐ |
| [`test/사전포착_검증_및_실무적용성_평가.md`](test/사전포착_검증_및_실무적용성_평가.md) | 선행 16/17 실증 + end-to-end | ⭐ |
| [`test/부하테스트_결과.md`](test/부하테스트_결과.md) | p95 성능 + cache-stampede 수정 | ⭐ |
| `test/스토리라인.png` · `test/심사기준.png` | 발표 스토리·심사기준 이미지 | 📄 |

## 💼 사업 · 시장 (`business/`)
| 파일 | 용도 | 상태 |
|---|---|---|
| [`business/pricing-model.md`](business/pricing-model.md) | 구독·건당·PoC 3-tier 가격모델 (수가 [확정필요]) | 📄 |

## ⚖️ 법무 · 규제 (`legal/`)
| 파일 | 용도 | 상태 |
|---|---|---|
| [`legal/nursing_home_compliance_matrix.md`](legal/nursing_home_compliance_matrix.md) | 요양병원 9개 법령 준수 매트릭스 | ⭐ |

## 📖 개발 가이드 (`dev/`)
| 파일 | 용도 | 상태 |
|---|---|---|
| [`dev/개발가이드_마스터.pdf`](dev/개발가이드_마스터.pdf) | 전체 스토리라인 10p + 심사기준 매핑 (구 Master_Dev_Guide) | ⭐ |
| [`dev/백엔드_플레이북.md`](dev/백엔드_플레이북.md) | 백엔드 개발 플레이북 (구 Backend_Playbook) | 📄 |
| [`dev/온보딩_입문서.pdf`](dev/온보딩_입문서.pdf) | 비개발자 친화 입문서·용어사전 (구 Friendly_Onboarding) | 📄 |
| [`dev/프론트_백엔드_배선_공유_YJY.md`](dev/프론트_백엔드_배선_공유_YJY.md) | 프론트↔백엔드 API 배선 공유 | 📄 |

## 👥 역할별 (`roles/`)
| 파일 | 담당 |
|---|---|
| [`roles/역할_백엔드.pptx`](roles/역할_백엔드.pptx) | 박진 (Backend) |
| [`roles/역할_프론트엔드.pptx`](roles/역할_프론트엔드.pptx) | 윤재영 (Frontend) |
| [`roles/역할_데브옵스.pptx`](roles/역할_데브옵스.pptx) | 정욱현 (DevOps/QA) |
| [`roles/역할_ML.pptx`](roles/역할_ML.pptx) | 박진영 (ML/PM) |
| [`roles/역할_파이프라인.pptx`](roles/역할_파이프라인.pptx) | 박진영 (Pipeline 겸직) |

## 🗄️ 구버전 보관 (`archive/`)
대체·통합 완료된 옛 산출물. **현행 자료 아님.** 복구·이력 추적용.
- `발표덱_2026-06-10.*` (→ 통합본_06-11로 대체) · `legal_ppt/*.pdf` (구 CX/QA·타팀파일)
- `최종산출문서_오대기_원본_2026-06-09.docx` (→ `설계서/최종산출문서_정본_*.md`로 통합)
- `handoff_2026-06-02.md` (4 critical 정정 이력)

---

## 팀 — 오대기 (5분 대기조, 5명)
| 팀원 | 역할 | 모듈 |
|---|---|---|
| 박진영 | 팀장 / ML·PM | `ml/`, `pipeline/`, 아키텍처 |
| 박진 | Backend | `backend/` |
| 윤재영 | Frontend | `frontend/` |
| 정욱현 | DevOps / QA | `infra/`, `.github/`, `tests/` |
| 조근범 | 기획 / 디자인 | `docs/`, CX/BX |

> 파일명 규칙: 한글 + 용도 우선(`발표덱_*`, `역할_*`, `개발가이드_*`). 날짜는 `_YYYY-MM-DD`. 구버전은 `archive/`로.
