import "server-only";

import type { EventType } from "@/lib/types/database";
import { codeToEventType } from "@/lib/types/codes";
import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COLUMNS = "id, customer_id, trade_id, event_type, event_date, memo, is_done, created_at";

export type CustomerEventItem = {
  id: string;
  customer_id: string;
  trade_id: string | null;
  event_type: EventType;
  event_date: string;
  memo: string | null;
  is_done: boolean;
  created_at: string;
};

export type UpcomingEventItem = CustomerEventItem & {
  customer_name: string;
  customer_phone: string;
};

type RawEventRow = Omit<CustomerEventItem, "event_type"> & { event_type: number };

function mapEventRow(row: RawEventRow): CustomerEventItem {
  return { ...row, event_type: codeToEventType(row.event_type) };
}

/** 특정 고객의 일정 목록. 날짜 오름차순. */
export async function listCustomerEvents(
  customerId: string,
): Promise<QueryResult<CustomerEventItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customer_events")
    .select(COLUMNS)
    .eq("customer_id", customerId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[events] 고객 일정 조회 실패:", error.message);
    return {
      ok: false,
      error: "일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const rows = (data ?? []) as unknown as RawEventRow[];
  return { ok: true, data: rows.map(mapEventRow) };
}

/** 달력 화면용: 날짜 구간(포함) 내 모든 일정(완료 포함). 고객 이름 포함. */
export async function listEventsInRange(
  startDate: string,
  endDate: string,
): Promise<QueryResult<UpcomingEventItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customer_events")
    .select(`${COLUMNS}, customers(name, phone)`)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[events] 기간별 일정 조회 실패:", error.message);
    return {
      ok: false,
      error: "일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  type Raw = RawEventRow & { customers: { name: string; phone: string } | null };
  const rows = (data ?? []) as unknown as Raw[];
  return {
    ok: true,
    data: rows.map((row) => ({
      ...mapEventRow(row),
      customer_name: row.customers?.name ?? "",
      customer_phone: row.customers?.phone ?? "",
    })),
  };
}
