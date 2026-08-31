/**
 * Supabase 공개 환경변수에 안전하게 접근한다.
 *
 * - 모듈 import 시점에는 검사하지 않는다(빌드가 불필요하게 실패하지 않도록).
 * - 실제로 Supabase 클라이언트를 만들 때 호출되며, 값이 없으면 명확한 오류를 던진다.
 * - 여기서 다루는 값은 브라우저에 노출되어도 되는 URL 과 공개(anon) 키뿐이다.
 *   service_role 등 비밀 키는 이 파일에서 다루지 않는다.
 */

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Supabase 환경변수가 설정되지 않았습니다: ${missing}. ` +
        `.env.local 파일에 값을 채워 주세요 (.env.example 참고).`,
    );
  }

  return { url, anonKey };
}
