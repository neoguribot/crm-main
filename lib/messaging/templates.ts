import "server-only";

import type { MessageTemplate } from "@/lib/types/database";
import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, name, channel, body, kakao_template_id, event_type, is_active, created_at, updated_at";

const MIGRATION_HINT =
  "이 기능에는 마이그레이션 0027 이 필요합니다. supabase/migrations 를 확인하세요.";

function degradeError(code: string | undefined): string {
  if (code === "42P01" || code === "42703") return MIGRATION_HINT;
  return "메시지 템플릿을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** 로그인 사용자의 템플릿 목록. 최근 수정 순. */
export async function listMessageTemplates(
  activeOnly = false,
): Promise<QueryResult<MessageTemplate[]>> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("message_templates")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    console.error("[messaging] 템플릿 목록 조회 실패:", error.message);
    return { ok: false, error: degradeError(error.code) };
  }
  return { ok: true, data: (data ?? []) as MessageTemplate[] };
}

/** 템플릿 1건. 없거나 다른 사용자면 null. */
export async function getMessageTemplate(
  id: string,
): Promise<QueryResult<MessageTemplate | null>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("message_templates")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[messaging] 템플릿 조회 실패:", error.message);
    return { ok: false, error: degradeError(error.code) };
  }
  return { ok: true, data: (data as MessageTemplate | null) ?? null };
}
