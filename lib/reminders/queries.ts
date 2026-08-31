import "server-only";

import type { EventType } from "@/lib/types/database";
import { codeToEventType } from "@/lib/types/codes";
import { todayInSeoul } from "@/lib/date";
import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  classifyRemindStatus,
  matchesRemindFilter,
  remindDayDelta,
  REMIND_FILTERS,
  type RemindFilter,
  type RemindStatus,
} from "@/lib/reminders/status";

/** 리마인드 화면에 필요한 컬럼만. 완료 처리된 일정은 대상에서 제외. */
const COLUMNS = "id, event_type, event_date, memo, customers(id, name)";

type RawRow = {
  id: string;
  event_type: number;
  event_date: string;
  memo: string | null;
  customers: {
    id: string;
    name: string;
  } | null;
};

export type ReminderEvent = {
  id: string;
  event_type: EventType;
  event_date: string;
  customer_id: string;
  name: string;
  memo: string | null;
  status: RemindStatus;
  dayDelta: number | null;
};

export type ReminderData = {
  today: string;
  /** 활성 필터로 걸러진 목록 (정렬 유지) */
  items: ReminderEvent[];
  /** 각 필터값별 건수 + 기본 목록 건수 */
  counts: Record<RemindFilter, number> & { DEFAULT: number };
};

/**
 * 리마인드 대상 일정(customer_events, 미완료 건). 고객 1명이 여러 건을 가질 수
 * 있으므로 이벤트 1건 = 목록 1행이다.
 * - 쿼리 1회. 반복 쿼리 없음.
 * - RLS(customer_events_select_own)로 로그인 사용자의 일정만.
 * - 상태는 DB 에 저장하지 않고 event_date 로 계산.
 */
export async function getReminderData(
  filter: RemindFilter | null,
): Promise<QueryResult<ReminderData>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customer_events")
    .select(COLUMNS)
    .eq("is_done", false)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[reminders] 조회 실패:", error.message);
    return {
      ok: false,
      error: "리마인드 대상을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const today = todayInSeoul();
  const rows = (data ?? []) as unknown as RawRow[];

  const classified: ReminderEvent[] = rows
    .filter((row): row is RawRow & { customers: NonNullable<RawRow["customers"]> } =>
      row.customers !== null,
    )
    .map((row) => ({
      id: row.id,
      event_type: codeToEventType(row.event_type),
      event_date: row.event_date,
      customer_id: row.customers.id,
      name: row.customers.name,
      memo: row.memo,
      status: classifyRemindStatus(row.event_date, today),
      dayDelta: remindDayDelta(row.event_date, today),
    }));

  const counts = {
    DEFAULT: classified.filter((c) => matchesRemindFilter(c.status, null)).length,
  } as ReminderData["counts"];
  for (const f of REMIND_FILTERS) {
    counts[f] = classified.filter((c) => matchesRemindFilter(c.status, f)).length;
  }

  const items = classified.filter((c) => matchesRemindFilter(c.status, filter));

  return { ok: true, data: { today, items, counts } };
}
