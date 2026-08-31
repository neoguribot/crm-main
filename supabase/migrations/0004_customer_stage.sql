-- =====================================================================
-- 0004_customer_stage.sql
-- 고객 영업 파이프라인 — customers 에 stage(영업 단계) 컬럼 추가.
--
-- - 파이프라인 보드(/customers/pipeline)의 컬럼이 곧 이 값이다.
-- - 컬럼만 추가한다. RLS 는 기존 customers 정책(select/insert/update own)이
--   그대로 이 컬럼도 통제하므로 새 정책이 필요 없다.
-- - 기존 마이그레이션(0001~0003)은 수정하지 않는다. DROP TABLE/TRUNCATE 없음.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 여러 번 실행해도 안전.
-- 되돌리려면(자동 실행 금지):
--   alter table public.customers drop column if exists stage;
--   drop type if exists public.customer_stage;
-- =====================================================================

do $$ begin
  create type public.customer_stage as enum (
    'NEW_INQUIRY',
    'CONSULTING',
    'QUOTE_SENT',
    'PURCHASE_CONFIRMED',
    'AFTER_CARE'
  );
exception when duplicate_object then null;
end $$;

alter table public.customers
  add column if not exists stage public.customer_stage
  not null default 'NEW_INQUIRY';

-- 단계별 목록 조회 대비 인덱스(owner 범위 안에서).
create index if not exists idx_customers_owner_stage
  on public.customers (owner_id, stage);
