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
