-- =====================================================================
-- 0029_marketing_settings.sql
-- 마케팅 자동화 3: 매장별 발송 설정.
--
-- users(직원 프로필) 테이블에 발송에 필요한 표시·식별 값을 더한다.
-- - store_name    : 메시지 서명에 들어갈 매장 이름 (예: "제일금거래소 일루이 대전관저점")
-- - sender_phone  : 발신번호(사전 등록된 것). SMS 폴백 발송에 쓴다.
-- - kakao_pf_id   : 솔라피에 등록한 카카오 알림톡 발신 프로필(채널) 키
--
-- 발신대행사 API Key/Secret 은 비밀값이라 여기 저장하지 않고 환경변수
-- (SOLAPI_API_KEY / SOLAPI_API_SECRET)로 둔다.
--
-- 여러 번 실행해도 안전하도록 작성. 되돌리기는 supabase/README.md 참고.
-- =====================================================================

alter table public.users
  add column if not exists store_name   text,
  add column if not exists sender_phone text,
  add column if not exists kakao_pf_id  text;
