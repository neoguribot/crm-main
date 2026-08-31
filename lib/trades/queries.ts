import "server-only";

import type { ItemType, TradeStatus, TradeType } from "@/lib/types/database";
import {
  codeToItemType,
  codeToTradeStatus,
  codeToTradeType,
} from "@/lib/types/codes";
import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * 목록 표시에 필요한 컬럼만. numeric 컬럼은 `::text` 로 캐스팅해
 * 정밀도 손실 없이 문자열로 받는다.
 */
const LIST_COLUMNS =
  "id, trade_type, item_type, item_detail, unit_price::text, weight::text, amount::text, status, trade_date, memo, created_at";

export type TradeRecordListItem = {
  id: string;
  trade_type: TradeType;
  item_type: ItemType;
  item_detail: string | null;
  unit_price: string | null;
  weight: string;
  amount: string;
  status: TradeStatus;
  trade_date: string;
  memo: string | null;
  created_at: string;
};

type RawTradeRow = Omit<TradeRecordListItem, "trade_type" | "item_type" | "status"> & {
  trade_type: number;
  item_type: number;
  status: number;
};

function mapTradeRow(row: RawTradeRow): TradeRecordListItem {
  return {
    ...row,
    trade_type: codeToTradeType(row.trade_type),
    item_type: codeToItemType(row.item_type),
    status: codeToTradeStatus(row.status),
  };
}

/**
 * 특정 고객의 거래 이력. 거래일 내림차순, 같은 날짜면 생성일시 내림차순.
 * RLS(trade_records_select_own)로 로그인 사용자의 거래만 반환된다.
 * 호출 전에 해당 고객이 사용자 소유인지 확인해야 한다(getCustomerById 로).
 */
export async function listTradeRecordsByCustomer(
  customerId: string,
): Promise<QueryResult<TradeRecordListItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("trade_records")
    .select(LIST_COLUMNS)
    .eq("customer_id", customerId)
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[trades] 거래 이력 조회 실패:", error.message);
    return {
      ok: false,
      error: "거래 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const rows = (data ?? []) as unknown as RawTradeRow[];
  return { ok: true, data: rows.map(mapTradeRow) };
}

export type TradeSearchFilters = {
  q?: string;
  tradeType?: TradeType;
  status?: TradeStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type TradeRecordSearchItem = TradeRecordListItem & {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
};

const SEARCH_COLUMNS =
  "id, customer_id, trade_type, item_type, item_detail, unit_price::text, weight::text, amount::text, status, trade_date, memo, created_at, customers(name, phone)";

/**
 * 전체(모든 고객) 거래 검색. 거래관리 화면용.
 * RLS(trade_records_select_own)로 로그인 사용자의 거래만 반환된다.
 */
export async function searchTradeRecords(
  filters: TradeSearchFilters,
): Promise<QueryResult<TradeRecordSearchItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("trade_records")
    .select(SEARCH_COLUMNS)
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[trades] 거래 검색 실패:", error.message);
    return {
      ok: false,
      error: "거래 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  type Raw = RawTradeRow & {
    customer_id: string;
    customers: { name: string; phone: string } | null;
  };
  const rows = (data ?? []) as unknown as Raw[];

  const mapped = rows.map((row) => ({
    ...mapTradeRow(row),
    customer_id: row.customer_id,
    customer_name: row.customers?.name ?? "",
    customer_phone: row.customers?.phone ?? "",
  }));

  const filtered = mapped.filter((t) => {
    if (filters.tradeType && t.trade_type !== filters.tradeType) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.dateFrom && t.trade_date < filters.dateFrom) return false;
    if (filters.dateTo && t.trade_date > filters.dateTo) return false;
    if (filters.q) {
      const q = filters.q.trim();
      if (q) {
        const nameMatch = t.customer_name.includes(q);
        const phoneMatch = t.customer_phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        if (!nameMatch && !phoneMatch) return false;
      }
    }
    return true;
  });

  return { ok: true, data: filtered };
}

/** 거래 1건. RLS로 로그인 사용자 소유가 아니면 null. */
export async function getTradeRecordById(
  id: string,
): Promise<QueryResult<TradeRecordSearchItem | null>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("trade_records")
    .select(SEARCH_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[trades] 거래 상세 조회 실패:", error.message);
    return {
      ok: false,
      error: "거래 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (!data) return { ok: true, data: null };

  type Raw = RawTradeRow & {
    customer_id: string;
    customers: { name: string; phone: string } | null;
  };
  const row = data as unknown as Raw;
  return {
    ok: true,
    data: {
      ...mapTradeRow(row),
      customer_id: row.customer_id,
      customer_name: row.customers?.name ?? "",
      customer_phone: row.customers?.phone ?? "",
    },
  };
}
