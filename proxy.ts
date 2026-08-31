import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 proxy (구 middleware). 모든 요청에서 Supabase 세션을 갱신하고
 * 보호 경로 접근을 통제한다.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에서 실행:
     * - _next/static, _next/image (빌드 산출물)
     * - favicon.ico, 이미지 파일
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
