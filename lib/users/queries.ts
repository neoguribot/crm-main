import "server-only";

import type { AppUser } from "@/lib/types/database";
import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COLUMNS = "id, name, registered_on, monthly_sales_goal::text, created_at, updated_at";

/** 로그인한 사용자(직원)의 프로필. RLS(users_select_own)로 본인 행만 조회된다. */
export async function getCurrentAppUser(): Promise<QueryResult<AppUser | null>> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: true, data: null };
  }

  const { data, error } = await supabase
    .from("users")
    .select(COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[users] 프로필 조회 실패:", error.message);
    return {
      ok: false,
      error: "사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: (data as AppUser | null) ?? null };
}
