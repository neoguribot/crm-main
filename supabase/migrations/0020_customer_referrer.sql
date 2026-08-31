-- =====================================================================
-- 0020_customer_referrer.sql
-- 클라이언트 추가 요구사항(dev_spec_addendum.md 5번): 고객 간 추천인 연결.
-- 자유 텍스트가 아니라 기존 고객과의 자기참조 FK로만 연결한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.customers
  add column if not exists referred_by_customer_id uuid
    references public.customers (id) on delete set null;

create index if not exists idx_customers_owner_referred_by
  on public.customers (owner_id, referred_by_customer_id);
