"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { eventTypeToCode } from "@/lib/types/codes";
import {
  customerEventFormDataToObject,
  customerEventInputSchema,
  flattenFieldErrors,
} from "@/lib/validation/customer-event";
import type { CustomerEventFormState } from "@/app/customers/[id]/events/form-state";

const GENERIC_ERROR = "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const NOT_FOUND = "해당 고객을 찾을 수 없습니다.";

export async function createCustomerEvent(
  customerId: string,
  _prev: CustomerEventFormState,
  formData: FormData,
): Promise<CustomerEventFormState> {
  const raw = customerEventFormDataToObject(formData);
  const parsed = customerEventInputSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "입력값을 확인해 주세요.",
      fieldErrors: flattenFieldErrors(parsed.error),
      values: raw,
    };
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) {
    console.error("[events] 고객 확인 실패:", customerError.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }
  if (!customer) {
    return { status: "error", message: NOT_FOUND, fieldErrors: {}, values: raw };
  }

  const { error } = await supabase.from("customer_events").insert({
    customer_id: customer.id,
    trade_id: parsed.data.trade_id,
    event_type: eventTypeToCode(parsed.data.event_type),
    event_date: parsed.data.event_date,
    memo: parsed.data.memo,
    is_done: parsed.data.is_done,
  });

  if (error) {
    console.error("[events] 일정 등록 실패:", error.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export type ToggleEventDoneState = { error: string | null };

export async function toggleCustomerEventDone(
  customerId: string,
  eventId: string,
  nextDone: boolean,
  _prev: ToggleEventDoneState,
  _formData: FormData,
): Promise<ToggleEventDoneState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("customer_events")
    .update({ is_done: nextDone })
    .eq("id", eventId);

  if (error) {
    console.error("[events] 일정 완료 처리 실패:", error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/home");
  return { error: null };
}

export type DeleteEventState = { error: string | null };

export async function deleteCustomerEvent(
  customerId: string,
  eventId: string,
  _prev: DeleteEventState,
  _formData: FormData,
): Promise<DeleteEventState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("customer_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("[events] 일정 삭제 실패:", error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/home");
  return { error: null };
}
