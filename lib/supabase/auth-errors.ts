import type { AuthError } from "@supabase/supabase-js";

/**
 * Supabase 인증 오류를 사용자에게 보여줄 한국어 메시지로 변환한다.
 * 로그인 실패의 구체적 원인(이메일 없음 / 비밀번호 틀림)은 구분하지 않는다(보안).
 */
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
    case "user_not_found":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "email_not_confirmed":
      return "이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "validation_failed":
      return "입력한 값을 확인해 주세요.";
    default:
      if (error.status === 400) {
        return "이메일 또는 비밀번호가 올바르지 않습니다.";
      }
      return "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}
