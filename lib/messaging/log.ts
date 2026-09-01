import "server-only";

import type { MessageLog } from "@/lib/types/database";
import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, customer_id, template_id, channel, to_phone, rendered_body, status, provider, provider_message_id, error, sent_at, created_at";

export type MessageLogItem = MessageLog & { customer_name: string | null };

type RawLogRow = MessageLog & { customers: { name: string } | null };

/** 발송 이력. 최근 순. */
export async function listMessageLog(
  limit = 200,
): Promise<QueryResult<MessageLogItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("message_log")
    .select(`${COLUMNS}, customers(name)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[messaging] 발송 이력 조회 실패:", error.message);
    if (error.code === "42P01" || error.code === "42703") {
      return {
        ok: false,
        error:
          "이 기능에는 마이그레이션 0028 이 필요합니다. supabase/migrations 를 확인하세요.",
      };
    }
    return { ok: false, error: "발송 이력을 불러오지 못했습니다." };
  }

  const rows = (data ?? []) as unknown as RawLogRow[];
  return {
    ok: true,
    data: rows.map(({ customers, ...rest }) => ({
      ...rest,
      customer_name: customers?.name ?? null,
    })),
  };
}
