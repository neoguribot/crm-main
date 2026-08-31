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
