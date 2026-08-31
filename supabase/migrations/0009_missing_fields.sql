-- =====================================================================
-- 0009_missing_fields.sql
-- 원본 요구사항에는 있으나 기존 코드에는 없던 필드 추가.
--
-- - customers.gender   : 성별 (0=모름, 1=남성, 2=여성). 기본값 0.
-- - customers.grade    : 등급/라벨 (VIP/우수/일반/신규). 수동 입력, nullable.
-- - trade_records.status : 완료 여부 (1=완료, 2=진행중). 기본값 1(완료),
--     기존 행은 전부 완료로 백필한다(과거 거래는 이미 종결된 것으로 간주).
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. customers.gender
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists gender smallint not null default 0
    check (gender in (0, 1, 2));

-- ---------------------------------------------------------------------
-- 2. customers.grade
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists grade text
    check (grade is null or grade in ('VIP', '우수', '일반', '신규'));

-- ---------------------------------------------------------------------
-- 3. trade_records.status
-- ---------------------------------------------------------------------
alter table public.trade_records
  add column if not exists status smallint not null default 1
    check (status in (1, 2));
