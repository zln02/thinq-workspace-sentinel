-- =============================================================
-- ThinQ Workspace Sentinel · TimescaleDB schema 초기화
-- 실행: docker exec -i uis-timescaledb psql -U postgres -d uis < 001_init_sentinel.sql
-- =============================================================

-- TimescaleDB 확장 (이미 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sentinel 전용 schema (UIS와 분리)
CREATE SCHEMA IF NOT EXISTS sentinel;
SET search_path TO sentinel, public;

-- =============================================================
-- 1. sites (사업장 마스터)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_name VARCHAR(100) NOT NULL,
    site_type VARCHAR(30) NOT NULL CHECK (site_type IN ('CALL_CENTER','OFFICE','HOSPITAL','SCHOOL')),
    region_code VARCHAR(10) NOT NULL,
    subscription_phase SMALLINT NOT NULL DEFAULT 0 CHECK (subscription_phase IN (0,1,2)),
    contract_start DATE,
    max_occupancy INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 2. spaces (공간 마스터)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sentinel.sites(id) ON DELETE CASCADE,
    space_name VARCHAR(100) NOT NULL,
    space_type VARCHAR(30) NOT NULL CHECK (space_type IN ('MEETING','OFFICE','CALL_CENTER','HALL')),
    area_m2 FLOAT NOT NULL,
    ceiling_m FLOAT NOT NULL DEFAULT 2.7,
    volume_m3 FLOAT GENERATED ALWAYS AS (area_m2 * ceiling_m) STORED,
    max_occupancy INTEGER NOT NULL,
    device_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spaces_site ON sentinel.spaces(site_id);

-- =============================================================
-- 3. users (RBAC)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(200) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('HSE_MANAGER','EXECUTIVE','EMPLOYEE','ADMIN')),
    site_id UUID REFERENCES sentinel.sites(id) ON DELETE SET NULL,
    anonymized_id VARCHAR(64),
    slack_user_id VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_role_site ON sentinel.users(role, site_id) WHERE deleted_at IS NULL;

-- =============================================================
-- 4. sensor_readings (시계열 Hypertable)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    site_id UUID NOT NULL,
    space_id UUID NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    co2_ppm FLOAT,
    pm25_ugm3 FLOAT,
    temperature FLOAT,
    humidity FLOAT,
    occupancy INTEGER,
    ventilation_rate FLOAT
);
SELECT create_hypertable('sentinel.sensor_readings', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '7 days');
CREATE INDEX IF NOT EXISTS idx_sensor_site_space_time ON sentinel.sensor_readings(site_id, space_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_time_brin ON sentinel.sensor_readings USING BRIN(time);

-- 10년 보존 + 1년 후 5분 다운샘플 정책
SELECT add_retention_policy('sentinel.sensor_readings', INTERVAL '10 years', if_not_exists => TRUE);

-- =============================================================
-- 5. rehva_results (Hypertable)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.rehva_results (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    calculated_at TIMESTAMPTZ NOT NULL,
    site_id UUID NOT NULL,
    space_id UUID NOT NULL,
    poi FLOAT NOT NULL CHECK (poi BETWEEN 0 AND 1),
    r_event FLOAT,
    risk_tier SMALLINT NOT NULL CHECK (risk_tier BETWEEN 1 AND 5),
    i_value FLOAT,
    q_value FLOAT,
    PRIMARY KEY (id, calculated_at)
);
SELECT create_hypertable('sentinel.rehva_results', 'calculated_at', if_not_exists => TRUE, chunk_time_interval => INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_rehva_space_time ON sentinel.rehva_results(space_id, calculated_at DESC);

-- =============================================================
-- 6. device_actions (Hypertable)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.device_actions (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    action_at TIMESTAMPTZ NOT NULL,
    site_id UUID NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('ACTIVATE','DEACTIVATE','ADJUST')),
    trigger_tier SMALLINT CHECK (trigger_tier BETWEEN 1 AND 5),
    protocol_name VARCHAR(50),
    status VARCHAR(10) CHECK (status IN ('SUCCESS','FAIL','RETRY')),
    response_ms INTEGER,
    PRIMARY KEY (id, action_at)
);
SELECT create_hypertable('sentinel.device_actions', 'action_at', if_not_exists => TRUE, chunk_time_interval => INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_actions_site_time ON sentinel.device_actions(site_id, action_at DESC);

-- =============================================================
-- 7. external_signals
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.external_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('KOWAS','DATALAB','OTC')),
    region_code VARCHAR(10) NOT NULL,
    signal_value FLOAT NOT NULL,
    lead_weeks SMALLINT,
    raw_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_ext_signal_type_region_time ON sentinel.external_signals(signal_type, region_code, collected_at DESC);

-- =============================================================
-- 8. ml_predictions
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.ml_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    region_code VARCHAR(10) NOT NULL,
    target_date DATE NOT NULL,
    predicted_risk FLOAT CHECK (predicted_risk BETWEEN 0 AND 1),
    predicted_tier SMALLINT CHECK (predicted_tier BETWEEN 1 AND 5),
    model_version VARCHAR(20) DEFAULT 'UIS-XGBoost-v2',
    f1_score FLOAT
);
CREATE INDEX IF NOT EXISTS idx_ml_region_target ON sentinel.ml_predictions(region_code, target_date DESC);

-- =============================================================
-- 9. alerts (Hypertable · 10년 보존)
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.alerts (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    alerted_at TIMESTAMPTZ NOT NULL,
    site_id UUID NOT NULL,
    space_id UUID,
    from_tier SMALLINT,
    to_tier SMALLINT NOT NULL,
    channel VARCHAR(20) CHECK (channel IN ('SLACK','EMAIL','SMS','APP_PUSH')),
    recipient VARCHAR(100),
    message TEXT,
    status VARCHAR(10) CHECK (status IN ('SENT','FAILED','RETRY')),
    poi_snapshot FLOAT,
    PRIMARY KEY (id, alerted_at)
);
SELECT create_hypertable('sentinel.alerts', 'alerted_at', if_not_exists => TRUE, chunk_time_interval => INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_alerts_site_time ON sentinel.alerts(site_id, alerted_at DESC);
SELECT add_retention_policy('sentinel.alerts', INTERVAL '10 years', if_not_exists => TRUE);

-- =============================================================
-- 10. esg_reports
-- =============================================================
CREATE TABLE IF NOT EXISTS sentinel.esg_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sentinel.sites(id) ON DELETE CASCADE,
    report_month DATE NOT NULL,
    avg_poi FLOAT,
    max_tier_reached SMALLINT,
    activation_count INTEGER,
    compliance_rate FLOAT,
    pdf_path VARCHAR(255),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, report_month)
);

-- =============================================================
-- 시드 데이터 (PoC 시연용)
-- =============================================================
INSERT INTO sentinel.sites (site_name, site_type, region_code, subscription_phase, max_occupancy)
VALUES ('LG 트윈타워 본사 (시연용)', 'OFFICE', '11', 0, 1000)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 권한 (Phase 1 RBAC 준비)
-- =============================================================
-- CREATE ROLE sentinel_read_only;
-- GRANT USAGE ON SCHEMA sentinel TO sentinel_read_only;
-- GRANT SELECT ON ALL TABLES IN SCHEMA sentinel TO sentinel_read_only;
