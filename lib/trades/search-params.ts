import { isValidIsoDate } from "@/lib/date";
import { TRADE_STATUSES, TRADE_TYPES } from "@/lib/types/database";
import type { TradeSearchFilters } from "@/lib/trades/queries";

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** 거래관리 화면과 내보내기가 공유하는 검색 파라미터 파서. */
export function parseTradeSearchParams(sp: RawParams): TradeSearchFilters {
  const q = first(sp.q).trim();
  const tradeType = TRADE_TYPES.find((t) => t === first(sp.trade_type));
  const status = TRADE_STATUSES.find((s) => s === first(sp.status));
  const dateFromRaw = first(sp.date_from).trim();
  const dateToRaw = first(sp.date_to).trim();

  return {
    q,
    tradeType,
    status,
    dateFrom: isValidIsoDate(dateFromRaw) ? dateFromRaw : "",
    dateTo: isValidIsoDate(dateToRaw) ? dateToRaw : "",
  };
}

/** 필터 → 쿼리스트링 (빈 값 제외). 내보내기 링크에 쓴다. */
export function buildTradeSearchParams(
  filters: TradeSearchFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.tradeType) params.set("trade_type", filters.tradeType);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  return params;
}
