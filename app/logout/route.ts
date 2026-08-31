import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * 로그아웃. 세션을 종료하고 /login 으로 이동한다.
 * POST 로만 처리한다(링크 클릭·프리페치로 인한 우발적 로그아웃 방지).
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
