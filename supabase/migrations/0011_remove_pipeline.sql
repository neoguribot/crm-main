-- =====================================================================
-- 0011_remove_pipeline.sql
-- /pipeline(영업 파이프라인) 기능 삭제 확정(0번 표)에 따라 관련 스키마 제거.
-- customer_stage는 등급/라벨과 무관한 별개 개념이었고, 파이프라인 화면
-- 전용이었으므로 화면 삭제와 함께 제거한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

drop index if exists public.idx_customers_owner_stage;

alter table public.customers drop column if exists stage;

drop type if exists public.customer_stage;
