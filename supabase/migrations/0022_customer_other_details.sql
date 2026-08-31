-- =====================================================================
-- 0022_customer_other_details.sql
-- 고객 등록/수정 화면에서 유입 경로·방문 목적의 "기타" 선택 시 세부 내용을
-- 입력할 수 있도록 컬럼을 추가한다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.customers
  add column if not exists inflow_channel_detail text,
  add column if not exists purchase_purpose_detail text;
