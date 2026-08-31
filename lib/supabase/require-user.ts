import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * 서버에서 인증 사용자를 확인한다. 없으면 /login 으로 보낸다.
 * proxy.ts 가 이미 보호 경로를 막지만, 페이지·액션에서 한 번 더 확인한다.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
