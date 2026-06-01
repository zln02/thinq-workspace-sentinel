-- =============================================================
-- ThinQ Workspace Sentinel · 002 — 요양병원 도메인 피벗
-- 사무실 → 요양병원 8종 가전 + 8종 병원체 + 5종 페르소나
-- 적용: docker exec -i uis-timescaledb psql -U postgres -d uis < 002_nursing_home_pivot.sql
-- =============================================================

SET search_path TO sentinel, public;

-- ============ 1. site_type 확장 (NURSING_HOSPITAL 추가) ============
ALTER TABLE sentinel.sites DROP CONSTRAINT IF EXISTS sites_site_type_check;
ALTER TABLE sentinel.sites ADD CONSTRAINT sites_site_type_check
  CHECK (site_type IN ('CALL_CENTER','OFFICE','HOSPITAL','SCHOOL','NURSING_HOSPITAL','NURSING_FACILITY','LAB','AIRPORT'));

-- ============ 2. space_type 확장 (요양병동) ============
ALTER TABLE sentinel.spaces DROP CONSTRAINT IF EXISTS spaces_space_type_check;
ALTER TABLE sentinel.spaces ADD CONSTRAINT spaces_space_type_check
  CHECK (space_type IN ('MEETING','OFFICE','CALL_CENTER','HALL','WARD','DINING','LOUNGE','ISOLATION'));

-- ============ 3. role 확장 (요양병원 5종 페르소나) ============
ALTER TABLE sentinel.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE sentinel.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('HSE_MANAGER','EXECUTIVE','EMPLOYEE','ADMIN',
                  'ICN','DIRECTOR','FM','CAREGIVER','RESIDENT','GUARDIAN'));
-- ICN=감염관리간호사 · DIRECTOR=원장 · FM=시설관리 · CAREGIVER=요양보호사
-- RESIDENT=입소자 · GUARDIAN=보호자

-- ============ 4. 위협 병원체 마스터 (8종) ============
CREATE TABLE IF NOT EXISTS sentinel.pathogens (
    code VARCHAR(20) PRIMARY KEY,
    name_kr VARCHAR(50) NOT NULL,
    quanta_rate FLOAT NOT NULL,           -- q/h (Wells-Riley)
    transmission_mode VARCHAR(30) NOT NULL,
    elderly_mortality_factor FLOAT NOT NULL DEFAULT 1.0,
    target_temp FLOAT NOT NULL DEFAULT 22,
    target_rh FLOAT NOT NULL DEFAULT 50,
    min_ach FLOAT NOT NULL DEFAULT 4,
    uv_required BOOLEAN NOT NULL DEFAULT FALSE,
    surface_priority BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);
INSERT INTO sentinel.pathogens (code, name_kr, quanta_rate, transmission_mode, elderly_mortality_factor,
                                target_temp, target_rh, min_ach, uv_required, surface_priority, notes)
VALUES
  ('COVID-19','코로나19',25.0,'airborne',90.0,22,50,6,TRUE,FALSE,'65세+ 일반 90배 사망률 (KCDC 2023)'),
  ('INFLUENZA','인플루엔자',67.0,'droplet+airborne',12.0,22,50,4,FALSE,FALSE,'Lowen 2007: 저온저습 시 안정성↑'),
  ('RSV','RSV',6.0,'droplet',8.0,23,55,4,FALSE,FALSE,'65세+ 폐렴 1순위 사망 원인'),
  ('NOROVIRUS','노로바이러스',1.0,'fomite+vomitus',5.0,23,45,4,FALSE,TRUE,'요양원 집단감염 빈발 (식당)'),
  ('TB','결핵',13.0,'airborne',20.0,22,45,12,TRUE,FALSE,'잠복결핵 재활성·음압격리 필수'),
  ('PNEUMOCOCCUS','폐렴구균',4.0,'droplet',15.0,22,50,4,FALSE,FALSE,'요양원 폐렴 1순위'),
  ('CDI','클로스트리듐 디피실',0.5,'fomite',10.0,23,50,4,FALSE,TRUE,'항생제 관련 설사·표면 핵심'),
  ('SCABIES','옴',0.0,'contact+fomite',1.0,22,50,2,FALSE,TRUE,'집단발생 빈발·의류 매개')
ON CONFLICT (code) DO UPDATE SET
  quanta_rate = EXCLUDED.quanta_rate,
  target_temp = EXCLUDED.target_temp,
  target_rh = EXCLUDED.target_rh,
  min_ach = EXCLUDED.min_ach,
  notes = EXCLUDED.notes;

