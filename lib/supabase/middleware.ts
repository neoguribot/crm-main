import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { HOME_PATH } from "@/lib/constants";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/** 로그인이 필요한 경로 (접두어 일치) */
const PROTECTED_PREFIXES = [
  "/home",
  "/customers",
  "/transactions",
  "/prices",
  "/calendar",
  "/analytics",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 매 요청마다 Supabase 세션을 갱신하고, 인증 상태에 따라 경로를 통제한다.
 * (Next.js 16 의 proxy.ts 에서 호출 — 과거의 middleware.ts 를 대체)
 *
 * - 세션 쿠키를 새로 고쳐 만료를 방지한다.
 * - 비로그인 사용자가 보호 경로에 접근하면 /login 으로 보낸다.
 * - 로그인 사용자가 /login 에 접근하면 홈(HOME_PATH)으로 보낸다.
 * - 실제 인증 검증은 각 서버 컴포넌트에서 supabase.auth.getUser() 로 다시 확인한다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() 는 Supabase 서버에 토큰 유효성을 확인한다(쿠키 존재만 신뢰하지 않음).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = HOME_PATH;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
