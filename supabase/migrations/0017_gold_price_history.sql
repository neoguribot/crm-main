-- =====================================================================
-- 0017_gold_price_history.sql
-- 시세는 변동값이라 등록할 때마다 새 이력으로 쌓여야 하는데(문서 9번:
-- "시세 테이블: 등록 번호(PK), 등록일시(Not Null, 자동), 시세"), 기존 구현은
-- (owner_id, price_date) 유니크 제약 + upsert 라서 같은 날 다시 저장하면
-- 기존 값을 덮어썼다. 등록일시(timestamptz) 기준으로 매번 새 행을 추가하는
-- 구조로 바꾼다. 오탈자 등 실수 교정은 이미 있는 수정/삭제 기능으로 한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.gold_prices
  add column if not exists registered_at timestamptz;

update public.gold_prices
  set registered_at = (price_date::timestamp at time zone 'Asia/Seoul')
  where registered_at is null;

alter table public.gold_prices
  alter column registered_at set default now();
alter table public.gold_prices
  alter column registered_at set not null;

drop index if exists public.uq_gold_prices_owner_date;
drop index if exists public.idx_gold_prices_owner_date_desc;

alter table public.gold_prices drop column if exists price_date;

create index if not exists idx_gold_prices_owner_registered_at_desc
  on public.gold_prices (owner_id, registered_at desc);