-- ============ 5. 가전 마스터 (8종) ============
CREATE TABLE IF NOT EXISTS sentinel.device_catalog (
    device_type VARCHAR(30) PRIMARY KEY,
    name_kr VARCHAR(50) NOT NULL,
    nursing_priority SMALLINT NOT NULL,
    wells_riley_var VARCHAR(30),
    season_master VARCHAR(20),
    notes TEXT
);
INSERT INTO sentinel.device_catalog VALUES
  ('AIR_PURIFIER','공기청정기',1,'lambda_virus','all','24h RSV·인플루엔자·미세먼지'),
  ('AIR_CONDITIONER','에어컨',2,'T,Q_aux','summer','폭염 노인 사망 1순위 가전'),
  ('VENTILATOR','환기청정기',3,'Q_main','all','Wells-Riley Q 직접 제어 (ACH 6+)'),
  ('HUMIDIFIER','가습기',4,'RH_up','winter','노인 점막 보호 40~60%'),
  ('DEHUMIDIFIER','제습기',5,'RH_down,surface','summer','노로·곰팡이·욕창'),
  ('BOILER','보일러',6,'T_up','winter','저체온증·인플루엔자 시즌'),
  ('ROBOT_CLEANER','로봇청소기',7,'surface','all','노로·CDI 표면 살균'),
  ('STYLER','스타일러',8,'fomite_clothing','all','옴·요양보호사 출퇴근 의류 살균')
ON CONFLICT (device_type) DO UPDATE SET name_kr = EXCLUDED.name_kr, notes = EXCLUDED.notes;

-- ============ 6. 법적 규제 매핑 (9개 법령) ============
CREATE TABLE IF NOT EXISTS sentinel.legal_mappings (
    id SERIAL PRIMARY KEY,
    law_code VARCHAR(50) NOT NULL,
    law_name_kr VARCHAR(100) NOT NULL,
    article VARCHAR(30),
    obligation TEXT NOT NULL,
    sentinel_evidence TEXT NOT NULL,
    enforcement_authority VARCHAR(50)
);
INSERT INTO sentinel.legal_mappings (law_code, law_name_kr, article, obligation, sentinel_evidence, enforcement_authority)
VALUES
  ('MEDICAL_ACT_36','의료법','제36조','감염관리위원회 + 감염관리 정기 보고','rehva_results·alerts·smart_protocol_log 자동 PDF','보건복지부'),
  ('INFECTIOUS_DISEASE','감염병예방법','제16조','감염병 발생 시 24h 내 신고·관리','tier 변화 → 보건소 알림 자동','질병관리청'),
  ('OSH_ACT','산업안전보건법','제5조','근로자(요양보호사) 보건 조치','센서 측정값·환기율 로그','고용노동부'),
  ('INDOOR_AIR','실내공기질관리법','제5조','PM·CO2·HCHO 측정 의무','sensor_readings 자동 보고','환경부'),
  ('ELDERLY_WELFARE','노인복지법','제55조','노인복지시설 안전 관리','space 등급 + 알림 이력','보건복지부'),
  ('TB_PREVENTION','결핵예방법','제11조','집단시설 정기 검진','TB 시나리오 + 환기 로그','질병관리청'),
  ('NHI_BENEFIT','요양급여기준','별표7','감염관리 시설 가산','적정성평가 점수 +5점','건강보험심사평가원'),
  ('QUALITY_EVAL','요양병원 적정성평가','감염관리 영역','연 1회 평가 (수가 차등)','자동 증빙 리포트','건강보험심사평가원'),
  ('KIPA_ACCRED','의료기관 인증평가','환경관리','3년 1회 인증','센서·가전 운영 로그','의료기관평가인증원')
ON CONFLICT DO NOTHING;

-- ============ 7. 시연용 시드 데이터 (요양병원 1곳) ============
INSERT INTO sentinel.sites (site_name, site_type, region_code, subscription_phase, max_occupancy)
VALUES ('LG 디지털요양병원 (시연)', 'NURSING_HOSPITAL', '11', 1, 200)
ON CONFLICT DO NOTHING;

-- ============ 8. 검증 ============
SELECT 'pathogens' AS table_name, COUNT(*) AS rows FROM sentinel.pathogens
UNION ALL SELECT 'device_catalog', COUNT(*) FROM sentinel.device_catalog
UNION ALL SELECT 'legal_mappings', COUNT(*) FROM sentinel.legal_mappings
UNION ALL SELECT 'sites', COUNT(*) FROM sentinel.sites;
