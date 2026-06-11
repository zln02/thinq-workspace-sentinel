-- =============================================================
-- ThinQ Workspace Sentinel · 003 ROLLBACK
-- 003_real_nursing_seed.sql 의 역방향 (실 요양병원 6곳 + 시연 병동 시드 제거).
-- 실행: docker exec -i uis-timescaledb psql -U postgres -d uis < 003_real_nursing_seed_down.sql
-- ※ 순수 시드 데이터라 down 도 데이터 삭제만 수행. FK(spaces→sites ON DELETE CASCADE) 주의.
-- =============================================================

SET search_path TO sentinel, public;

-- ============ 1. 시연 메인 site 병동 spaces 제거 ============
DELETE FROM sentinel.spaces
WHERE site_id IN (SELECT id FROM sentinel.sites WHERE site_name LIKE '%요양병원 (시연)')
  AND space_name IN ('201호 다인실','202호 다인실','203호 다인실','301호 다인실',
                     '302호 다인실','음압격리실','공용식당','1층 휴게실');

-- ============ 2. 실제 요양병원 6곳 제거 (자식 spaces 는 CASCADE) ============
DELETE FROM sentinel.sites WHERE site_name IN (
  '아미나요양병원','한사랑요양병원','차연요양병원',
  '스타트요양병원','서울위례바이오요양병원','향동포레요양병원'
);
