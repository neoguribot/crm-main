"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  flattenFieldErrors,
  messageTemplateSchema,
  templateFormDataToObject,
} from "@/lib/validation/message-template";
import {
  initialTemplateFormState,
  type TemplateFormState,
} from "@/app/marketing/templates/form-state";

const GENERIC_ERROR = "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

function payload(data: {
  name: string;
  channel: string;
  body: string;
  kakao_template_id: string | null;
  event_type: number | null;
  is_active: boolean;
}) {
  return {
    name: data.name,
    channel: data.channel,
    body: data.body,
    kakao_template_id: data.kakao_template_id,
    event_type: data.event_type,
    is_active: data.is_active,
  };
}

export async function createTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const raw = templateFormDataToObject(formData);
  const parsed = messageTemplateSchema.safeParse(raw);
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
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("message_templates")
    .insert(payload(parsed.data));
  if (error) {
    console.error("[messaging] 템플릿 등록 실패:", error.message);
    return { ...initialTemplateFormState, status: "error", message: GENERIC_ERROR, values: raw };
  }

  revalidatePath("/marketing/templates");
  redirect("/marketing/templates");
}

export async function updateTemplate(
  id: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const raw = templateFormDataToObject(formData);
  const parsed = messageTemplateSchema.safeParse(raw);
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
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("message_templates")
    .update(payload(parsed.data))
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[messaging] 템플릿 수정 실패:", error.message);
    return { ...initialTemplateFormState, status: "error", message: GENERIC_ERROR, values: raw };
  }
  if (!data) {
    return {
      ...initialTemplateFormState,
      status: "error",
      message: "해당 템플릿을 수정할 수 없습니다.",
      values: raw,
    };
  }

  revalidatePath("/marketing/templates");
  redirect("/marketing/templates");
}

export type DeleteTemplateState = { error: string | null };

export async function deleteTemplate(
  id: string,
  _prev: DeleteTemplateState,
  _formData: FormData,
): Promise<DeleteTemplateState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) {
    console.error("[messaging] 템플릿 삭제 실패:", error.message);
    return { error: "삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/marketing/templates");
  redirect("/marketing/templates");
}
