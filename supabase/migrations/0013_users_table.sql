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
