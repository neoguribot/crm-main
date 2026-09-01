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
