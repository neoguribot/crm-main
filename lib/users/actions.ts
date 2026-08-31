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
