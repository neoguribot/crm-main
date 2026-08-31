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

/**
 * 특정 고객에게 거래 기록을 추가한다.
 * - customerId 는 URL 에서 받는다(브라우저가 폼으로 보낸 값은 신뢰하지 않음).
 * - 서버에서 로그인 사용자 확인 → 그 고객이 사용자 소유인지 확인 → 그 뒤에만 생성.
 * - owner_id 는 보내지 않는다(DB 기본값 auth.uid(), RLS with check 로 이중 검증).
 * 성공 시 고객 상세로 이동.
 */
export async function createTradeRecord(
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

  // 고객 소유권 확인: RLS 로 내 고객만 조회되므로, 행이 없으면 남의 고객이거나 없는 ID.
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) {
    console.error("[trades] 고객 확인 실패:", customerError.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }
  if (!customer) {
    return { status: "error", message: NOT_FOUND, fieldErrors: {}, values: raw };
  }

  // numeric 값은 검증된 문자열 그대로 전달(정밀도 유지).
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
    console.error("[trades] 거래 등록 실패:", error.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}
