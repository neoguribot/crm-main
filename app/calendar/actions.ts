"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { eventTypeToCode } from "@/lib/types/codes";
import {
  customerEventInputSchema,
  flattenFieldErrors,
} from "@/lib/validation/customer-event";
import type {
  CalendarEventActionState,
  CalendarEventFormState,
} from "@/app/calendar/event-form-state";

const GENERIC_ERROR = "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

function readEventForm(formData: FormData) {
  return {
    customer_id: String(formData.get("customer_id") ?? ""),
    event_type: String(formData.get("event_type") ?? ""),
    event_date: String(formData.get("event_date") ?? ""),
    memo: formData.get("memo") ? String(formData.get("memo")) : "",
    is_done: formData.get("is_done") ? String(formData.get("is_done")) : "",
  };
}

async function requireUserOrRedirect() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

/** 캘린더에서 새 일정 등록. 성공해도 페이지 이동 없이 목록만 갱신한다. */
export async function createCalendarEvent(
  _prev: CalendarEventFormState,
  formData: FormData,
): Promise<CalendarEventFormState> {
  const raw = readEventForm(formData);

  const parsed = customerEventInputSchema.safeParse({
    event_type: raw.event_type,
    event_date: raw.event_date,
    trade_id: "",
    memo: raw.memo,
    is_done: raw.is_done,
  });

  const fieldErrors = parsed.success ? {} : flattenFieldErrors(parsed.error);
  if (!raw.customer_id) fieldErrors.customer_id = "고객을 선택해 주세요.";
  if (!parsed.success || !raw.customer_id) {
    return {
      ok: false,
      message: "입력값을 확인해 주세요.",
      fieldErrors,
      values: raw,
    };
  }

  const supabase = await requireUserOrRedirect();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", raw.customer_id)
    .maybeSingle();

  if (customerError || !customer) {
    return {
      ok: false,
      message: customerError ? GENERIC_ERROR : "해당 고객을 찾을 수 없습니다.",
      fieldErrors: {},
      values: raw,
    };
  }

  const { error } = await supabase.from("customer_events").insert({
    customer_id: customer.id,
    trade_id: null,
    event_type: eventTypeToCode(parsed.data.event_type),
    event_date: parsed.data.event_date,
    memo: parsed.data.memo,
    is_done: parsed.data.is_done,
  });

  if (error) {
    console.error("[calendar] 일정 등록 실패:", error.message);
    return { ok: false, message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true, message: "일정을 등록했습니다.", fieldErrors: {}, values: null };
}

/** 캘린더에서 기존 일정 수정(종류·날짜·메모·완료여부). */
export async function updateCalendarEvent(
  eventId: string,
  _prev: CalendarEventFormState,
  formData: FormData,
): Promise<CalendarEventFormState> {
  const raw = readEventForm(formData);

  const parsed = customerEventInputSchema.safeParse({
    event_type: raw.event_type,
    event_date: raw.event_date,
    trade_id: "",
    memo: raw.memo,
    is_done: raw.is_done,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "입력값을 확인해 주세요.",
      fieldErrors: flattenFieldErrors(parsed.error),
      values: raw,
    };
  }

  const supabase = await requireUserOrRedirect();

  const { error } = await supabase
    .from("customer_events")
    .update({
      event_type: eventTypeToCode(parsed.data.event_type),
      event_date: parsed.data.event_date,
      memo: parsed.data.memo,
      is_done: parsed.data.is_done,
    })
    .eq("id", eventId);

  if (error) {
    console.error("[calendar] 일정 수정 실패:", error.message);
    return { ok: false, message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true, message: "일정을 수정했습니다.", fieldErrors: {}, values: null };
}

export async function toggleCalendarEventDone(
  eventId: string,
  nextDone: boolean,
  _prev: CalendarEventActionState,
  _formData: FormData,
): Promise<CalendarEventActionState> {
  const supabase = await requireUserOrRedirect();

  const { error } = await supabase
    .from("customer_events")
    .update({ is_done: nextDone })
    .eq("id", eventId);

  if (error) {
    console.error("[calendar] 일정 완료 처리 실패:", error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { error: null };
}

export async function deleteCalendarEvent(
  eventId: string,
  _prev: CalendarEventActionState,
  _formData: FormData,
): Promise<CalendarEventActionState> {
  const supabase = await requireUserOrRedirect();

  const { error } = await supabase
    .from("customer_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("[calendar] 일정 삭제 실패:", error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { error: null };
}
