import "server-only";

import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/users/queries";
import { getLatestGoldPrice } from "@/lib/prices/queries";
import { todayInSeoul } from "@/lib/date";

/** 발송 시 공통으로 필요한 매장·시세 값. */
export type MessagingContext = {
  storeName: string | null;
  senderPhone: string | null;
  kakaoPfId: string | null;
  latestPricePerDon: string | null;
};

export async function getMessagingContext(): Promise<MessagingContext> {
  const [userRes, priceRes] = await Promise.all([
    getCurrentAppUser(),
    getLatestGoldPrice(),
  ]);
  const user = userRes.ok ? userRes.data : null;
  const price = priceRes.ok ? priceRes.data : null;
  return {
    storeName: user?.store_name ?? null,
    senderPhone: user?.sender_phone ?? null,
    kakaoPfId: user?.kakao_pf_id ?? null,
    latestPricePerDon: price?.price_per_don ?? null,
  };
}

/** 발송 대상 후보 1명 — 미리보기 변수 계산에 필요한 값 포함. */
export type MessageCandidate = {
  id: string;
  name: string;
  phone: string;
  last_contact_date: string | null;
  birth_date: string | null;
  target_price_per_don: string | null;
  next_event: { event_date: string; event_type: number } | null;
};

type RawCandidate = {
  id: string;
  name: string;
  phone: string;
  last_contact_date: string | null;
  birth_date: string | null;
  price_targets: { target_price_per_don: string }[] | null;
  customer_events:
    | { event_date: string; event_type: number; is_done: boolean }[]
    | null;
};

/** 로그인 사용자의 고객 전체를 발송 후보로. 이름 오름차순. */
export async function listMessageCandidates(): Promise<
  QueryResult<MessageCandidate[]>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, phone, last_contact_date, birth_date, price_targets(target_price_per_don::text), customer_events(event_date, event_type, is_done)",
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("[messaging] 발송 후보 조회 실패:", error.message);
    return {
      ok: false,
      error: "고객 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const today = todayInSeoul();
  const rows = (data ?? []) as unknown as RawCandidate[];

  const candidates = rows.map((row) => {
    const upcoming = (row.customer_events ?? [])
      .filter((e) => !e.is_done && e.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      last_contact_date: row.last_contact_date,
      birth_date: row.birth_date,
      target_price_per_don:
        row.price_targets?.[0]?.target_price_per_don ?? null,
      next_event: upcoming
        ? { event_date: upcoming.event_date, event_type: upcoming.event_type }
        : null,
    };
  });

  return { ok: true, data: candidates };
}
