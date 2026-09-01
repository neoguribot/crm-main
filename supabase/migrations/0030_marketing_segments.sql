-- =====================================================================
-- 0030_marketing_segments.sql
-- 마케팅 자동화 3: 프로모션 세그먼트 분석.
--
-- marketing_segments() — 로그인 사용자(owner)의 고객을 "지금 연락하면 좋은"
-- 그룹으로 나눠 { count, customers: [{id, name, phone, metric}] } 로 반환한다.
-- 집계는 전부 PostgreSQL 에서 수행하고 거래 데이터를 앱으로 내리지 않는다.
-- security invoker 라 호출자 RLS 로 자기 고객만 집계한다.
--
-- 세그먼트:
--   dormant        휴면 — 거래 이력이 있는데 마지막 방문이 오래됨
--                  (평균 재방문 주기 × 1.5, 최소 90일 초과)
--   new_no_trade   신규 미거래 — 최근 30일 내 등록 & 거래 0건
--   birthday       생일 임박 — 생일이 14일 이내
--   target_reached 목표가 도달 — 매수 희망가가 현재 시세 이상
--   vip_care       우수·VIP 이탈 방지 — 등급 우수/VIP & 마지막 방문 60일 초과
--   referral       추천 유도 — 단골인데 추천한 고객이 없음
--
-- metric 은 세그먼트별 정렬·표시용 숫자(경과일수 / 목표가 / 거래건수 등).
--
-- 여러 번 실행해도 안전. 되돌리기: drop function if exists public.marketing_segments();
-- =====================================================================

create or replace function public.marketing_segments()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with seoul as (
    select (now() at time zone 'Asia/Seoul')::date as today
  ),
  latest_price as (
    select price_per_don
    from gold_prices
    order by registered_at desc
    limit 1
  ),
  base as (
    select
      c.id, c.name, c.phone, c.registered_on, c.first_trade_date,
      c.birth_date, c.frequency_label, c.revenue_label,
      pt.target_price_per_don,
      count(t.id)                          as trade_count,
      count(distinct t.trade_date)         as distinct_trade_days,
      max(t.trade_date)                    as last_trade_date,
      min(t.trade_date)                    as min_trade_date
    from customers c
    left join trade_records t on t.customer_id = c.id
    left join price_targets pt on pt.customer_id = c.id
    group by c.id, pt.target_price_per_don
  ),
  ref_counts as (
    select referred_by_customer_id as id, count(*) as n
    from customers
    where referred_by_customer_id is not null
    group by referred_by_customer_id
  ),
  final as (
    select
      b.*,
      s.today,
      greatest(
        b.registered_on,
        coalesce(b.first_trade_date, b.registered_on),
        coalesce(b.last_trade_date, b.registered_on)
      ) as last_visit,
      case
        when b.distinct_trade_days >= 2
          then round(
            (b.last_trade_date - b.min_trade_date)::numeric
            / (b.distinct_trade_days - 1)
          )
        else null
      end as avg_interval,
      coalesce(rc.n, 0) as referrals_made,
      case
        when b.birth_date is null then null
        else (
          (b.birth_date
            + ((extract(year from s.today) - extract(year from b.birth_date))
               * interval '1 year'))::date
        )
      end as bd_this_year
    from base b
    cross join seoul s
    left join ref_counts rc on rc.id = b.id
  ),
  scored as (
    select
      f.*,
      (f.today - f.last_visit) as days_since_visit,
      (f.today - f.registered_on) as days_since_reg,
      case
        when f.bd_this_year is null then null
        when f.bd_this_year >= f.today then (f.bd_this_year - f.today)
        else ((f.bd_this_year + interval '1 year')::date - f.today)
      end as days_to_birthday
    from final f
  )
  select jsonb_build_object(
    'dormant', (
      select jsonb_build_object(
        'count', count(*),
        'customers', coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'phone', phone, 'metric', metric)
          order by metric desc
        ), '[]'::jsonb)
      )
      from (
        select id, name, phone, days_since_visit as metric
        from scored
        where trade_count >= 1
          and days_since_visit > greatest(90, coalesce(avg_interval * 1.5, 90))
        order by days_since_visit desc
        limit 100
      ) q
    ),
    'new_no_trade', (
      select jsonb_build_object(
        'count', count(*),
        'customers', coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'phone', phone, 'metric', metric)
          order by metric asc
        ), '[]'::jsonb)
      )
      from (
        select id, name, phone, days_since_reg as metric
        from scored
        where trade_count = 0 and days_since_reg <= 30
        order by days_since_reg asc
        limit 100
      ) q
    ),
    'birthday', (
      select jsonb_build_object(
        'count', count(*),
        'customers', coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'phone', phone, 'metric', metric)
          order by metric asc
        ), '[]'::jsonb)
      )
      from (
        select id, name, phone, days_to_birthday as metric
        from scored
        where days_to_birthday is not null and days_to_birthday <= 14
        order by days_to_birthday asc
        limit 100
      ) q
    ),
    'target_reached', (
      select jsonb_build_object(
        'count', count(*),
        'customers', coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'phone', phone, 'metric', metric)
          order by metric desc
        ), '[]'::jsonb)
      )
      from (
        select id, name, phone, target_price_per_don as metric
        from scored
        where target_price_per_don is not null
          and (select price_per_don from latest_price) is not null
          and (select price_per_don from latest_price) >= target_price_per_don
        order by target_price_per_don desc
        limit 100
      ) q
    ),
    'vip_care', (
      select jsonb_build_object(
        'count', count(*),
        'customers', coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'phone', phone, 'metric', metric)
          order by metric desc
        ), '[]'::jsonb)
      )
      from (
        select id, name, phone, days_since_visit as metric
        from scored
        where revenue_label in ('우수', 'VIP') and days_since_visit > 60
        order by days_since_visit desc
        limit 100
      ) q
    ),
    'referral', (
      select jsonb_build_object(
        'count', count(*),
        'customers', coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'phone', phone, 'metric', metric)
          order by metric desc
        ), '[]'::jsonb)
      )
      from (
        select id, name, phone, trade_count as metric
        from scored
        where frequency_label = '단골' and referrals_made = 0
        order by trade_count desc
        limit 100
      ) q
    )
  );
$$;
