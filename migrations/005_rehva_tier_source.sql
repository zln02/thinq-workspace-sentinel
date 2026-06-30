-- 005_rehva_tier_source.sql
-- 사전예방 집계 분리용 — rehva_results 각 행이 '실내센서 감지발(sensor)'인지
-- '외부 조기경보발 선제(external)'인지 출처 기록. 병원장 리포트가 외부발 선제대응을
-- 별도 집계해 "감염 사전예방" 성과를 정직하게 분리 노출(데모 토글 inflation 방지).
-- additive · nullable(과거 행은 NULL=출처 미상 → 센서발로 합산).
ALTER TABLE sentinel.rehva_results ADD COLUMN IF NOT EXISTS tier_source text;
