import "server-only";

import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizeSegments,
  type Segment,
} from "@/lib/marketing/segment-defs";

export type { Segment, SegmentKey, SegmentCustomer } from "@/lib/marketing/segment-defs";

/** 로그인 사용자의 프로모션 세그먼트. 집계는 marketing_segments() RPC 에서 수행. */
export async function getMarketingSegments(): Promise<QueryResult<Segment[]>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("marketing_segments");

  if (error) {
    console.error("[marketing] 세그먼트 조회 실패:", error.message);
    if (error.code === "PGRST202" || error.code === "42883") {
      return {
        ok: false,
        error:
          "이 기능에는 마이그레이션 0030 이 필요합니다. supabase/migrations 를 확인하세요.",
      };
    }
    return {
      ok: false,
      error: "세그먼트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: normalizeSegments(data) };
}
