-- =====================================================================
-- 0005_customer_count_by_period.sql
-- 대시보드: 기간별(일간/주간/월간/연간) 추이.
--
-- basis:
--   'trade'        - 거래 건수 (거래 1건 = 고객 1명). 같은 고객이 여러 번
--                    거래하면 중복 집계. 버킷 기준은 trade_records.trade_date.
--   'registration' - 신규 등록 고객수. 버킷 기준은 customers.created_at
--                    (Asia/Seoul 날짜로 환산).
--
-- - 거래가/등록이 없는 버킷도 0 으로 채워 최근 구간 전체를 반환한다.
--   일간 14개 / 주간 12개 / 월간 12개 / 연간 5개.
-- - SECURITY INVOKER: customers / trade_records 의 RLS 가 그대로 적용된다.
--   granularity/basis 외 인자를 받지 않는다(사용자 ID 를 신뢰하지 않음).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
-- 되돌리려면(자동 실행 금지):
--   drop function if exists public.customer_count_by_period(text, text);
-- =====================================================================

create or replace function public.customer_count_by_period(
  granularity text,
  basis text default 'trade'
)
returns table (bucket date, count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with cfg as (
    select
      case lower(coalesce(granularity, 'day'))
        when 'week' then 'week'
        when 'month' then 'month'
        when 'year' then 'year'
        else 'day'
      end as unit,
      case lower(coalesce(granularity, 'day'))
        when 'week' then 12
        when 'month' then 12
        when 'year' then 5
        else 14
      end as n,
      case lower(coalesce(basis, 'trade'))
        when 'registration' then 'registration'
        else 'trade'
      end as basis
  ),
  today as (
    select (now() at time zone 'Asia/Seoul')::date as d
  ),
  series as (
    select generate_series(
      date_trunc((select unit from cfg), (select d from today))
        - ((select n from cfg) - 1) * ('1 ' || (select unit from cfg))::interval,
      date_trunc((select unit from cfg), (select d from today)),
      ('1 ' || (select unit from cfg))::interval
    )::date as bucket
  ),
  events as (
    select t.trade_date as event_date
    from trade_records t
    where (select basis from cfg) = 'trade'
    union all
    select (c.created_at at time zone 'Asia/Seoul')::date as event_date
    from customers c
    where (select basis from cfg) = 'registration'
  ),
  counts as (
    select
      date_trunc((select unit from cfg), e.event_date)::date as bucket,
      count(*)::bigint as c
    from events e
    where e.event_date >= (select min(bucket) from series)
    group by 1
  )
  select s.bucket, coalesce(c.c, 0)::bigint as count
  from series s
  left join counts c on c.bucket = s.bucket
  order by s.bucket;
$$;
