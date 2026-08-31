-- =====================================================================
-- 0015_dashboard_summary_v3.sql
-- 홈 통합 대시보드용 dashboard_summary() 확장.
--
-- - customer_trade_count_{today,yesterday,week,month,year}: 거래가 발생한
--   고객 수(중복 제거). week/month/year는 각 기간의 시작일부터 오늘까지
--   누적(달력 기준, Asia/Seoul).
-- - upcoming_event_count: 이제 customer_events 기준으로 계산(0012에서
--   customers.next_event_date가 제거되었으므로).
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
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
        + interval '1 month')::date as next_month_start,
      date_trunc('week', (now() at time zone 'Asia/Seoul'))::date as week_start,
      date_trunc('year', (now() at time zone 'Asia/Seoul'))::date as year_start
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
      from customer_events e, seoul s
      where e.is_done = false
        and e.event_date >= s.today
        and e.event_date <= s.today + 30
    ),

    'customer_trade_count_today', (
      select count(distinct t.customer_id)
      from trade_records t, seoul s
      where t.trade_date = s.today
    ),
    'customer_trade_count_yesterday', (
      select count(distinct t.customer_id)
      from trade_records t, seoul s
      where t.trade_date = s.today - 1
    ),
    'customer_trade_count_week', (
      select count(distinct t.customer_id)
      from trade_records t, bounds b, seoul s
      where t.trade_date >= b.week_start and t.trade_date <= s.today
    ),
    'customer_trade_count_month', (
      select count(distinct t.customer_id)
      from trade_records t, bounds b, seoul s
      where t.trade_date >= b.month_start and t.trade_date <= s.today
    ),
    'customer_trade_count_year', (
      select count(distinct t.customer_id)
      from trade_records t, bounds b, seoul s
      where t.trade_date >= b.year_start and t.trade_date <= s.today
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
