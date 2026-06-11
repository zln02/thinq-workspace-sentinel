-- =============================================================
-- ThinQ Workspace Sentinel · 001 ROLLBACK
-- 001_init_sentinel.sql 의 역방향. sentinel schema 전체 제거.
-- 실행: docker exec -i uis-timescaledb psql -U postgres -d uis < 001_init_sentinel_down.sql
-- ⚠️ sentinel schema 의 모든 테이블·데이터가 삭제된다. 002~004 의 객체도 함께 제거됨.
-- =============================================================

-- 002 에서 추가된 테이블 포함, sentinel schema 전체를 CASCADE 로 제거.
DROP SCHEMA IF EXISTS sentinel CASCADE;

-- 확장(timescaledb / uuid-ossp)은 UIS 본체와 공유하므로 의도적으로 남겨둔다.
