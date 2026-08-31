import "server-only";

import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizeDashboardSummary,
  type DashboardSummary,
} from "@/lib/dashboard/summary";
import {
  normalizePeriodRows,
  type PeriodBasis,
  type PeriodGranularity,
  type PeriodPoint,
} from "@/lib/dashboard/period";

/**
 * 대시보드 요약을 한 번의 RPC 호출로 가져온다.
 * 집계는 전부 PostgreSQL(dashboard_summary())에서 수행하며,
 * 거래 데이터를 브라우저로 내려 합산하지 않는다.
 * RLS(SECURITY INVOKER)로 로그인 사용자의 데이터만 집계된다.
 */
export async function getDashboardSummary(): Promise<
  QueryResult<DashboardSummary>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("dashboard_summary");

  if (error) {
    console.error("[dashboard] 요약 조회 실패:", error.message);
    return {
      ok: false,
      error: "대시보드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: normalizeDashboardSummary(data) };
}

/**
 * 기간별(일간/주간/월간/연간) 추이.
 * - basis "trade": 거래 1건 = 1명 (거래 건수). distinct 고객이 아니다.
 * - basis "registration": 신규 등록 고객수 (customers.created_at 기준).
 * - 집계는 customer_count_by_period() RPC(PostgreSQL)에서 수행한다.
 * - 마이그레이션 0005 미적용 DB 는 안내 문구를 반환한다.
 */
export async function getCustomerCountByPeriod(
  granularity: PeriodGranularity,
  basis: PeriodBasis = "trade",
): Promise<QueryResult<PeriodPoint[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("customer_count_by_period", {
    granularity,
    basis,
  });

  if (error) {
    console.error("[dashboard] 기간별 고객수 조회 실패:", error.message);
    // PGRST202: RPC 함수 없음 / 42883: function does not exist
    if (error.code === "PGRST202" || error.code === "42883") {
      return {
        ok: false,
        error:
          "기간별 고객수를 쓰려면 데이터베이스 마이그레이션(0005)이 필요합니다. supabase/migrations 를 확인하세요.",
      };
    }
    return {
      ok: false,
      error: "기간별 고객수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: normalizePeriodRows(data) };
}
