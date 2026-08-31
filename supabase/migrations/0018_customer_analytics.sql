-- =====================================================================
-- 0018_customer_analytics.sql
-- 종합 분석 화면용 RPC. 성별/등급/유입경로/연령대 분포와 누적 거래액 상위
-- 고객 10명을 한 번의 호출로 집계한다(거래 데이터를 브라우저로 내려
-- 합산하지 않음). RLS(SECURITY INVOKER)로 로그인 사용자 범위만 집계된다.
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
  grades as (
    select jsonb_build_object(
      'VIP',  count(*) filter (where grade = 'VIP'),
      '우수', count(*) filter (where grade = '우수'),
      '일반', count(*) filter (where grade = '일반'),
      '신규', count(*) filter (where grade = '신규'),
      'NONE', count(*) filter (where grade is null)
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
  )
  select jsonb_build_object(
    'customer_count', (select count(*) from customers),
    'gender_counts', (select g from genders),
    'grade_counts', (select g from grades),
    'channel_counts', (select g from channels),
    'age_bucket_counts', (select g from ages),
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
    )
  );
$$;
