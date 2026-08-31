-- =====================================================================
-- 0008_customer_fields_revamp.sql
-- 고객 등록 항목 개편.
--
-- - inflow_channel (enum, 단일) → inflow_channels (text[], 다중). 기존 값은 배열로.
--     새 값: CARROT_MARKET NAVER_PLACE KAKAO_MAP KAKAO_CHANNEL GOOGLE TMAP
--            REFERRAL WALK_IN OTHER
-- - purchase_purposes (purchase_purpose[]) → text[]. "방문 목적" 으로 의미 변경.
--     새 값: PURCHASE GOLD_BAR STONE_PRODUCT CUSTOM_JEWELRY OTHER
--     기존 값 매핑: WEDDING→OTHER, FIRST_BIRTHDAY→OTHER, INVESTMENT→GOLD_BAR, SELLING→PURCHASE
-- - first_visit_date (필수) → first_trade_date (선택). 기존 값 유지.
-- - 새 컬럼: email, birth_date, address, registered_on(기본값 오늘, 수정 가능)
-- - dashboard_summary() RPC 갱신 (purchase_purposes text[] + 새 목적 키, 미방문 집계 제거)
--
-- 품목/목적 목록은 자주 바뀌므로 PG enum 대신 text 로 두고 앱(zod)에서 검증한다.
-- 여러 번 실행해도 안전. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. inflow_channel → inflow_channels (text[])
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists inflow_channels text[] not null default '{}';

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'inflow_channel'
  ) then
    update public.customers
      set inflow_channels = array[inflow_channel::text]
      where inflow_channel is not null
        and coalesce(cardinality(inflow_channels), 0) = 0;
    alter table public.customers drop column inflow_channel;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. purchase_purposes → text[] + 값 매핑
-- ---------------------------------------------------------------------
alter table public.customers
  alter column purchase_purposes drop default;
alter table public.customers
  alter column purchase_purposes type text[] using purchase_purposes::text[];
alter table public.customers
  alter column purchase_purposes set default '{}';

update public.customers c
  set purchase_purposes = coalesce((
    select array_agg(distinct mapped)
    from unnest(c.purchase_purposes) as p
    cross join lateral (
      select case p
        when 'WEDDING' then 'OTHER'
        when 'FIRST_BIRTHDAY' then 'OTHER'
        when 'INVESTMENT' then 'GOLD_BAR'
        when 'SELLING' then 'PURCHASE'
        else p
      end as mapped
    ) m
  ), '{}')
  where coalesce(cardinality(c.purchase_purposes), 0) > 0;

-- ---------------------------------------------------------------------
-- 3. first_visit_date → first_trade_date (nullable)
-- ---------------------------------------------------------------------
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'first_visit_date'
  ) then
    alter table public.customers rename column first_visit_date to first_trade_date;
  end if;
end $$;
alter table public.customers alter column first_trade_date drop not null;

-- ---------------------------------------------------------------------
-- 4. 새 컬럼
-- ---------------------------------------------------------------------
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists birth_date date;
alter table public.customers add column if not exists address text;
alter table public.customers
  add column if not exists registered_on date not null
    default (now() at time zone 'Asia/Seoul')::date;

-- ---------------------------------------------------------------------
-- 5. dashboard_summary() 갱신
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
       from month_trades where trade_type = 'SALE'),

    'month_purchase_amount',
      (select coalesce(sum(amount), 0)::text
       from month_trades where trade_type = 'PURCHASE'),

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
-- 6. (선택) 더 이상 쓰지 않는 enum 타입 정리 — 필요 시 수동 실행:
--    drop type if exists public.inflow_channel;
--    drop type if exists public.purchase_purpose;
-- ---------------------------------------------------------------------
