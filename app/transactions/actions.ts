"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  itemTypeToCode,
  tradeStatusToCode,
  tradeTypeToCode,
} from "@/lib/types/codes";
import { flattenFieldErrors } from "@/lib/validation/flatten";
import {
  tradeRecordFormDataToObject,
  tradeRecordInputSchema,
} from "@/lib/validation/trade-record";
import type { TradeFormState } from "@/app/customers/[id]/trades/form-state";

const GENERIC_ERROR = "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const NOT_FOUND = "해당 고객을 찾을 수 없습니다.";

/** 거래관리 화면에서 고객을 직접 선택해 신규 거래를 등록한다. */
export async function createTradeRecordStandalone(
  _prev: TradeFormState,
  formData: FormData,
): Promise<TradeFormState> {
  const customerId = String(formData.get("customer_id") ?? "").trim();
  const raw = tradeRecordFormDataToObject(formData);

  if (!customerId) {
    return {
      status: "error",
      message: "고객을 선택해 주세요.",
      fieldErrors: { customer_id: "고객을 선택해 주세요." },
      values: raw,
    };
  }

  const parsed = tradeRecordInputSchema.safeParse(raw);
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
    console.error("[transactions] 고객 확인 실패:", customerError.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }
  if (!customer) {
    return { status: "error", message: NOT_FOUND, fieldErrors: {}, values: raw };
  }

  const { error } = await supabase.from("trade_records").insert({
    customer_id: customer.id,
    trade_type: tradeTypeToCode(parsed.data.trade_type),
    item_type: itemTypeToCode(parsed.data.item_type),
    item_detail: parsed.data.item_detail,
    unit_price: parsed.data.unit_price,
    weight: parsed.data.weight,
    amount: parsed.data.amount,
    status: tradeStatusToCode(parsed.data.status),
    trade_date: parsed.data.trade_date,
    memo: parsed.data.memo,
  });

  if (error) {
    console.error("[transactions] 거래 등록 실패:", error.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }

  revalidatePath("/transactions");
  revalidatePath(`/customers/${customerId}`);
  redirect("/transactions");
}

export async function updateTradeRecord(
  tradeId: string,
  customerId: string,
  _prev: TradeFormState,
  formData: FormData,
): Promise<TradeFormState> {
  const raw = tradeRecordFormDataToObject(formData);
  const parsed = tradeRecordInputSchema.safeParse(raw);

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

  const { data, error } = await supabase
    .from("trade_records")
    .update({
      trade_type: tradeTypeToCode(parsed.data.trade_type),
      item_type: itemTypeToCode(parsed.data.item_type),
      item_detail: parsed.data.item_detail,
      unit_price: parsed.data.unit_price,
      weight: parsed.data.weight,
      amount: parsed.data.amount,
      status: tradeStatusToCode(parsed.data.status),
      trade_date: parsed.data.trade_date,
      memo: parsed.data.memo,
    })
    .eq("id", tradeId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[transactions] 수정 실패:", error.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }
  if (!data) {
    return {
      status: "error",
      message: "해당 거래를 수정할 수 없습니다.",
      fieldErrors: {},
      values: raw,
    };
  }

  revalidatePath("/transactions");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/transactions/${tradeId}`);
}

export type DeleteTradeState = { error: string | null };

export async function deleteTradeRecord(
  tradeId: string,
  customerId: string,
  _prev: DeleteTradeState,
  _formData: FormData,
): Promise<DeleteTradeState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("trade_records")
    .delete()
    .eq("id", tradeId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[transactions] 삭제 실패:", error.message);
    return { error: GENERIC_ERROR };
  }
  if (!data) {
    return { error: "이미 삭제되었거나 권한이 없는 거래입니다." };
  }

  revalidatePath("/transactions");
  revalidatePath(`/customers/${customerId}`);
  redirect("/transactions");
}
