import type { NextRequest } from "next/server";

import { todayInSeoul } from "@/lib/date";
import { parseCustomerFilters } from "@/lib/customers/filters";
import { exportCustomers } from "@/lib/customers/queries";
import type { CustomerExportRow } from "@/lib/customers/excel-columns";
import { buildCustomerWorkbook } from "@/lib/customers/excel-workbook";
import { requireUser } from "@/lib/supabase/require-user";

/** URLSearchParams → 반복 키를 배열로 묶은 평면 레코드. */
function toRecord(sp: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const values = sp.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}

// 인증 사용자별 데이터. 캐시하지 않는다.
export const dynamic = "force-dynamic";

/**
 * 고객 목록 Excel 내보내기.
 * - `?...` 필터 파라미터는 `/customers` 목록과 동일하게 해석한다.
 * - `?template=1` 이면 데이터 없이 헤더만(불러오기 양식).
 */
export async function GET(request: NextRequest) {
  await requireUser();

  const { searchParams } = request.nextUrl;
  const isTemplate = searchParams.get("template") === "1";

  let rows: CustomerExportRow[] = [];
  if (!isTemplate) {
    const result = await exportCustomers(
      parseCustomerFilters(toRecord(searchParams)),
    );
    if (!result.ok) {
      return new Response(result.error, {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    rows = result.data;
  }

  const buffer = await buildCustomerWorkbook(rows);
  const filename = isTemplate
    ? "고객_불러오기_양식.xlsx"
    : `고객목록_${todayInSeoul()}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="customers.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
