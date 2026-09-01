import type { NextRequest } from "next/server";

import { todayInSeoul } from "@/lib/date";
import { searchTradeRecords } from "@/lib/trades/queries";
import { parseTradeSearchParams } from "@/lib/trades/search-params";
import { buildTradeWorkbook } from "@/lib/trades/excel-workbook";
import { requireUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

/** URLSearchParams → 평면 레코드. */
function toRecord(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of sp) out[k] = v;
  return out;
}

/** 거래 내역 Excel 내보내기. 필터 파라미터는 /transactions 화면과 동일. */
export async function GET(request: NextRequest) {
  await requireUser();

  const filters = parseTradeSearchParams(toRecord(request.nextUrl.searchParams));
  const result = await searchTradeRecords(filters);
  if (!result.ok) {
    return new Response(result.error, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const buffer = await buildTradeWorkbook(result.data);
  const filename = `거래내역_${todayInSeoul()}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transactions.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
