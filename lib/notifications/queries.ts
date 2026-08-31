import "server-only";

import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/notifications/types";

export type { AppNotification };

const COLUMNS =
  "id, type, customer_id, title, body, read_at, dismissed_at, created_at";

/** 닫지 않은 알림 (오른쪽 하단 팝업용). 최신순, 최대 20건. */
export async function getActiveNotifications(): Promise<
  QueryResult<AppNotification[]>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (error.code === "42P01") return { ok: true, data: [] };
    console.error("[notifications] 활성 알림 조회 실패:", error.message);
    return { ok: false, error: "알림을 불러오지 못했습니다." };
  }

  return { ok: true, data: (data ?? []) as unknown as AppNotification[] };
}

/** 전체 알림 (홈 알림 센터용). 최신순, 최대 50건. */
export async function getNotifications(): Promise<
  QueryResult<AppNotification[]>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === "42P01") return { ok: true, data: [] };
    console.error("[notifications] 알림 조회 실패:", error.message);
    return { ok: false, error: "알림을 불러오지 못했습니다." };
  }

  return { ok: true, data: (data ?? []) as unknown as AppNotification[] };
}

/** 안 읽은 알림 수. 0006 미적용 시 0. */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
