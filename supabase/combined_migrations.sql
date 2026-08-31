-- 제일금거래소 CRM — 전체 마이그레이션 통합본 (0001~0025)
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 실행
-- 각 마이그레이션은 멱등이라 재실행 안전



-- ============================================================
-- 0001_initial_schema.sql
-- ============================================================

-- =====================================================================
-- 0001_initial_schema.sql
-- 고객관리 CRM 최초 스키마: customers, trade_records, enum, 인덱스,
-- updated_at 트리거, RLS 활성화 및 정책.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행 (또는 supabase db push).
-- 이 파일은 여러 번 실행해도 안전하도록 작성했다(이미 존재하는 객체는 건너뜀).
-- 파괴적인 DROP 문은 포함하지 않는다. 롤백 방법은 supabase/README.md 참고.
-- 스키마 변경은 이 파일을 수정하지 말고 0002_*.sql 등 새 파일로 추가한다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extension
-- gen_random_uuid() 는 PostgreSQL 13+ 코어 함수이며 Supabase 에 기본 포함되어
-- 있어 별도 extension 이 필요 없다. 방어적으로 pgcrypto 를 보장한다(있으면 무시).
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Enum 타입
-- CREATE TYPE 은 중복 시 오류가 나므로 duplicate_object 예외를 무시한다.
-- ---------------------------------------------------------------------
do $$ begin
  create type public.inflow_channel as enum
    ('CARROT_MARKET', 'NAVER_PLACE', 'REFERRAL', 'WALK_IN', 'OTHER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.purchase_purpose as enum
    ('WEDDING', 'FIRST_BIRTHDAY', 'INVESTMENT', 'SELLING', 'OTHER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.trade_type as enum ('SALE', 'PURCHASE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.item_type as enum
    ('GOLD_BAR', 'GOLD_24K_JEWELRY', 'GOLD_18K', 'GOLD_14K', 'SILVER', 'OTHER');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. updated_at 자동 갱신 함수
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. customers 테이블
-- owner_id 는 로그인 사용자(auth.users). 기본값 auth.uid() 로 채워지므로
-- 클라이언트가 owner_id 를 보내지 않아도 되고, 보내더라도 RLS 로 검증된다.
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid()
                       references auth.users (id) on delete cascade,
  name               text not null check (char_length(btrim(name)) > 0),
  phone              text not null check (char_length(btrim(phone)) > 0),
  inflow_channel     public.inflow_channel not null,
  first_visit_date   date not null,
  purchase_purposes  public.purchase_purpose[] not null default '{}',
  last_contact_date  date,
  next_event_date    date,
  memo               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. trade_records 테이블
-- customer_id 의 삭제 정책은 기본값(NO ACTION): 거래 내역이 있는 고객은
-- 삭제할 수 없다(문 종료 시점 검사). 앱에는 삭제 기능도, DELETE RLS 정책도
-- 없으므로 일반 사용에서는 이 상황이 발생하지 않는다. 계정 삭제 시에는
-- owner_id 의 on delete cascade 로 거래가 함께 제거되어 정상 진행된다.
-- ---------------------------------------------------------------------
create table if not exists public.trade_records (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  customer_id  uuid not null references public.customers (id),
  trade_type   public.trade_type not null,
  item_type    public.item_type not null,
  purity       numeric(5, 2) check (purity is null or (purity >= 0 and purity <= 100)),
  weight       numeric(10, 3) not null check (weight > 0),
  amount       numeric(15, 0) not null check (amount >= 0),
  trade_date   date not null,
  memo         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. updated_at 트리거 (PostgreSQL 14+ 의 CREATE OR REPLACE TRIGGER)
-- ---------------------------------------------------------------------
create or replace trigger trg_customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create or replace trigger trg_trade_records_set_updated_at
  before update on public.trade_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. 인덱스
-- 모든 조회는 RLS 로 owner 범위가 걸리므로, owner_id 를 선두로 둔 복합
-- 인덱스라야 실제로 쓰인다. 선택 이유는 supabase/README.md 참고.
-- ---------------------------------------------------------------------
create index if not exists idx_customers_owner_id
  on public.customers (owner_id);
create index if not exists idx_customers_owner_name
  on public.customers (owner_id, name);
create index if not exists idx_customers_owner_phone
  on public.customers (owner_id, phone);
create index if not exists idx_customers_owner_first_visit_date
  on public.customers (owner_id, first_visit_date);
create index if not exists idx_customers_owner_next_event_date
  on public.customers (owner_id, next_event_date);

create index if not exists idx_trade_records_customer_id
  on public.trade_records (customer_id);
create index if not exists idx_trade_records_owner_trade_date
  on public.trade_records (owner_id, trade_date desc);

-- ---------------------------------------------------------------------
-- 7. RLS 활성화
-- ---------------------------------------------------------------------
alter table public.customers     enable row level security;
alter table public.trade_records enable row level security;

-- ---------------------------------------------------------------------
-- 8. RLS 정책
-- - 비로그인(anon) 역할에는 어떤 정책도 부여하지 않아 전면 차단된다.
-- - authenticated 역할은 자신의 owner_id 행만 SELECT/INSERT/UPDATE 가능.
-- - DELETE 정책이 없으므로 삭제는 앱에서 불가능하다.
-- - auth.uid() 는 (select auth.uid()) 로 감싸 쿼리당 1회만 평가되게 한다.
-- CREATE POLICY 는 중복 시 오류가 나므로 pg_policies 로 존재 여부를 확인한다.
-- ---------------------------------------------------------------------

-- customers: 조회
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_select_own'
  ) then
    create policy "customers_select_own"
      on public.customers for select to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;

-- customers: 생성 (owner_id 가 본인이어야 함)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_insert_own'
  ) then
    create policy "customers_insert_own"
      on public.customers for insert to authenticated
      with check (owner_id = (select auth.uid()));
  end if;
end $$;

-- customers: 수정
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_update_own'
  ) then
    create policy "customers_update_own"
      on public.customers for update to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;
