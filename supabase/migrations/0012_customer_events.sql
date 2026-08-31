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
