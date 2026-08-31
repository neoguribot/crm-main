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
