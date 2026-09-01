"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authErrorMessage } from "@/lib/supabase/auth-errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type UpdateGoalState = { error: string | null };

/** 홈 대시보드에서 바로 수정하는 월 매출 목표값. */
export async function updateMonthlySalesGoal(
  _prev: UpdateGoalState,
  formData: FormData,
): Promise<UpdateGoalState> {
  const raw = String(formData.get("monthly_sales_goal") ?? "").replace(/,/g, "").trim();

  if (raw !== "" && !/^\d+$/.test(raw)) {
    return { error: "목표값은 0 이상의 정수로 입력해 주세요." };
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("users")
    .update({ monthly_sales_goal: raw === "" ? null : raw })
    .eq("id", user.id);

  if (error) {
    console.error("[users] 목표값 수정 실패:", error.message);
    return { error: "목표값 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/home");
  return { error: null };
}

export type MarketingSettingsState = { status: "idle" | "saved" | "error"; error: string | null };

/** 마케팅 발송 설정: 매장명·발신번호·알림톡 발신 프로필. */
export async function updateMarketingSettings(
  _prev: MarketingSettingsState,
  formData: FormData,
): Promise<MarketingSettingsState> {
  const storeName = String(formData.get("store_name") ?? "").trim();
  const senderPhone = String(formData.get("sender_phone") ?? "").trim();
  const kakaoPfId = String(formData.get("kakao_pf_id") ?? "").trim();

  if (senderPhone && !/^[\d-]{9,20}$/.test(senderPhone)) {
    return { status: "error", error: "발신번호 형식을 확인해 주세요." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("users")
    .update({
      store_name: storeName === "" ? null : storeName,
      sender_phone: senderPhone === "" ? null : senderPhone,
      kakao_pf_id: kakaoPfId === "" ? null : kakaoPfId,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[users] 마케팅 설정 저장 실패:", error.message);
    return { status: "error", error: "설정 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/marketing/settings");
  return { status: "saved", error: null };
}

export type ProfileState = { status: "idle" | "saved" | "error"; error: string | null };

/** 내 프로필: 표시 이름. 인증 정보(이메일·비밀번호)는 건드리지 않는다. */
export async function updateProfileName(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length === 0) {
    return { status: "error", error: "이름을 입력해 주세요." };
  }
  if (name.length > 50) {
    return { status: "error", error: "이름은 50자 이내로 입력해 주세요." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("users")
    .update({ name })
    .eq("id", user.id);

  if (error) {
    console.error("[users] 프로필 저장 실패:", error.message);
    return { status: "error", error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/settings");
  revalidatePath("/home");
  return { status: "saved", error: null };
}

export type PasswordState = { status: "idle" | "saved" | "error"; error: string | null };

/**
 * 로그인한 본인의 비밀번호 변경.
 * 현재 비밀번호로 재인증한 뒤 Supabase Auth 로 새 비밀번호를 설정한다.
 */
export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next || !confirm) {
    return { status: "error", error: "모든 항목을 입력해 주세요." };
  }
  if (next.length < 8) {
    return { status: "error", error: "새 비밀번호는 8자 이상이어야 합니다." };
  }
  if (next !== confirm) {
    return { status: "error", error: "새 비밀번호가 일치하지 않습니다." };
  }
  if (next === current) {
    return { status: "error", error: "현재 비밀번호와 다른 비밀번호를 입력해 주세요." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect("/login");
  }

  // 현재 비밀번호 재확인
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauthError) {
    return { status: "error", error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error("[users] 비밀번호 변경 실패:", error.message);
    return { status: "error", error: authErrorMessage(error) };
  }

  return { status: "saved", error: null };
}
