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