end $$;

-- trade_records: 조회
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trade_records'
      and policyname = 'trade_records_select_own'
  ) then
    create policy "trade_records_select_own"
      on public.trade_records for select to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;

-- trade_records: 생성 (owner 일치 + customer_id 가 본인 고객인지 검증)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trade_records'
      and policyname = 'trade_records_insert_own'
  ) then
    create policy "trade_records_insert_own"
      on public.trade_records for insert to authenticated
      with check (
        owner_id = (select auth.uid())
        and exists (
          select 1 from public.customers c
          where c.id = customer_id
            and c.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;

-- trade_records: 수정 (owner 일치 + customer_id 가 본인 고객인지 검증)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trade_records'
      and policyname = 'trade_records_update_own'
  ) then
    create policy "trade_records_update_own"
      on public.trade_records for update to authenticated
      using (owner_id = (select auth.uid()))
      with check (
        owner_id = (select auth.uid())
        and exists (
          select 1 from public.customers c
          where c.id = customer_id
            and c.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;


-- ============================================================
-- 0002_dashboard_summary.sql
-- ============================================================

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


-- ============================================================
-- 0003_customer_delete.sql
-- ============================================================

-- =====================================================================
-- 0003_customer_delete.sql
-- 고객 삭제 허용 — 자기 고객이면 거래 기록이 있어도 삭제 가능.
--
-- 1) trade_records.customer_id FK 를 ON DELETE CASCADE 로 바꾼다.
--    → 고객을 삭제하면 그 고객의 거래 기록도 함께 삭제된다(되돌릴 수 없음).
--    trade_records 를 직접 삭제하는 정책은 여전히 없다(거래만 따로 지울 수는 없음).
-- 2) customers 에 DELETE 정책을 추가한다(자기 owner_id 행만).
--
-- 기존 마이그레이션(0001)은 수정하지 않는다. 데이터를 지우는 DROP TABLE/TRUNCATE 없음.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 여러 번 실행해도 안전.
-- 되돌리려면(자동 실행 금지):
--   drop policy if exists "customers_delete_own" on public.customers;
--   -- FK 를 NO ACTION 으로 되돌리려면 아래를 직접 실행:
--   -- alter table public.trade_records drop constraint trade_records_customer_id_fkey;
--   -- alter table public.trade_records add constraint trade_records_customer_id_fkey
--   --   foreign key (customer_id) references public.customers (id);
-- =====================================================================

-- 1) FK → ON DELETE CASCADE (이미 cascade 면 건너뜀)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'trade_records'
      and c.conname = 'trade_records_customer_id_fkey'
      and c.confdeltype = 'c'  -- 'c' = CASCADE
  ) then
    alter table public.trade_records
      drop constraint if exists trade_records_customer_id_fkey;
    alter table public.trade_records
      add constraint trade_records_customer_id_fkey
      foreign key (customer_id) references public.customers (id)
      on delete cascade;
  end if;
