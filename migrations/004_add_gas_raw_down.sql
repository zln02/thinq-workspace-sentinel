-- 004_add_gas_raw_down.sql
-- 004_add_gas_raw.sql 의 역방향. MQ2 gas_raw 컬럼 제거.
-- 실행: docker exec -i uis-timescaledb psql -U postgres -d uis < 004_add_gas_raw_down.sql

ALTER TABLE sentinel.sensor_readings
    DROP COLUMN IF EXISTS gas_raw;
