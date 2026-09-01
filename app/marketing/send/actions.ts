"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { todayInSeoul } from "@/lib/date";
import type { MessageChannel, MessageStatus } from "@/lib/types/database";
import { getMessageTemplate } from "@/lib/messaging/templates";
import {
  getMessagingContext,
  listMessageCandidates,
} from "@/lib/messaging/send";
import { buildCustomerVars, renderTemplate } from "@/lib/messaging/render";
import { isSolapiConfigured, sendOne } from "@/lib/messaging/solapi";
import {
  initialSendState,
  type SendMessagesState,
  type SendResultRow,
} from "@/app/marketing/send/form-state";

function fail(message: string): SendMessagesState {
  return { ...initialSendState, status: "error", message };
}

export async function sendMessages(
  _prev: SendMessagesState,
  formData: FormData,
): Promise<SendMessagesState> {
  const templateId = String(formData.get("templateId") ?? "");
  const customerIds = formData.getAll("customerIds").map(String).filter(Boolean);

  if (!templateId) return fail("템플릿을 선택해 주세요.");
  if (customerIds.length === 0) return fail("보낼 고객을 한 명 이상 선택해 주세요.");
  if (customerIds.length > 300) return fail("한 번에 최대 300명까지 보낼 수 있습니다.");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const templateRes = await getMessageTemplate(templateId);
  if (!templateRes.ok) return fail(templateRes.error);
  if (!templateRes.data) return fail("템플릿을 찾을 수 없습니다.");
  const template = templateRes.data;

  const candidatesRes = await listMessageCandidates();
  if (!candidatesRes.ok) return fail(candidatesRes.error);
  const selected = new Set(customerIds);
  const targets = candidatesRes.data.filter((c) => selected.has(c.id));
  if (targets.length === 0) return fail("선택한 고객을 찾을 수 없습니다.");

  const ctx = await getMessagingContext();
  const now = new Date().toISOString();
  const solapiReady = isSolapiConfigured();

  const canAlimtalk =
    template.channel === "ALIMTALK" &&
    Boolean(template.kakao_template_id) &&
    Boolean(ctx.kakaoPfId) &&
    solapiReady;
  const canSms =
    template.channel === "SMS" && Boolean(ctx.senderPhone) && solapiReady;

  const logRows: Record<string, unknown>[] = [];
  const results: SendResultRow[] = [];
  const sentCustomerIds: string[] = [];
  let sent = 0;
  let failed = 0;
  let manual = 0;

  for (const t of targets) {
    const vars = buildCustomerVars({
      customer: {
        name: t.name,
        phone: t.phone,
        last_contact_date: t.last_contact_date,
        birth_date: t.birth_date,
      },
      storeName: ctx.storeName,
      latestPricePerDon: ctx.latestPricePerDon,
      targetPricePerDon: t.target_price_per_don,
      nextEvent: t.next_event,
    });
    const body = renderTemplate(template.body, vars);

    let channel: MessageChannel = "MANUAL";
    let status: MessageStatus = "MANUAL";
    let providerMessageId: string | null = null;
    let error: string | null = null;

    if (canAlimtalk || canSms) {
      channel = canAlimtalk ? "ALIMTALK" : "SMS";
      try {
        const res = await sendOne({
          to: t.phone,
          from: ctx.senderPhone ?? "",
          text: body,
          kakao: canAlimtalk
            ? {
                pfId: ctx.kakaoPfId!,
                templateId: template.kakao_template_id!,
                variables: vars,
              }
            : undefined,
        });
        if (res.ok) {
          status = "SENT";
          providerMessageId = res.providerMessageId;
          sent++;
          sentCustomerIds.push(t.id);
        } else {
          status = "FAILED";
          error = res.error;
          failed++;
        }
      } catch (e) {
        status = "FAILED";
        error = (e as Error).message;
        failed++;
      }
    } else {
      manual++;
    }

    logRows.push({
      customer_id: t.id,
      template_id: template.id,
      channel,
      to_phone: t.phone,
      rendered_body: body,
      status,
      provider: status === "SENT" || status === "FAILED" ? "solapi" : null,
      provider_message_id: providerMessageId,
      error,
      sent_at: status === "SENT" ? now : null,
    });
    results.push({ name: t.name, phone: t.phone, channel, status, body, error });
  }

  const { error: insertError } = await supabase
    .from("message_log")
    .insert(logRows);
  if (insertError) {
    console.error("[messaging] 발송 이력 저장 실패:", insertError.message);
    return fail("발송 이력 저장에 실패했습니다. 발송 여부를 이력에서 확인해 주세요.");
  }

  if (sentCustomerIds.length > 0) {
    await supabase
      .from("customers")
      .update({ last_contact_date: todayInSeoul() })
      .in("id", sentCustomerIds);
  }

  revalidatePath("/marketing/history");
  revalidatePath("/customers");

  const summary =
    manual === results.length
      ? `${manual}건이 "수동 처리"로 기록됐습니다. 아래에서 문구를 복사하거나 CSV로 내려받아 발송해 주세요.`
      : `발송 ${sent}건, 실패 ${failed}건, 수동 ${manual}건.`;

  return {
    status: "done",
    message: summary,
    sent,
    failed,
    manual,
    results,
  };
}