end $$;

-- 2) customers DELETE 정책
do $$
begin
  -- 이전 버전(거래 없을 때만 삭제) 정책이 있으면 제거
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_delete_own_when_no_trades'
  ) then
    drop policy "customers_delete_own_when_no_trades" on public.customers;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_delete_own'
  ) then
    create policy "customers_delete_own"
      on public.customers
      for delete
      to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;


-- ============================================================
-- 0004_customer_stage.sql
-- ============================================================

-- =====================================================================
-- 0004_customer_stage.sql
-- 고객 영업 파이프라인 — customers 에 stage(영업 단계) 컬럼 추가.
--
-- - 파이프라인 보드(/customers/pipeline)의 컬럼이 곧 이 값이다.
-- - 컬럼만 추가한다. RLS 는 기존 customers 정책(select/insert/update own)이
--   그대로 이 컬럼도 통제하므로 새 정책이 필요 없다.
-- - 기존 마이그레이션(0001~0003)은 수정하지 않는다. DROP TABLE/TRUNCATE 없음.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 여러 번 실행해도 안전.
-- 되돌리려면(자동 실행 금지):
--   alter table public.customers drop column if exists stage;
--   drop type if exists public.customer_stage;
-- =====================================================================

do $$ begin
  create type public.customer_stage as enum (
    'NEW_INQUIRY',
    'CONSULTING',
    'QUOTE_SENT',
    'PURCHASE_CONFIRMED',
    'AFTER_CARE'
  );
exception when duplicate_object then null;
end $$;

alter table public.customers
  add column if not exists stage public.customer_stage
  not null default 'NEW_INQUIRY';

-- 단계별 목록 조회 대비 인덱스(owner 범위 안에서).
create index if not exists idx_customers_owner_stage
  on public.customers (owner_id, stage);


-- ============================================================
-- 0005_customer_count_by_period.sql
-- ============================================================

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


-- ============================================================
-- 0006_price_targets_notifications.sql
-- ============================================================

