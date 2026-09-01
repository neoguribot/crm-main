"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
