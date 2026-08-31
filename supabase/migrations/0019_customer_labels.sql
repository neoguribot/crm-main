-- =====================================================================
-- 0019_customer_labels.sql
-- 클라이언트 추가 요구사항(dev_spec_addendum.md 1번): 단일 grade(VIP/우수/
-- 일반/신규)를 두 독립 축으로 분리한다.
--
-- - frequency_label(빈도 라벨): 신규/단골. 누적 거래 횟수 기준(앱에서 계산해
--   추천, 저장은 수동 선택값). 기본값 '신규'.
-- - revenue_label(매출 라벨): 일반/우수/VIP. 최근 3개월(캘린더 월 기준)
--   판매+매입 합산 거래액 기준(앱에서 계산해 추천). 기본값 '일반'.
--
-- 기존 grade와 동일하게 항상 DB에 저장하고(수동 override 가능), 자동 추천은
-- 조회 시점에 앱에서 계산해 참고 배지로만 보여준다. 단, grade와 달리 두 값
-- 모두 NOT NULL(미지정 상태 없음 — "기본값" 요구사항 반영).
--
-- customer_analytics() RPC(0018)도 grade_counts → frequency_counts/
-- revenue_counts 두 키로 재작성한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.customers
  add column if not exists frequency_label text not null default '신규'
    check (frequency_label in ('신규', '단골'));

alter table public.customers
  add column if not exists revenue_label text not null default '일반'
    check (revenue_label in ('일반', '우수', 'VIP'));

do $$ begin
  alter table public.customers drop constraint if exists customers_grade_check;
exception when undefined_object then null;
end $$;

alter table public.customers drop column if exists grade;

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
  )
  select jsonb_build_object(
    'customer_count', (select count(*) from customers),
    'gender_counts', (select g from genders),
    'frequency_counts', (select g from frequencies),
    'revenue_counts', (select g from revenues),
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