-- =====================================================================
-- 0006_price_targets_notifications.sql
-- 고객 목표가격(매수 희망) + 금 시세 기록 + 직원 알림.
--
-- - price_targets  : 고객별 "금 한 돈이 ○○원까지 내려가면 사고 싶다" 값. 고객당 1개.
-- - gold_prices    : 일자별 순금(24K) 시세, 1돈(3.75g) 기준. 직원 수동 입력 또는 API.
-- - notifications  : 직원(owner)별 알림. 목표가 도달 시 앱(Server Action)에서 생성.
--
-- 금액은 numeric(15,0) (원, 소수점 없음). owner_id 는 auth.uid() 기본값 + RLS.
-- 이 파일은 여러 번 실행해도 안전하다. DROP 문 없음.
-- 되돌리려면(자동 실행 금지):
--   drop table if exists public.notifications;
--   drop table if exists public.gold_prices;
--   drop table if exists public.price_targets;
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. price_targets
-- ---------------------------------------------------------------------
create table if not exists public.price_targets (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid()
                         references auth.users (id) on delete cascade,
  customer_id          uuid not null
                         references public.customers (id) on delete cascade,
  target_price_per_don numeric(15, 0) not null check (target_price_per_don > 0),
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists uq_price_targets_customer
  on public.price_targets (customer_id);
create index if not exists idx_price_targets_owner
  on public.price_targets (owner_id);

create or replace trigger trg_price_targets_set_updated_at
  before update on public.price_targets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. gold_prices  (하루 한 건: owner + price_date 유니크)
-- ---------------------------------------------------------------------
create table if not exists public.gold_prices (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  price_date     date not null,
  price_per_don  numeric(15, 0) not null check (price_per_don > 0),
  source         text not null default 'MANUAL' check (source in ('MANUAL', 'API')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists uq_gold_prices_owner_date
  on public.gold_prices (owner_id, price_date);
create index if not exists idx_gold_prices_owner_date_desc
  on public.gold_prices (owner_id, price_date desc);

create or replace trigger trg_gold_prices_set_updated_at
  before update on public.gold_prices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. notifications
-- dedupe_key: 같은 사건을 두 번 알리지 않기 위한 키(예: 'target:<id>:<date>').
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  type          text not null,
  customer_id   uuid references public.customers (id) on delete cascade,
  title         text not null,
  body          text,
  dedupe_key    text,
  read_at       timestamptz,
  dismissed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create unique index if not exists uq_notifications_owner_dedupe
  on public.notifications (owner_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists idx_notifications_owner_created_desc
  on public.notifications (owner_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------
alter table public.price_targets  enable row level security;
alter table public.gold_prices    enable row level security;
alter table public.notifications  enable row level security;

do $$
declare
  t text;
  op text;
  pol text;
begin
  foreach t in array array['price_targets', 'gold_prices', 'notifications']
  loop
    -- select
    pol := t || '_select_own';
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=pol) then
      execute format('create policy %I on public.%I for select to authenticated using (owner_id = (select auth.uid()))', pol, t);
    end if;
    -- insert
    pol := t || '_insert_own';
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=pol) then
      execute format('create policy %I on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', pol, t);
    end if;
    -- update
    pol := t || '_update_own';
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=pol) then
      execute format('create policy %I on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', pol, t);
    end if;
    -- delete
    pol := t || '_delete_own';
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=pol) then
      execute format('create policy %I on public.%I for delete to authenticated using (owner_id = (select auth.uid()))', pol, t);
    end if;
  end loop;
end $$;


-- ============================================================
-- 0007_trade_item_revamp.sql
-- ============================================================

-- =====================================================================
-- 0007_trade_item_revamp.sql
-- 거래 항목 개편.
--
-- - item_type: enum → text 로 전환 (품목 목록이 자주 바뀌므로 앱(zod)에서 검증).
--   기존 값 매핑:  SILVER → SILVER_JEWELRY,  나머지는 코드 유지.
--   (24K 주얼리는 코드 GOLD_24K_JEWELRY 그대로, 표시명만 "24K(주얼리)" 로)
-- - unit_price (기준 단가, 원) 컬럼 추가. 기존 행은 NULL.
-- - item_detail (품목='OTHER' 일 때 세부 내용) 컬럼 추가.
-- - purity (순도) 컬럼 삭제 — 더 이상 쓰지 않는다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- 1. item_type: enum → text
alter table public.trade_records
  alter column item_type type text using item_type::text;

-- 2. 기존 값 매핑
update public.trade_records
  set item_type = 'SILVER_JEWELRY'
  where item_type = 'SILVER';

-- 3. 기준 단가
alter table public.trade_records
  add column if not exists unit_price numeric(15, 0)
    check (unit_price is null or unit_price >= 0);

-- 4. 기타 세부 내용
alter table public.trade_records
  add column if not exists item_detail text;

-- 5. 순도 삭제 (CHECK 제약도 함께 사라짐)
alter table public.trade_records
  drop column if exists purity;

-- 6. (선택) 더 이상 참조되지 않는 enum 타입 정리.
--    다른 객체가 참조 중이면 오류가 나므로 필요할 때 수동 실행:
--    drop type if exists public.item_type;


-- ============================================================
-- 0008_customer_fields_revamp.sql
-- ============================================================

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


-- ============================================================
-- 0009_missing_fields.sql
-- ============================================================

-- =====================================================================
-- 0009_missing_fields.sql
-- 원본 요구사항에는 있으나 기존 코드에는 없던 필드 추가.
--
-- - customers.gender   : 성별 (0=모름, 1=남성, 2=여성). 기본값 0.
-- - customers.grade    : 등급/라벨 (VIP/우수/일반/신규). 수동 입력, nullable.
-- - trade_records.status : 완료 여부 (1=완료, 2=진행중). 기본값 1(완료),
--     기존 행은 전부 완료로 백필한다(과거 거래는 이미 종결된 것으로 간주).
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. customers.gender
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists gender smallint not null default 0
    check (gender in (0, 1, 2));

-- ---------------------------------------------------------------------
-- 2. customers.grade
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists grade text
    check (grade is null or grade in ('VIP', '우수', '일반', '신규'));

-- ---------------------------------------------------------------------
-- 3. trade_records.status
-- ---------------------------------------------------------------------
alter table public.trade_records
  add column if not exists status smallint not null default 1
    check (status in (1, 2));


-- ============================================================
-- 0010_integer_codes.sql
-- ============================================================

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


-- ============================================================
-- 0011_remove_pipeline.sql
-- ============================================================

-- =====================================================================
-- 0011_remove_pipeline.sql
-- /pipeline(영업 파이프라인) 기능 삭제 확정(0번 표)에 따라 관련 스키마 제거.
-- customer_stage는 등급/라벨과 무관한 별개 개념이었고, 파이프라인 화면
-- 전용이었으므로 화면 삭제와 함께 제거한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

drop index if exists public.idx_customers_owner_stage;

alter table public.customers drop column if exists stage;

drop type if exists public.customer_stage;


-- ============================================================
-- 0012_customer_events.sql
-- ============================================================

-- =====================================================================
-- 0012_customer_events.sql
-- "다음 일정"을 고객당 단일 날짜(next_event_date)가 아니라, 여러 건을
-- 동시에 관리할 수 있는 별도 테이블로 분리한다. 문의/예약/맞춤주문/재방문/
-- 시세알림/생일/안부 등 종류별 구분이 가능하고, 진행 중인 거래(예: 맞춤
-- 주문)와 연동할 수 있도록 trade_id(nullable FK)를 둔다.
--
-- event_type 코드: 1=문의, 2=예약, 3=맞춤주문, 4=재방문, 5=시세알림,
--                   6=생일, 7=안부
--
-- 기존 customers.next_event_date 값은 이 테이블로 1건씩 이관한 뒤
-- 컬럼을 삭제한다(type=7 안부로 best-effort 이관 — 원래 세분화 정보가
-- 없었으므로 가장 일반적인 분류로 이관).
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. customer_events 테이블
-- ---------------------------------------------------------------------
create table if not exists public.customer_events (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  customer_id  uuid not null references public.customers (id) on delete cascade,
  trade_id     uuid references public.trade_records (id) on delete set null,
  event_type   smallint not null check (event_type between 1 and 7),
  event_date   date not null,
  memo         text,
  is_done      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace trigger trg_customer_events_set_updated_at
  before update on public.customer_events
  for each row execute function public.set_updated_at();

create index if not exists idx_customer_events_owner_date
  on public.customer_events (owner_id, event_date);
create index if not exists idx_customer_events_customer_id
  on public.customer_events (customer_id);
create index if not exists idx_customer_events_trade_id
  on public.customer_events (trade_id);

alter table public.customer_events enable row level security;

do $$
declare
  op text;
  pol text;
begin
  pol := 'customer_events_select_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_events' and policyname=pol) then
    create policy "customer_events_select_own"
      on public.customer_events for select to authenticated
      using (owner_id = (select auth.uid()));
  end if;

  pol := 'customer_events_insert_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_events' and policyname=pol) then
    create policy "customer_events_insert_own"
      on public.customer_events for insert to authenticated
      with check (
        owner_id = (select auth.uid())
        and exists (
          select 1 from public.customers c
          where c.id = customer_id and c.owner_id = (select auth.uid())
        )
      );
  end if;

  pol := 'customer_events_update_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_events' and policyname=pol) then
    create policy "customer_events_update_own"
      on public.customer_events for update to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;

  pol := 'customer_events_delete_own';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_events' and policyname=pol) then
    create policy "customer_events_delete_own"
      on public.customer_events for delete to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. 기존 next_event_date → customer_events 이관 (type=7 안부)
