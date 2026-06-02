# ml/ — 모델 디렉토리

## 현재 상태

- 본 디렉토리는 **포인터(reference)** 용입니다.
- 실 모델 학습·백테스트는 별도 캡스톤 레포에서 진행:
  - `~/urban-immune-system/ml/forecaster/` — XGBoost 지역 감염 예측 (F1 0.907)
  - `~/urban-immune-system/analysis/outputs/` — walk-forward 결과 JSON

## 본 레포에서 사용 방법

```python
# backend/services/forecaster_client.py (W2 추가 예정)
from ml.exports import load_model
model = load_model('xgb_v1.joblib')  # urban-immune-system 에서 export 한 artifact
proba = model.predict_proba(features)
```

## W3 진입 시 결정

- [ ] artifact 저장소: git LFS vs GCS bucket
- [ ] 모델 카드(model card) 작성 위치: `docs/ml/model_card_xgb_v1.md`
- [ ] 추론 latency 목표: < 50ms (Backend KPI 위젯용)

## SHAP / GAM 미사용

핸드오프 (`docs/dev/handoff_2026-06-02.md` §1) 참고:
- 설계서의 SHAP/GAM 은 코드 실재 X
- 정답: **XGBoost feature_importances_ (gain) + Granger 인과검정 + TFT (PoC)**
