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