-- ---------------------------------------------------------------------
insert into public.customer_events (owner_id, customer_id, event_type, event_date)
select c.owner_id, c.id, 7, c.next_event_date
from public.customers c
where c.next_event_date is not null;

alter table public.customers drop column if exists next_event_date;
drop index if exists public.idx_customers_owner_next_event_date;


-- ============================================================
-- 0013_users_table.sql
-- ============================================================

-- =====================================================================
-- 0013_users_table.sql
-- 원본 요구사항의 "사용자 테이블"(문서 9번). 인증 자체는 Supabase Auth
-- (auth.users)가 담당하므로(문서 1번 기술 스택 확정), 이 테이블은 인증
-- 정보가 아니라 앱에서 쓰는 프로필/설정(이름, 목표값)만 저장한다.
--
-- 계정 생성은 "DB SQL로만"(문서 4번) — Supabase Auth에 사용자를 만들면
-- 아래 트리거가 프로필 행을 자동 생성해 별도 SQL을 한 번 더 실행할
-- 필요가 없게 한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

create table if not exists public.users (
  id                   uuid primary key references auth.users (id) on delete cascade,
  name                 text,
  registered_on        date not null default (now() at time zone 'Asia/Seoul')::date,
  monthly_sales_goal   numeric(15, 0) check (monthly_sales_goal is null or monthly_sales_goal >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace trigger trg_users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users'
      and policyname = 'users_select_own'
  ) then
    create policy "users_select_own"
      on public.users for select to authenticated
      using (id = (select auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users'
      and policyname = 'users_update_own'
  ) then
    create policy "users_update_own"
      on public.users for update to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- auth.users insert 시 프로필 행 자동 생성
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 기존에 이미 만들어진 auth.users 계정에 대한 백필
insert into public.users (id)
select u.id from auth.users u
left join public.users pu on pu.id = u.id
where pu.id is null;


-- ============================================================
-- 0014_last_contact_trigger.sql
-- ============================================================

-- =====================================================================
-- 0014_last_contact_trigger.sql
-- 마지막 연락일은 기본적으로 수동 입력이지만(문서 3-4), 신규 거래가
-- 등록되면 해당 거래일로 자동 갱신한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

create or replace function public.trade_records_touch_last_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers
    set last_contact_date = greatest(coalesce(last_contact_date, new.trade_date), new.trade_date)
    where id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists trg_trade_records_touch_last_contact on public.trade_records;
create trigger trg_trade_records_touch_last_contact
  after insert on public.trade_records
  for each row execute function public.trade_records_touch_last_contact();


-- ============================================================
-- 0015_dashboard_summary_v3.sql
-- ============================================================

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


-- ============================================================
-- 0016_trade_records_delete.sql
-- ============================================================

-- =====================================================================
-- 0016_trade_records_delete.sql
-- 거래관리 화면(문서 5번)에서 거래 삭제가 가능해야 하는데, 기존 스키마에는
-- trade_records 에 DELETE RLS 정책이 없었다(0001 주석: "앱에는 삭제 기능도,
-- DELETE RLS 정책도 없으므로"). 이번에 거래관리 페이지에서 삭제를 지원하므로
-- 정책을 추가한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trade_records'
      and policyname = 'trade_records_delete_own'
  ) then
    create policy "trade_records_delete_own"
      on public.trade_records for delete to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end $$;


-- ============================================================
-- 0017_gold_price_history.sql
-- ============================================================

-- =====================================================================
-- 0017_gold_price_history.sql
-- 시세는 변동값이라 등록할 때마다 새 이력으로 쌓여야 하는데(문서 9번:
-- "시세 테이블: 등록 번호(PK), 등록일시(Not Null, 자동), 시세"), 기존 구현은
-- (owner_id, price_date) 유니크 제약 + upsert 라서 같은 날 다시 저장하면
-- 기존 값을 덮어썼다. 등록일시(timestamptz) 기준으로 매번 새 행을 추가하는
-- 구조로 바꾼다. 오탈자 등 실수 교정은 이미 있는 수정/삭제 기능으로 한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.gold_prices
  add column if not exists registered_at timestamptz;

update public.gold_prices
  set registered_at = (price_date::timestamp at time zone 'Asia/Seoul')
  where registered_at is null;

alter table public.gold_prices
  alter column registered_at set default now();
alter table public.gold_prices
  alter column registered_at set not null;

drop index if exists public.uq_gold_prices_owner_date;
drop index if exists public.idx_gold_prices_owner_date_desc;

alter table public.gold_prices drop column if exists price_date;

create index if not exists idx_gold_prices_owner_registered_at_desc
  on public.gold_prices (owner_id, registered_at desc);


-- ============================================================
-- 0018_customer_analytics.sql
-- ============================================================

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


-- ============================================================
-- 0019_customer_labels.sql
-- ============================================================

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


-- ============================================================
-- 0020_customer_referrer.sql
-- ============================================================

-- =====================================================================
-- 0020_customer_referrer.sql
-- 클라이언트 추가 요구사항(dev_spec_addendum.md 5번): 고객 간 추천인 연결.
-- 자유 텍스트가 아니라 기존 고객과의 자기참조 FK로만 연결한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.customers
  add column if not exists referred_by_customer_id uuid
    references public.customers (id) on delete set null;

create index if not exists idx_customers_owner_referred_by
  on public.customers (owner_id, referred_by_customer_id);


-- ============================================================
-- 0021_dashboard_trade_counts.sql
-- ============================================================

-- =====================================================================
-- 0021_dashboard_trade_counts.sql
-- 홈 대시보드 "거래 수 현황" 표 반영: 거래 고객 수(distinct) 대신 거래 건수로
-- 집계하고, 진행 중 / 완료 거래 건수(전체 기간)를 추가한다.
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

    'trade_count_today', (
      select count(*) from trade_records t, seoul s
      where t.trade_date = s.today
    ),
    'trade_count_yesterday', (
      select count(*) from trade_records t, seoul s
      where t.trade_date = s.today - 1
    ),
    'trade_count_week', (
      select count(*) from trade_records t, bounds b, seoul s
      where t.trade_date >= b.week_start and t.trade_date <= s.today
    ),
    'trade_count_month', (
      select count(*) from trade_records t, bounds b, seoul s
      where t.trade_date >= b.month_start and t.trade_date <= s.today
    ),
    'trade_count_year', (
      select count(*) from trade_records t, bounds b, seoul s
      where t.trade_date >= b.year_start and t.trade_date <= s.today
    ),
    'trade_count_in_progress', (
      select count(*) from trade_records t where t.status = 2
    ),
    'trade_count_done', (
      select count(*) from trade_records t where t.status = 1
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


-- ============================================================
-- 0022_customer_other_details.sql
-- ============================================================

-- =====================================================================
-- 0022_customer_other_details.sql
-- 고객 등록/수정 화면에서 유입 경로·방문 목적의 "기타" 선택 시 세부 내용을
-- 입력할 수 있도록 컬럼을 추가한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.customers
  add column if not exists inflow_channel_detail text,
  add column if not exists purchase_purpose_detail text;


-- ============================================================
-- 0023_first_trade_date_trigger.sql
-- ============================================================

-- =====================================================================
-- 0023_first_trade_date_trigger.sql
-- 고객의 첫 거래가 등록되면 first_trade_date 를 그 거래일로 자동 갱신한다.
-- (0014 의 last_contact_date 트리거와 같은 패턴. 두 번째 이후 거래는 건드리지 않는다.)
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

create or replace function public.trade_records_touch_first_trade_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.trade_records where customer_id = new.customer_id) = 1 then
    update public.customers
      set first_trade_date = new.trade_date
      where id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trade_records_touch_first_trade_date on public.trade_records;
create trigger trg_trade_records_touch_first_trade_date
  after insert on public.trade_records
  for each row execute function public.trade_records_touch_first_trade_date();


-- ============================================================
-- 0024_dashboard_purpose_periods.sql
-- ============================================================

-- =====================================================================
-- 0024_dashboard_purpose_periods.sql
-- 홈 대시보드 "방문 목적별 고객 수"에 기간별(오늘/이번 주/이번 달/올해) 보기를
-- 추가하고, "최근 거래 내역"에 단가·완료 여부를 포함한다.
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
      t.unit_price::text as unit_price,
      t.weight::text as weight,
      t.amount::text as amount, t.status, t.trade_date, t.created_at,
      t.customer_id, c.name as customer_name
    from trade_records t
    join customers c on c.id = t.customer_id
    order by t.trade_date desc, t.created_at desc
    limit 5
  ),
  visitors_today as (
    select distinct t.customer_id from trade_records t, seoul s
    where t.trade_date = s.today
  ),
  visitors_week as (
    select distinct t.customer_id from trade_records t, bounds b, seoul s
    where t.trade_date >= b.week_start and t.trade_date <= s.today
  ),
  visitors_month as (
    select distinct t.customer_id from trade_records t, bounds b, seoul s
    where t.trade_date >= b.month_start and t.trade_date <= s.today
  ),
  visitors_year as (
    select distinct t.customer_id from trade_records t, bounds b, seoul s
    where t.trade_date >= b.year_start and t.trade_date <= s.today
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

    'purpose_counts_today', (
      select jsonb_build_object(
        'PURCHASE',       count(*) filter (where 'PURCHASE'       = any(c.purchase_purposes)),
        'GOLD_BAR',       count(*) filter (where 'GOLD_BAR'       = any(c.purchase_purposes)),
        'STONE_PRODUCT',  count(*) filter (where 'STONE_PRODUCT'  = any(c.purchase_purposes)),
        'CUSTOM_JEWELRY', count(*) filter (where 'CUSTOM_JEWELRY' = any(c.purchase_purposes)),
        'OTHER',          count(*) filter (where 'OTHER'          = any(c.purchase_purposes))
      )
      from customers c
      join visitors_today v on v.customer_id = c.id
    ),
    'purpose_counts_week', (
      select jsonb_build_object(
        'PURCHASE',       count(*) filter (where 'PURCHASE'       = any(c.purchase_purposes)),
        'GOLD_BAR',       count(*) filter (where 'GOLD_BAR'       = any(c.purchase_purposes)),
        'STONE_PRODUCT',  count(*) filter (where 'STONE_PRODUCT'  = any(c.purchase_purposes)),
        'CUSTOM_JEWELRY', count(*) filter (where 'CUSTOM_JEWELRY' = any(c.purchase_purposes)),
        'OTHER',          count(*) filter (where 'OTHER'          = any(c.purchase_purposes))
      )
      from customers c
      join visitors_week v on v.customer_id = c.id
    ),
    'purpose_counts_month', (
      select jsonb_build_object(
        'PURCHASE',       count(*) filter (where 'PURCHASE'       = any(c.purchase_purposes)),
        'GOLD_BAR',       count(*) filter (where 'GOLD_BAR'       = any(c.purchase_purposes)),
        'STONE_PRODUCT',  count(*) filter (where 'STONE_PRODUCT'  = any(c.purchase_purposes)),
        'CUSTOM_JEWELRY', count(*) filter (where 'CUSTOM_JEWELRY' = any(c.purchase_purposes)),
        'OTHER',          count(*) filter (where 'OTHER'          = any(c.purchase_purposes))
      )
      from customers c
      join visitors_month v on v.customer_id = c.id
    ),
    'purpose_counts_year', (
      select jsonb_build_object(
        'PURCHASE',       count(*) filter (where 'PURCHASE'       = any(c.purchase_purposes)),
        'GOLD_BAR',       count(*) filter (where 'GOLD_BAR'       = any(c.purchase_purposes)),
        'STONE_PRODUCT',  count(*) filter (where 'STONE_PRODUCT'  = any(c.purchase_purposes)),
        'CUSTOM_JEWELRY', count(*) filter (where 'CUSTOM_JEWELRY' = any(c.purchase_purposes)),
        'OTHER',          count(*) filter (where 'OTHER'          = any(c.purchase_purposes))
      )
      from customers c
      join visitors_year v on v.customer_id = c.id
    ),

    'upcoming_event_count', (
      select count(*)
      from customer_events e, seoul s
      where e.is_done = false
        and e.event_date >= s.today
        and e.event_date <= s.today + 30
    ),

    'trade_count_today', (
      select count(*) from trade_records t, seoul s
      where t.trade_date = s.today
    ),
    'trade_count_yesterday', (
      select count(*) from trade_records t, seoul s
      where t.trade_date = s.today - 1
    ),
    'trade_count_week', (
      select count(*) from trade_records t, bounds b, seoul s
      where t.trade_date >= b.week_start and t.trade_date <= s.today
    ),
    'trade_count_month', (
      select count(*) from trade_records t, bounds b, seoul s
      where t.trade_date >= b.month_start and t.trade_date <= s.today
    ),
    'trade_count_year', (
      select count(*) from trade_records t, bounds b, seoul s
      where t.trade_date >= b.year_start and t.trade_date <= s.today
    ),
    'trade_count_in_progress', (
      select count(*) from trade_records t where t.status = 2
    ),
    'trade_count_done', (
      select count(*) from trade_records t where t.status = 1
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


-- ============================================================
-- 0025_customer_analytics_v3.sql
-- ============================================================

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
