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
