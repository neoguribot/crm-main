-- =====================================================================
-- 0010_integer_codes.sql
-- 원본 요구사항(문서 9번)의 정수 코드화 반영 + 더 이상 쓰지 않는 enum 타입 정리.
--
-- - trade_records.trade_type : text('SALE'/'PURCHASE') → smallint
--     SALE → 1(판매), PURCHASE → 2(매입)
-- - trade_records.item_type  : text → smallint (01~99 코드)
--     GOLD_BAR=1, SILVER_BAR=2, GOLD_24K=3, GOLD_24K_STONE=4,
--     GOLD_24K_JEWELRY=5, GOLD_18K=6, GOLD_14K=7, SILVER_JEWELRY=8,
--     SILVER_SPOON=9, SCRAP_GOLD=10, OTHER=99
-- - 앱 레벨(zod/TS)은 계속 문자열 코드를 쓰고, lib/types/codes.ts 가
--   DB 저장/조회 시점에만 정수로 변환한다.
-- - dashboard_summary() RPC를 정수 코드 기준으로 재작성(0008 버전 대체).
-- - 더 이상 어떤 컬럼도 참조하지 않는 고아 enum 타입 정리(WEDDING 값 포함,
--   문서 N1 항목): purchase_purpose, inflow_channel(구), item_type(구).
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. trade_type: text → smallint
-- ---------------------------------------------------------------------
alter table public.trade_records
  add column if not exists trade_type_code smallint;

update public.trade_records
  set trade_type_code = case trade_type
    when 'SALE' then 1
    when 'PURCHASE' then 2
  end
  where trade_type_code is null;

alter table public.trade_records
  alter column trade_type_code set not null;
alter table public.trade_records
  add constraint trade_records_trade_type_code_check
    check (trade_type_code in (1, 2));

alter table public.trade_records drop column trade_type;
alter table public.trade_records rename column trade_type_code to trade_type;

-- ---------------------------------------------------------------------
-- 2. item_type: text → smallint
-- ---------------------------------------------------------------------
alter table public.trade_records
  add column if not exists item_type_code smallint;

update public.trade_records
  set item_type_code = case item_type
    when 'GOLD_BAR' then 1
    when 'SILVER_BAR' then 2
    when 'GOLD_24K' then 3
    when 'GOLD_24K_STONE' then 4
    when 'GOLD_24K_JEWELRY' then 5
    when 'GOLD_18K' then 6
    when 'GOLD_14K' then 7
    when 'SILVER_JEWELRY' then 8
    when 'SILVER_SPOON' then 9
    when 'SCRAP_GOLD' then 10
    else 99
  end
  where item_type_code is null;

alter table public.trade_records
  alter column item_type_code set not null;
alter table public.trade_records
  add constraint trade_records_item_type_code_check
    check (item_type_code between 1 and 99);

alter table public.trade_records drop column item_type;
alter table public.trade_records rename column item_type_code to item_type;

-- ---------------------------------------------------------------------
-- 3. dashboard_summary() 정수 코드 기준으로 재작성
-- ---------------------------------------------------------------------
create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with seoul as (
    select (now() at time zone 'Asia/Seoul')::date as today
  ),
  bounds as (
    select
      date_trunc('month', (now() at time zone 'Asia/Seoul'))::date as month_start,
      (date_trunc('month', (now() at time zone 'Asia/Seoul'))
        + interval '1 month')::date as next_month_start
  ),
  month_trades as (
    select t.trade_type, t.amount
    from trade_records t, bounds b
    where t.trade_date >= b.month_start
      and t.trade_date < b.next_month_start
  ),
  recent as (
    select
      t.id, t.trade_type, t.item_type,
      t.amount::text as amount, t.trade_date, t.created_at,
      t.customer_id, c.name as customer_name
    from trade_records t
    join customers c on c.id = t.customer_id
    order by t.trade_date desc, t.created_at desc
    limit 5
  )
  select jsonb_build_object(
    'customer_count', (select count(*) from customers),

    'month_sale_amount',
      (select coalesce(sum(amount), 0)::text
       from month_trades where trade_type = 1),

    'month_purchase_amount',
      (select coalesce(sum(amount), 0)::text
       from month_trades where trade_type = 2),

    'purpose_counts', (
      select jsonb_build_object(
        'PURCHASE',       count(*) filter (where 'PURCHASE'       = any(purchase_purposes)),
        'GOLD_BAR',       count(*) filter (where 'GOLD_BAR'       = any(purchase_purposes)),
        'STONE_PRODUCT',  count(*) filter (where 'STONE_PRODUCT'  = any(purchase_purposes)),
        'CUSTOM_JEWELRY', count(*) filter (where 'CUSTOM_JEWELRY' = any(purchase_purposes)),
        'OTHER',          count(*) filter (where 'OTHER'          = any(purchase_purposes))
      )
      from customers
    ),

    'upcoming_event_count', (
      select count(*)
      from customers c, seoul s
      where c.next_event_date is not null
        and c.next_event_date >= s.today
        and c.next_event_date <= s.today + 30
    ),

    'recent_trades', (
      select coalesce(
        jsonb_agg(
          (to_jsonb(recent) - 'created_at')
          order by recent.trade_date desc, recent.created_at desc
        ),
        '[]'::jsonb
      )
      from recent
    )
  );
$$;

-- ---------------------------------------------------------------------
-- 4. 고아 enum 타입 정리 (0007/0008에서 이미 컬럼은 text로 전환되어
--    더 이상 어떤 컬럼도 참조하지 않음을 확인함 — WEDDING 값 포함)
-- ---------------------------------------------------------------------
drop type if exists public.purchase_purpose;
drop type if exists public.inflow_channel;
drop type if exists public.item_type;
