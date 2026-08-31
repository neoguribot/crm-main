-- =====================================================================
-- 0007_trade_item_revamp.sql
-- 거래 항목 개편.
--
-- - item_type: enum → text 로 전환 (품목 목록이 자주 바뀌므로 앱(zod)에서 검증).
--   기존 값 매핑:  SILVER → SILVER_JEWELRY,  나머지는 코드 유지.
--   (24K 주얼리는 코드 GOLD_24K_JEWELRY 그대로, 표시명만 "24K(주얼리)" 로)
-- - unit_price (기준 단가, 원) 컬럼 추가. 기존 행은 NULL.
-- - item_detail (품목='OTHER' 일 때 세부 내용) 컬럼 추가.
-- - purity (순도) 컬럼 삭제 — 더 이상 쓰지 않는다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- 1. item_type: enum → text
alter table public.trade_records
  alter column item_type type text using item_type::text;

-- 2. 기존 값 매핑
update public.trade_records
  set item_type = 'SILVER_JEWELRY'
  where item_type = 'SILVER';

-- 3. 기준 단가
alter table public.trade_records
  add column if not exists unit_price numeric(15, 0)
    check (unit_price is null or unit_price >= 0);

-- 4. 기타 세부 내용
alter table public.trade_records
  add column if not exists item_detail text;

-- 5. 순도 삭제 (CHECK 제약도 함께 사라짐)
alter table public.trade_records
  drop column if exists purity;

-- 6. (선택) 더 이상 참조되지 않는 enum 타입 정리.
--    다른 객체가 참조 중이면 오류가 나므로 필요할 때 수동 실행:
--    drop type if exists public.item_type;
