import {
  PURCHASE_PURPOSES,
  type ItemType,
  type PurchasePurpose,
  type TradeStatus,
  type TradeType,
} from "@/lib/types/database";
import { codeToItemType, codeToTradeStatus, codeToTradeType } from "@/lib/types/codes";

export type RecentTrade = {
  id: string;
  customer_id: string;
  customer_name: string;
  trade_type: TradeType;
  /** 품목 코드. 표시는 itemTypeLabel() 로. */
  item_type: ItemType;
  /** numeric → 문자열 (정밀도 유지). 0007 이전 행은 null. */
  unit_price: string | null;
  /** numeric → 문자열 (정밀도 유지) */
  weight: string;
  /** numeric → 문자열 (정밀도 유지) */
  amount: string;
  status: TradeStatus;
  trade_date: string;
};

export type PurposeCounts = Record<PurchasePurpose, number>;

export type DashboardSummary = {
  customerCount: number;
  monthSaleAmount: string;
  monthPurchaseAmount: string;
  purposeCounts: PurposeCounts;
  purposeCountsToday: PurposeCounts;
  purposeCountsWeek: PurposeCounts;
  purposeCountsMonth: PurposeCounts;
  purposeCountsYear: PurposeCounts;
  upcomingEventCount: number;
  recentTrades: RecentTrade[];
  tradeCountToday: number;
  tradeCountYesterday: number;
  tradeCountWeek: number;
  tradeCountMonth: number;
  tradeCountYear: number;
  tradeCountInProgress: number;
  tradeCountDone: number;
};

function toCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** DB 가 내려준 numeric 문자열/숫자를 안전한 십진 문자열로. 없으면 "0". */
function toAmountString(value: unknown): string {
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "0";
}

function toNullableAmountString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizePurposeCounts(value: unknown): PurposeCounts {
  const raw =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    PURCHASE_PURPOSES.map((p) => [p, toCount(raw[p])]),
  ) as PurposeCounts;
}

function isRawRecentTrade(
  value: unknown,
): value is { id: string; customer_id: string; customer_name: string; trade_date: string; trade_type: number; item_type: number; status: number } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.customer_id === "string" &&
    typeof v.customer_name === "string" &&
    typeof v.trade_date === "string" &&
    typeof v.trade_type === "number" &&
    typeof v.item_type === "number" &&
    typeof v.status === "number"
  );
}

/**
 * `dashboard_summary()` RPC 의 jsonb 응답을 타입 있는 값으로 정규화한다.
 * 누락·null·형식 오류는 0 / 빈 값으로 안전하게 채운다.
 */
export function normalizeDashboardSummary(raw: unknown): DashboardSummary {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const recentTrades = Array.isArray(r.recent_trades)
    ? r.recent_trades
        .filter(isRawRecentTrade)
        .map((t) => ({
          id: t.id,
          customer_id: t.customer_id,
          customer_name: t.customer_name,
          trade_type: codeToTradeType(t.trade_type),
          item_type: codeToItemType(t.item_type),
          unit_price: toNullableAmountString(
            (t as unknown as Record<string, unknown>).unit_price,
          ),
          weight: toAmountString((t as unknown as Record<string, unknown>).weight),
          amount: toAmountString((t as unknown as Record<string, unknown>).amount),
          status: codeToTradeStatus(t.status),
          trade_date: t.trade_date,
        }))
        .slice(0, 5)
    : [];

  return {
    customerCount: toCount(r.customer_count),
    monthSaleAmount: toAmountString(r.month_sale_amount),
    monthPurchaseAmount: toAmountString(r.month_purchase_amount),
    purposeCounts: normalizePurposeCounts(r.purpose_counts),
    purposeCountsToday: normalizePurposeCounts(r.purpose_counts_today),
    purposeCountsWeek: normalizePurposeCounts(r.purpose_counts_week),
    purposeCountsMonth: normalizePurposeCounts(r.purpose_counts_month),
    purposeCountsYear: normalizePurposeCounts(r.purpose_counts_year),
    upcomingEventCount: toCount(r.upcoming_event_count),
    recentTrades,
    tradeCountToday: toCount(r.trade_count_today),
    tradeCountYesterday: toCount(r.trade_count_yesterday),
    tradeCountWeek: toCount(r.trade_count_week),
    tradeCountMonth: toCount(r.trade_count_month),
    tradeCountYear: toCount(r.trade_count_year),
    tradeCountInProgress: toCount(r.trade_count_in_progress),
    tradeCountDone: toCount(r.trade_count_done),
  };
}
