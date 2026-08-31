import "server-only";

import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeCustomerAnalytics, type CustomerAnalytics } from "@/lib/analytics/summary";

/**
 * 종합 분석 화면용 집계. 집계는 전부 PostgreSQL(customer_analytics())에서
 * 수행하며, 거래 데이터를 브라우저로 내려 합산하지 않는다.
 */
export async function getCustomerAnalytics(): Promise<QueryResult<CustomerAnalytics>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("customer_analytics");

  if (error) {
    console.error("[analytics] 조회 실패:", error.message);
    if (error.code === "PGRST202" || error.code === "42883") {
      return {
        ok: false,
        error: "이 기능은 데이터베이스 마이그레이션(0018)이 필요합니다. supabase/migrations 를 확인하세요.",
      };
    }
    return {
      ok: false,
      error: "분석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: normalizeCustomerAnalytics(data) };
}
