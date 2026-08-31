import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * 브라우저(Client Component)용 Supabase 클라이언트.
 *
 * anon 키를 사용하며 모든 접근은 RLS 정책으로 통제된다.
 * Client Component 안에서만 호출한다.
 */
export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
