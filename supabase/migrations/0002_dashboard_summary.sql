-- =====================================================================
-- 0002_dashboard_summary.sql
-- 대시보드 요약을 한 번의 호출로 집계하는 RPC.
--
-- - SECURITY INVOKER(기본): customers / trade_records 의 RLS 가 그대로 적용된다.
-- - 인자를 받지 않는다. 현재 인증 사용자(auth.uid())의 데이터만 RLS 로 걸러진다.
--   사용자 ID 를 인자로 받아 신뢰하지 않는다.
-- - 미인증(anon) 호출 시 RLS 로 아무 행도 안 보이므로 전부 0 인 요약이 반환된다.
--   (/dashboard 페이지는 별도로 인증을 강제한다.)
-- - 기존 마이그레이션(0001)을 수정하지 않고 새 파일로 추가했다. DROP 문 없음.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
-- 되돌리려면(자동 실행 금지):  drop function if exists public.dashboard_summary();
-- =====================================================================

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
  last_visit as (
    select
      c.id,
      greatest(
        c.first_visit_date,
        coalesce(max(t.trade_date), c.first_visit_date)
      ) as lv
    from customers c
    left join trade_records t on t.customer_id = c.id
    group by c.id, c.first_visit_date
  ),
  recent as (
    select
      t.id,
      t.trade_type,
      t.item_type,
      t.amount::text as amount,
      t.trade_date,
      t.created_at,
      t.customer_id,
      c.name as customer_name
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
        'WEDDING',        count(*) filter (where 'WEDDING'::purchase_purpose = any(purchase_purposes)),
        'FIRST_BIRTHDAY', count(*) filter (where 'FIRST_BIRTHDAY'::purchase_purpose = any(purchase_purposes)),
        'INVESTMENT',     count(*) filter (where 'INVESTMENT'::purchase_purpose = any(purchase_purposes)),
        'SELLING',        count(*) filter (where 'SELLING'::purchase_purpose = any(purchase_purposes)),
        'OTHER',          count(*) filter (where 'OTHER'::purchase_purpose = any(purchase_purposes))
      )
      from customers
    ),

    'inactive_90_count', (
      select count(*)
      from last_visit lv, seoul s
      where s.today - lv.lv >= 90
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
