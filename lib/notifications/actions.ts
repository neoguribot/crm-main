"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getActiveNotifications,
  type AppNotification,
} from "@/lib/notifications/queries";

async function requireSupabase() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

export type NotificationActionResult = { ok: boolean };

/** 팝업에서 닫기. dismissed_at 을 채운다. */
export async function dismissNotification(
  id: string,
): Promise<NotificationActionResult> {
  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[notifications] 닫기 실패:", error.message);
    return { ok: false };
  }
  revalidatePath("/prices");
  return { ok: true };
}

/** 읽음 처리. */
export async function markNotificationRead(
  id: string,
): Promise<NotificationActionResult> {
  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) {
    console.error("[notifications] 읽음 처리 실패:", error.message);
    return { ok: false };
  }
  revalidatePath("/prices");
  return { ok: true };
}

/** 전체 읽음 처리. */
export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) {
    console.error("[notifications] 전체 읽음 실패:", error.message);
    return { ok: false };
  }
  revalidatePath("/prices");
  return { ok: true };
}

/** 팝업 컴포넌트가 마운트·폴링 시 호출. 닫지 않은 알림 목록. */
export async function fetchActiveNotifications(): Promise<AppNotification[]> {
  await requireSupabase();
  const result = await getActiveNotifications();
  return result.ok ? result.data : [];
}
