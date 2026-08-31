import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * 서버(Server Component / Server Action / Route Handler)용 Supabase 클라이언트.
 *
 * - Next.js 요청 쿠키에서 세션을 읽는다.
 * - anon 키를 사용하며 접근은 RLS 로 통제된다. service_role 은 사용하지 않는다.
 * - Server Component 에서는 쿠키 쓰기가 허용되지 않으므로 setAll 은 조용히 무시하고,
 *   세션 갱신은 미들웨어(추후 단계)에서 처리한다.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component 렌더링 중에는 쿠키를 쓸 수 없다. 미들웨어가 세션 갱신을 담당한다.
        }
      },
    },
  });
}
