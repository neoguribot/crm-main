"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { genderToCode } from "@/lib/types/codes";
import {
  customerFormDataToObject,
  customerInputSchema,
  flattenFieldErrors,
} from "@/lib/validation/customer";
import type { CustomerFormState } from "@/app/customers/form-state";

const DELETE_ERROR =
  "삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const GENERIC_ERROR =
  "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

/** 신규 고객 등록. 성공 시 상세 페이지로 이동. */
export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const raw = customerFormDataToObject(formData);
  const parsed = customerInputSchema.safeParse(raw);

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

  // owner_id 는 보내지 않는다. DB 기본값 auth.uid() 로 채워지고 RLS 로 검증된다.
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      birth_date: parsed.data.birth_date,
      gender: genderToCode(parsed.data.gender),
      address: parsed.data.address,
      inflow_channels: parsed.data.inflow_channels,
      inflow_channel_detail: parsed.data.inflow_channel_detail,
      purchase_purposes: parsed.data.purchase_purposes,
      purchase_purpose_detail: parsed.data.purchase_purpose_detail,
      frequency_label: parsed.data.frequency_label,
      revenue_label: parsed.data.revenue_label,
      referred_by_customer_id: parsed.data.referred_by_customer_id,
      registered_on: parsed.data.registered_on,
      first_trade_date: parsed.data.first_trade_date,
      last_contact_date: parsed.data.last_contact_date,
      memo: parsed.data.memo,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[customers] 등록 실패:", error?.message);
    return {
      status: "error",
      message: GENERIC_ERROR,
      fieldErrors: {},
      values: raw,
    };
  }

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

/** 고객 수정. 성공 시 상세 페이지로 이동. id/owner_id/created_at 은 수정 대상에서 제외. */
export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const raw = customerFormDataToObject(formData);
  const parsed = customerInputSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "입력값을 확인해 주세요.",
      fieldErrors: flattenFieldErrors(parsed.error),
      values: raw,
    };
  }

  if (parsed.data.referred_by_customer_id === id) {
    return {
      status: "error",
      message: "추천인으로 자기 자신을 선택할 수 없습니다.",
      fieldErrors: { referred_by_customer_id: "추천인으로 자기 자신을 선택할 수 없습니다." },
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

  // RLS 의 customers_update_own 정책이 owner 불일치 행을 대상에서 제외한다.
  // updated_at 은 DB 트리거가 갱신한다.
  const { data, error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      birth_date: parsed.data.birth_date,
      gender: genderToCode(parsed.data.gender),
      address: parsed.data.address,
      inflow_channels: parsed.data.inflow_channels,
      inflow_channel_detail: parsed.data.inflow_channel_detail,
      purchase_purposes: parsed.data.purchase_purposes,
      purchase_purpose_detail: parsed.data.purchase_purpose_detail,
      frequency_label: parsed.data.frequency_label,
      revenue_label: parsed.data.revenue_label,
      referred_by_customer_id: parsed.data.referred_by_customer_id,
      registered_on: parsed.data.registered_on,
      first_trade_date: parsed.data.first_trade_date,
      last_contact_date: parsed.data.last_contact_date,
      memo: parsed.data.memo,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[customers] 수정 실패:", error.message);
    return { status: "error", message: GENERIC_ERROR, fieldErrors: {}, values: raw };
  }

  if (!data) {
    // 다른 사용자의 고객이거나 없는 ID → 정보 노출 없이 처리
    return {
      status: "error",
      message: "해당 고객을 수정할 수 없습니다.",
      fieldErrors: {},
      values: raw,
    };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export type DeleteCustomerState = { error: string | null };

/**
 * 고객 삭제. 자기 고객이면 거래 기록이 있어도 삭제할 수 있다.
 * - 서버에서 인증 사용자 확인 → 삭제.
 * - 이 고객의 거래 기록은 DB FK(ON DELETE CASCADE)로 함께 삭제된다.
 * - RLS(customers_delete_own)가 owner 불일치를 막는다.
 * - 성공 시 /customers 로 이동한다.
 */
export async function deleteCustomer(
  customerId: string,
  _prev: DeleteCustomerState,
  _formData: FormData,
): Promise<DeleteCustomerState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[customers] 삭제 실패:", error.message);
    return { error: DELETE_ERROR };
  }
  if (!data) {
    // 이미 없거나 권한이 없는 고객(RLS) 또는 DELETE 정책 미적용
    return {
      error:
        "고객을 삭제하지 못했습니다. 이미 삭제되었거나 권한이 없을 수 있습니다.",
    };
  }

  revalidatePath("/customers");
  redirect("/customers");
}
