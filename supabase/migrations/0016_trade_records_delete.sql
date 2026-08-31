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
