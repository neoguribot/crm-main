"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { detectNewlyReached, parsePriceInt } from "@/lib/prices/target";

export type PriceActionState = {
  ok: boolean;
  error: string | null;
  /** 시세 저장 시 새로 생성된 알림 수 */
  newAlerts?: number;
};

const MIN_PRICE = 10_000;
const MAX_PRICE = 100_000_000;

function validatePrice(raw: unknown): number | null {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  const n = parsePriceInt(s);
  if (n == null || n < MIN_PRICE || n > MAX_PRICE) return null;
  return n;
}

async function requireUserId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

/** 고객 목표가격(매수 희망) 등록·수정. */
export async function savePriceTarget(
  customerId: string,
  _prev: PriceActionState,
  formData: FormData,
): Promise<PriceActionState> {
  const price = validatePrice(formData.get("target_price_per_don"));
  if (price == null) {
    return { ok: false, error: "1돈당 희망 가격을 원 단위 숫자로 입력해 주세요." };
  }
  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw.length > 0 ? noteRaw.slice(0, 500) : null;

  const ownerId = await requireUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("price_targets").upsert(
    {
      owner_id: ownerId,
      customer_id: customerId,
      target_price_per_don: String(price),
      note,
    },
    { onConflict: "customer_id" },
  );

  if (error) {
    console.error("[prices] 목표가격 저장 실패:", error.message);
    if (error.code === "42P01") {
      return {
        ok: false,
        error:
          "이 기능은 데이터베이스 마이그레이션(0006)이 필요합니다. supabase/migrations 를 확인하세요.",
      };
    }
    return { ok: false, error: "목표가격을 저장하지 못했습니다." };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/prices");
  redirect(`/customers/${customerId}`);
}

/** 고객 목표가격 삭제. */
export async function deletePriceTarget(
  customerId: string,
  _prev: PriceActionState,
  _formData: FormData,
): Promise<PriceActionState> {
  await requireUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("price_targets")
    .delete()
    .eq("customer_id", customerId);

  if (error) {
    console.error("[prices] 목표가격 삭제 실패:", error.message);
    return { ok: false, error: "목표가격을 삭제하지 못했습니다." };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/prices");
  redirect(`/customers/${customerId}`);
}

type TargetRow = {
  id: string;
  customer_id: string;
  target_price_per_don: string;
  customers: { name: string } | null;
};

/**
 * 금 시세를 새 이력으로 등록하고(변동값이라 등록마다 쌓임), 매수 희망
 * 가격에 새로 도달한 고객이 있으면 알림을 생성한다.
 */
export async function saveGoldPrice(
  _prev: PriceActionState,
  formData: FormData,
): Promise<PriceActionState> {
  const price = validatePrice(formData.get("price_per_don"));
  if (price == null) {
    return {
      ok: false,
      error: "금 1돈 시세를 원 단위 숫자로 입력해 주세요 (예: 588750).",
    };
  }

  const ownerId = await requireUserId();
  const supabase = await createServerSupabaseClient();

  // 직전(등록 시점 기준 가장 최근) 시세
  const { data: prevRow, error: prevErr } = await supabase
    .from("gold_prices")
    .select("price_per_don::text")
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevErr && prevErr.code === "42P01") {
    return {
      ok: false,
      error:
        "이 기능은 데이터베이스 마이그레이션(0006)이 필요합니다. supabase/migrations 를 확인하세요.",
    };
  }
  const prevPrice =
    (prevRow as { price_per_don: string } | null)?.price_per_don ?? null;

  // 새 시세 이력 등록
  const { data: savedRow, error: saveErr } = await supabase
    .from("gold_prices")
    .insert({
      owner_id: ownerId,
      price_per_don: String(price),
      source: "MANUAL",
    })
    .select("id")
    .single();

  if (saveErr || !savedRow) {
    console.error("[prices] 시세 저장 실패:", saveErr?.message);
    return { ok: false, error: "시세를 저장하지 못했습니다." };
  }

  // 목표가격 도달 점검
  const { data: targetRows, error: targetErr } = await supabase
    .from("price_targets")
    .select("id, customer_id, target_price_per_don::text, customers(name)");

  if (targetErr) {
    console.error("[prices] 목표가격 조회 실패:", targetErr.message);
    // 시세는 저장됐으므로 성공으로 보고, 알림만 생략
    revalidatePath("/prices");
    return { ok: true, error: null, newAlerts: 0 };
  }

  const targets = ((targetRows ?? []) as unknown as TargetRow[]).map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    customer_name: r.customers?.name ?? "고객",
    target_price_per_don: r.target_price_per_don,
  }));

  const reached = detectNewlyReached(targets, String(price), prevPrice);

  let created = 0;
  if (reached.length > 0) {
    // dedupe_key 는 (목표, 이번 시세 등록 건) 단위 — 하루에 여러 번 오르내려도
    // 실제로 다시 도달한 시점마다 각각 알림이 생성된다(같은 날 재알림 억제 안 함).
    const dedupeKeys = reached.map((t) => `target:${t.id}:${savedRow.id}`);
    const { data: existing } = await supabase
      .from("notifications")
      .select("dedupe_key")
      .in("dedupe_key", dedupeKeys);
    const existingSet = new Set(
      ((existing ?? []) as { dedupe_key: string }[]).map((e) => e.dedupe_key),
    );

    const toInsert = reached
      .filter((t) => !existingSet.has(`target:${t.id}:${savedRow.id}`))
      .map((t) => ({
        owner_id: ownerId,
        type: "PRICE_TARGET_REACHED",
        customer_id: t.customer_id,
        title: `${t.customer_name} 고객의 매수 희망 가격에 도달했습니다.`,
        body: `매수 희망 ${Number(t.target_price_per_don).toLocaleString("ko-KR")}원/돈 · 현재 ${price.toLocaleString("ko-KR")}원/돈 · 전화 상담 추천`,
        dedupe_key: `target:${t.id}:${savedRow.id}`,
      }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("notifications")
        .insert(toInsert);
      if (insErr) {
        console.error("[prices] 알림 생성 실패:", insErr.message);
      } else {
        created = toInsert.length;
      }
    }
  }

  revalidatePath("/prices");
  revalidatePath("/customers", "layout");
  return { ok: true, error: null, newAlerts: created };
}

/** 시세 이력 1건 수정 (금액만). */
export async function updateGoldPrice(
  priceId: string,
  _prev: PriceActionState,
  formData: FormData,
): Promise<PriceActionState> {
  const price = validatePrice(formData.get("price_per_don"));
  if (price == null) {
    return { ok: false, error: "금 1돈 시세를 원 단위 숫자로 입력해 주세요." };
  }

  await requireUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("gold_prices")
    .update({ price_per_don: String(price) })
    .eq("id", priceId);

  if (error) {
    console.error("[prices] 시세 수정 실패:", error.message);
    return { ok: false, error: "시세를 수정하지 못했습니다." };
  }

  revalidatePath("/prices");
  return { ok: true, error: null };
}

/** 시세 이력 1건 삭제. */
export async function deleteGoldPrice(
  priceId: string,
  _prev: PriceActionState,
  _formData: FormData,
): Promise<PriceActionState> {
  await requireUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("gold_prices").delete().eq("id", priceId);

  if (error) {
    console.error("[prices] 시세 삭제 실패:", error.message);
    return { ok: false, error: "시세를 삭제하지 못했습니다." };
  }

  revalidatePath("/prices");
  return { ok: true, error: null };
}
