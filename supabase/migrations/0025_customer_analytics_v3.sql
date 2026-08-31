-- =====================================================================
-- 0025_customer_analytics_v3.sql
-- 종합 분석 화면 추가 지표:
-- - purpose_avg_frequency: 방문 목적별 평균 방문 빈도(고객당 누적 거래 횟수의
--   평균), overall_avg_frequency: 전체 평균 방문 빈도
-- - item_type_counts: 품목별 누적 거래 수(int 코드 키 → 앱에서 codeToItemType)
-- - top_customers_by_count: 누적 거래 수 상위 10명(기존 top_customers는 금액 기준 유지)
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

create or replace function public.customer_analytics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with genders as (
    select jsonb_build_object(
      'UNKNOWN', count(*) filter (where gender = 0),
      'MALE',    count(*) filter (where gender = 1),
      'FEMALE',  count(*) filter (where gender = 2)
    ) as g
    from customers
  ),
  frequencies as (
    select jsonb_build_object(
      '신규', count(*) filter (where frequency_label = '신규'),
      '단골', count(*) filter (where frequency_label = '단골')
    ) as g
    from customers
  ),
  revenues as (
    select jsonb_build_object(
      '일반', count(*) filter (where revenue_label = '일반'),
      '우수', count(*) filter (where revenue_label = '우수'),
      'VIP',  count(*) filter (where revenue_label = 'VIP')
    ) as g
    from customers
  ),
  channels as (
    select jsonb_build_object(
      'CARROT_MARKET',  count(*) filter (where 'CARROT_MARKET'  = any(inflow_channels)),
      'NAVER_PLACE',    count(*) filter (where 'NAVER_PLACE'    = any(inflow_channels)),
      'KAKAO_MAP',      count(*) filter (where 'KAKAO_MAP'      = any(inflow_channels)),
      'KAKAO_CHANNEL',  count(*) filter (where 'KAKAO_CHANNEL'  = any(inflow_channels)),
      'GOOGLE',         count(*) filter (where 'GOOGLE'         = any(inflow_channels)),
      'TMAP',           count(*) filter (where 'TMAP'           = any(inflow_channels)),
      'REFERRAL',       count(*) filter (where 'REFERRAL'       = any(inflow_channels)),
      'WALK_IN',        count(*) filter (where 'WALK_IN'        = any(inflow_channels)),
      'OTHER',          count(*) filter (where 'OTHER'          = any(inflow_channels))
    ) as g
    from customers
  ),
  ages as (
    select jsonb_build_object(
      '10s',     count(*) filter (where birth_date is not null and extract(year from age(current_date, birth_date)) between 10 and 19),
      '20s',     count(*) filter (where birth_date is not null and extract(year from age(current_date, birth_date)) between 20 and 29),
      '30s',     count(*) filter (where birth_date is not null and extract(year from age(current_date, birth_date)) between 30 and 39),
      '40s',     count(*) filter (where birth_date is not null and extract(year from age(current_date, birth_date)) between 40 and 49),
      '50s',     count(*) filter (where birth_date is not null and extract(year from age(current_date, birth_date)) between 50 and 59),
      '60_PLUS', count(*) filter (where birth_date is not null and extract(year from age(current_date, birth_date)) >= 60),
      'UNKNOWN', count(*) filter (where birth_date is null)
    ) as g
    from customers
  ),
  top as (
    select c.id, c.name, sum(t.amount) as total_amount, count(t.id) as trade_count
    from customers c
    join trade_records t on t.customer_id = c.id
    group by c.id, c.name
    order by sum(t.amount) desc
    limit 10
  ),
  top_by_count as (
    select c.id, c.name, sum(t.amount) as total_amount, count(t.id) as trade_count
    from customers c
    join trade_records t on t.customer_id = c.id
    group by c.id, c.name
    order by count(t.id) desc, sum(t.amount) desc
    limit 10
  ),
  customer_trade_counts as (
    select
      c.id,
      c.purchase_purposes,
      (select count(*) from trade_records t where t.customer_id = c.id) as trade_count
    from customers c
  ),
  purpose_avg as (
    select
      jsonb_build_object(
        'PURCHASE',       coalesce(avg(trade_count) filter (where 'PURCHASE'       = any(purchase_purposes)), 0),
        'GOLD_BAR',       coalesce(avg(trade_count) filter (where 'GOLD_BAR'       = any(purchase_purposes)), 0),
        'STONE_PRODUCT',  coalesce(avg(trade_count) filter (where 'STONE_PRODUCT'  = any(purchase_purposes)), 0),
        'CUSTOM_JEWELRY', coalesce(avg(trade_count) filter (where 'CUSTOM_JEWELRY' = any(purchase_purposes)), 0),
        'OTHER',          coalesce(avg(trade_count) filter (where 'OTHER'          = any(purchase_purposes)), 0)
      ) as g,
      coalesce(avg(trade_count), 0) as overall
    from customer_trade_counts
  ),
  item_counts as (
    select coalesce(jsonb_object_agg(item_type::text, cnt), '{}'::jsonb) as g
    from (
      select item_type, count(*) as cnt
      from trade_records
      group by item_type
    ) x
  )
  select jsonb_build_object(
    'customer_count', (select count(*) from customers),
    'gender_counts', (select g from genders),
    'frequency_counts', (select g from frequencies),
    'revenue_counts', (select g from revenues),
    'channel_counts', (select g from channels),
    'age_bucket_counts', (select g from ages),
    'purpose_avg_frequency', (select g from purpose_avg),
    'overall_avg_frequency', (select overall from purpose_avg),
    'item_type_counts', (select g from item_counts),
    'top_customers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'total_amount', total_amount::text,
            'trade_count', trade_count
          )
          order by total_amount desc
        )
        from top
      ),
      '[]'::jsonb
    ),
    'top_customers_by_count', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'total_amount', total_amount::text,
            'trade_count', trade_count
          )
          order by trade_count desc
        )
        from top_by_count
      ),
      '[]'::jsonb
    )
  );
$$;
