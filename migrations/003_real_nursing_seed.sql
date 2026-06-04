-- =============================================================
-- ThinQ Workspace Sentinel · 003 — 실제 요양병원 데이터 시드
-- (1) 실제 요양병원 6곳 (네이버 지역검색 공개정보 기반)
-- (2) 시연 메인 site 표준 병동 spaces (의료법 시행규칙 별표4 면적기준)
-- 적용: docker exec -i sentinel-db-dev psql -U sentinel -d sentinel_dev < 003_real_nursing_seed.sql
-- =============================================================

SET search_path TO sentinel, public;

-- ============ 1. 실제 요양병원 6곳 (sites) ============
-- 출처: 네이버 지역검색 공개 업체정보 (기관명·주소·시도). 병상수는 공개 API 부재로
--       일반 요양병원 규모(노인복지법 시설 기준) 참고 추정값이며 실계약 시 실사 필요.
-- region_code: 11=서울특별시, 41=경기도 (UIS 외부신호 region 매칭 키)
INSERT INTO sentinel.sites (site_name, site_type, region_code, subscription_phase, max_occupancy)
VALUES
  ('아미나요양병원',        'NURSING_HOSPITAL', '11', 0, 120),  -- 서울 종로구 경희궁길
  ('한사랑요양병원',        'NURSING_HOSPITAL', '41', 0, 200),  -- 경기 파주시 통일로
  ('차연요양병원',          'NURSING_HOSPITAL', '41', 0, 150),  -- 경기 고양시 일산동구
  ('스타트요양병원',        'NURSING_HOSPITAL', '41', 0, 180),  -- 경기 오산시 청학로
  ('서울위례바이오요양병원','NURSING_HOSPITAL', '41', 0, 220),  -- 경기 성남시 수정구 위례
  ('향동포레요양병원',      'NURSING_HOSPITAL', '41', 0, 160)   -- 경기 고양시 덕양구 향동
ON CONFLICT DO NOTHING;

-- ============ 2. 시연 메인 site 병동 구성 (spaces) ============
-- 면적 근거: 의료법 시행규칙 별표4 — 요양병원 입원실 1병상당 6.3㎡, 천장고 2.7m.
--           음압격리실은 1인실(10㎡↑), 식당·휴게실은 공용면적 기준.
-- volume_m3 = area_m2 × ceiling_m (generated 컬럼, 자동 계산)
-- 시연 메인: '디지털요양병원 (시연)' (002에서 시드된 site)
INSERT INTO sentinel.spaces (site_id, space_name, space_type, area_m2, ceiling_m, max_occupancy)
SELECT s.id, v.space_name, v.space_type, v.area_m2, 2.7, v.max_occupancy
FROM sentinel.sites s
CROSS JOIN (VALUES
  ('201호 다인실', 'WARD',      45.0, 6),   -- 6병상 × 6.3㎡ + 통로/화장실 → 45㎡ (121.5㎥)
  ('202호 다인실', 'WARD',      45.0, 6),
  ('203호 다인실', 'WARD',      45.0, 6),
  ('301호 다인실', 'WARD',      45.0, 6),
  ('302호 다인실', 'WARD',      45.0, 6),
  ('음압격리실',   'ISOLATION', 12.0, 1),   -- 1인 음압격리 (12㎡, 32.4㎥)
  ('공용식당',     'DINING',   150.0, 50),  -- 교대 식사 (150㎡, 405㎥)
  ('1층 휴게실',   'LOUNGE',    60.0, 20)   -- 공용 휴게 (60㎡, 162㎥)
) AS v(space_name, space_type, area_m2, max_occupancy)
WHERE s.site_name LIKE '%요양병원 (시연)'
ON CONFLICT DO NOTHING;

-- ============ 3. 검증 ============
SELECT 'sites_total'   AS k, COUNT(*)::text AS v FROM sentinel.sites
UNION ALL SELECT 'nursing_hospitals', COUNT(*)::text FROM sentinel.sites WHERE site_type='NURSING_HOSPITAL'
UNION ALL SELECT 'spaces_seeded', COUNT(*)::text FROM sentinel.spaces
UNION ALL SELECT 'sample_ward_volume_m3',
  COALESCE((SELECT volume_m3::text FROM sentinel.spaces WHERE space_type='WARD' LIMIT 1), 'none');
