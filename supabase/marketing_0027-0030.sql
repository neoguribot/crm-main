-- =====================================================================
-- 마케팅 자동화 마이그레이션 묶음 (0027 ~ 0030)
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 한 번에 실행.
-- 넷 다 멱등(재실행 안전). 개별 파일은 migrations/0027~0030 참고.
-- =====================================================================


-- =====================================================================
-- 0027_message_templates.sql
-- 마케팅 자동화 1: 고객 연락 메시지 템플릿.
--
-- - body 는 "{이름}님, ..." 처럼 변수 토큰을 포함하는 원문. 앱(lib/messaging/
--   render.ts)이 고객·시세·일정 값으로 치환한다.
-- - channel: ALIMTALK(카카오 알림톡) / SMS / MANUAL(수동 복사·CSV).
-- - kakao_template_id: 발신대행사(솔라피)에 등록·승인된 알림톡 템플릿 코드.
--   ALIMTALK 인데 값이 없으면 앱이 발송을 MANUAL 로 처리한다.
-- - event_type(1~7): 특정 일정 종류에 연결된 템플릿(선택). 발송 대상 자동 매칭용.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

create table if not exists public.message_templates (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 100),
  channel           text not null default 'ALIMTALK'
                      check (channel in ('ALIMTALK', 'SMS', 'MANUAL')),
  body              text not null check (char_length(body) between 1 and 2000),
  kakao_template_id text,
  event_type        smallint check (event_type between 1 and 7),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace trigger trg_message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

create index if not exists idx_message_templates_owner
  on public.message_templates (owner_id, is_active);

alter table public.message_templates enable row level security;

do $$
declare pol text;
begin
  pol := 'message_templates_select_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_templates' and policyname=pol) then
    create policy "message_templates_select_own"
      on public.message_templates for select to authenticated
      using (owner_id = (select auth.uid()));
  end if;

  pol := 'message_templates_insert_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_templates' and policyname=pol) then
    create policy "message_templates_insert_own"
      on public.message_templates for insert to authenticated
      with check (owner_id = (select auth.uid()));
  end if;

  pol := 'message_templates_update_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_templates' and policyname=pol) then
    create policy "message_templates_update_own"
      on public.message_templates for update to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;

  pol := 'message_templates_delete_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_templates' and policyname=pol) then
    create policy "message_templates_delete_own"
      on public.message_templates for delete to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;


-- =====================================================================
-- 0028_message_log.sql
-- 마케팅 자동화 2: 메시지 발송 이력.
--
-- 한 행 = 고객 1명에게 보낸(또는 보내려 한) 메시지 1건.
-- - status: PENDING(생성됨) / SENT(발송 성공) / FAILED(발송 실패) /
--   MANUAL(발신대행사 미설정 등으로 수동 복사·CSV 로 전달)
-- - rendered_body: 변수 치환이 끝난 실제 문구(사후 확인·수동 복사용)
-- - customer_id/template_id 는 삭제돼도 이력은 남도록 on delete set null
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

create table if not exists public.message_log (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid()
                        references auth.users (id) on delete cascade,
  customer_id         uuid references public.customers (id) on delete set null,
  template_id         uuid references public.message_templates (id) on delete set null,
  channel             text not null
                        check (channel in ('ALIMTALK', 'SMS', 'MANUAL')),
  to_phone            text not null,
  rendered_body       text not null,
  status              text not null default 'PENDING'
                        check (status in ('PENDING', 'SENT', 'FAILED', 'MANUAL')),
  provider            text,
  provider_message_id text,
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists idx_message_log_owner_created
  on public.message_log (owner_id, created_at desc);
create index if not exists idx_message_log_customer
  on public.message_log (customer_id);

alter table public.message_log enable row level security;

do $$
declare pol text;
begin
  pol := 'message_log_select_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_log' and policyname=pol) then
    create policy "message_log_select_own"
      on public.message_log for select to authenticated
      using (owner_id = (select auth.uid()));
  end if;

  pol := 'message_log_insert_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_log' and policyname=pol) then
    create policy "message_log_insert_own"
      on public.message_log for insert to authenticated
      with check (owner_id = (select auth.uid()));
  end if;

  pol := 'message_log_update_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_log' and policyname=pol) then
    create policy "message_log_update_own"
      on public.message_log for update to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;

  pol := 'message_log_delete_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='message_log' and policyname=pol) then
    create policy "message_log_delete_own"
      on public.message_log for delete to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;


-- =====================================================================
-- 0029_marketing_settings.sql
-- 마케팅 자동화 3: 매장별 발송 설정.
--
-- users(직원 프로필) 테이블에 발송에 필요한 표시·식별 값을 더한다.
-- - store_name    : 메시지 서명에 들어갈 매장 이름 (예: "제일금거래소 일루이 대전관저점")
-- - sender_phone  : 발신번호(사전 등록된 것). SMS 폴백 발송에 쓴다.
-- - kakao_pf_id   : 솔라피에 등록한 카카오 알림톡 발신 프로필(채널) 키
--
-- 발신대행사 API Key/Secret 은 비밀값이라 여기 저장하지 않고 환경변수
-- (SOLAPI_API_KEY / SOLAPI_API_SECRET)로 둔다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.users
  add column if not exists store_name   text,
  add column if not exists sender_phone text,
  add column if not exists kakao_pf_id  text;


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
