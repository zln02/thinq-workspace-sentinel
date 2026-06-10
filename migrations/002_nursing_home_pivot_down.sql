-- =============================================================
-- ThinQ Workspace Sentinel · 002 ROLLBACK
-- 002_nursing_home_pivot.sql 의 역방향 (요양병원 피벗 되돌림).
-- 실행: docker exec -i uis-timescaledb psql -U postgres -d uis < 002_nursing_home_pivot_down.sql
-- ⚠️ NURSING_HOSPITAL 타입 sites/spaces/users 가 이미 존재하면 CHECK 복원이 실패한다.
--    먼저 해당 행을 정리하거나 원장(DIRECTOR) 등 신규 role 사용자를 제거할 것.
-- =============================================================

SET search_path TO sentinel, public;

-- ============ 1. 002 에서 새로 만든 마스터 테이블 제거 ============
DROP TABLE IF EXISTS sentinel.legal_mappings;
DROP TABLE IF EXISTS sentinel.device_catalog;
DROP TABLE IF EXISTS sentinel.pathogens;

-- ============ 2. CHECK 제약을 001 원본으로 복원 ============
ALTER TABLE sentinel.sites DROP CONSTRAINT IF EXISTS sites_site_type_check;
ALTER TABLE sentinel.sites ADD CONSTRAINT sites_site_type_check
  CHECK (site_type IN ('CALL_CENTER','OFFICE','HOSPITAL','SCHOOL'));

ALTER TABLE sentinel.spaces DROP CONSTRAINT IF EXISTS spaces_space_type_check;
ALTER TABLE sentinel.spaces ADD CONSTRAINT spaces_space_type_check
  CHECK (space_type IN ('MEETING','OFFICE','CALL_CENTER','HALL'));

ALTER TABLE sentinel.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE sentinel.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('HSE_MANAGER','EXECUTIVE','EMPLOYEE','ADMIN'));

-- ============ 3. 002 §7 시연 시드 site 제거 ============
DELETE FROM sentinel.sites WHERE site_name = 'LG 디지털요양병원 (시연)';
