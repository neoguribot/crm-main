import "server-only";

import type { QueryResult } from "@/lib/customers/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GoldPrice, PriceTarget } from "@/lib/types/database";

export type LatestGoldPrice = Pick<
  GoldPrice,
  "registered_at" | "price_per_don" | "source"
>;

/**
 * 가장 최근 금 시세 1건 (owner 범위, RLS). 없으면 data: null.
 * 마이그레이션 0006 미적용 DB(42P01)는 null 로 degrade 한다.
 */
export async function getLatestGoldPrice(): Promise<
  QueryResult<LatestGoldPrice | null>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("gold_prices")
    .select("registered_at, price_per_don::text, source")
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return { ok: true, data: null };
    console.error("[prices] 최근 시세 조회 실패:", error.message);
    return { ok: false, error: "시세를 불러오지 못했습니다." };
  }

  return { ok: true, data: (data as unknown as LatestGoldPrice) ?? null };
}

export type GoldPriceListItem = Pick<
  GoldPrice,
  "id" | "registered_at" | "price_per_don" | "source"
>;

/** 시세 이력. 최근 순. 마이그레이션 0006 미적용 DB(42P01)는 빈 목록으로. */
export async function listGoldPrices(
  limit = 90,
): Promise<QueryResult<GoldPriceListItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("gold_prices")
    .select("id, registered_at, price_per_don::text, source")
    .order("registered_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01") return { ok: true, data: [] };
    console.error("[prices] 시세 이력 조회 실패:", error.message);
    return { ok: false, error: "시세 이력을 불러오지 못했습니다." };
  }

  return { ok: true, data: (data ?? []) as unknown as GoldPriceListItem[] };
}

export type CustomerPriceTarget = Pick<
  PriceTarget,
  "id" | "customer_id" | "target_price_per_don" | "note" | "updated_at"
>;

/** 특정 고객의 목표가격 1건. 없으면 null. 0006 미적용 시 null. */
export async function getPriceTarget(
  customerId: string,
): Promise<QueryResult<CustomerPriceTarget | null>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("price_targets")
    .select("id, customer_id, target_price_per_don::text, note, updated_at")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return { ok: true, data: null };
    console.error("[prices] 목표가격 조회 실패:", error.message);
    return { ok: false, error: "목표가격을 불러오지 못했습니다." };
  }

  return { ok: true, data: (data as unknown as CustomerPriceTarget) ?? null };
}
