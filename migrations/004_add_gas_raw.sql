-- 004_add_gas_raw.sql
-- 아두이노 MQ2 가스센서 raw(ADC) 값 컬럼 추가.
-- 시연용 트리거 지표(0~1023). CO2 절대 ppm 아님 — 학술 정합은 코웨이 실측 CO2(co2_ppm) 사용.

ALTER TABLE sentinel.sensor_readings
    ADD COLUMN IF NOT EXISTS gas_raw FLOAT;

COMMENT ON COLUMN sentinel.sensor_readings.gas_raw IS
    '아두이노 MQ2 가스센서 ADC raw값(0~1023). 시연용 트리거 지표(CO2 절대값 아님).';
