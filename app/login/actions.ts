"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { HOME_PATH } from "@/lib/constants";
import { authErrorMessage } from "@/lib/supabase/auth-errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * 이메일·비밀번호 로그인. 성공하면 기본 화면(파이프라인)으로 이동한다.
 * 회원가입·비밀번호 재설정은 이 단계에서 구현하지 않는다.
 */
export async function signInWithPassword(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect(HOME_PATH);
}
