import "server-only";

import type { Customer } from "@/lib/types/database";
import { codeToGender } from "@/lib/types/codes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  matchesCustomerFilters,
  type CustomerFilters,
} from "@/lib/customers/filters";
import { resolveLastVisitDate } from "@/lib/customers/recent-visit";
import { sumDecimalStrings } from "@/lib/number";
import type { CustomerExportRow } from "@/lib/customers/excel-columns";

const CUSTOMER_FIELDS =
  "id, name, phone, email, birth_date, gender, address, inflow_channels, inflow_channel_detail, purchase_purposes, purchase_purpose_detail, frequency_label, revenue_label, referred_by_customer_id, registered_on, first_trade_date, last_contact_date, memo, created_at, updated_at";

/**
 * 목록: 필요한 스칼라 컬럼 + 거래일(방문일 구간 필터 계산용) +
 * 매수 희망가 존재 여부(목표가 설정 고객 필터용)를 중첩으로 함께 받는다.
 */
const LIST_COLUMNS = `${CUSTOMER_FIELDS}, trade_records(trade_date), price_targets(id)`;

/** 상세/수정에 필요한 컬럼. */
const DETAIL_COLUMNS = CUSTOMER_FIELDS;

export type CustomerDetail = Pick<
  Customer,
  | "id"
  | "name"
  | "phone"
  | "email"
  | "birth_date"
  | "gender"
  | "address"
  | "inflow_channels"
  | "inflow_channel_detail"
  | "purchase_purposes"
  | "purchase_purpose_detail"
  | "frequency_label"
  | "revenue_label"
  | "referred_by_customer_id"
  | "registered_on"
  | "first_trade_date"
  | "last_contact_date"
  | "memo"
  | "created_at"
  | "updated_at"
>;

/** 목록 행: 표시에 필요한 컬럼. */
export type CustomerListItem = Pick<
  Customer,
  | "id"
  | "name"
  | "phone"
  | "inflow_channels"
  | "purchase_purposes"
  | "frequency_label"
  | "revenue_label"
  | "registered_on"
  | "first_trade_date"
  | "last_contact_date"
  | "created_at"
>;

export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const MIGRATION_HINT =
  "이 기능에는 최신 데이터베이스 마이그레이션이 필요합니다. supabase/migrations 를 확인하세요.";

type RawRow = Omit<CustomerDetail, "gender"> & { gender: number };

type RawListRow = RawRow & {
  trade_records: { trade_date: string }[] | null;
  price_targets: { id: string }[] | null;
};

function mapGenderRow<T extends { gender: number }>(
  row: T,
): Omit<T, "gender"> & { gender: Customer["gender"] } {
  const { gender, ...rest } = row;
  return { ...rest, gender: codeToGender(gender) };
}

/**
 * 로그인 사용자의 고객 목록을 검색·필터해서 반환한다.
 *
 * - 쿼리는 1회. 거래일을 중첩(`trade_records(trade_date)`)으로 함께 받아
 *   고객마다 반복 쿼리(N+1)하지 않는다.
 * - RLS(customers_select_own / trade_records_select_own)로 다른 사용자의
 *   고객·거래는 애초에 결과에 포함되지 않는다.
 * - 검색어·필터는 검증된 값으로 애플리케이션에서 적용한다(사용자 입력을
 *   SQL 로 직접 조합하지 않음). 현재 매장 단위 데이터 규모에 맞는 방식이다.
 */
export async function searchCustomers(
  filters: CustomerFilters,
): Promise<QueryResult<CustomerListItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[customers] 목록 조회 실패:", error.message);
    if (error.code === "42703") {
      return { ok: false, error: MIGRATION_HINT };
    }
    return {
      ok: false,
      error: "고객 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const rows = (data ?? []) as unknown as RawListRow[];

  const mapped = rows.map((row) => {
    const tradeDates = (row.trade_records ?? []).map((t) => t.trade_date);
    const item: CustomerListItem = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      inflow_channels: row.inflow_channels,
      purchase_purposes: row.purchase_purposes,
      frequency_label: row.frequency_label,
      revenue_label: row.revenue_label,
      registered_on: row.registered_on,
      first_trade_date: row.first_trade_date,
      last_contact_date: row.last_contact_date,
      created_at: row.created_at,
    };
    // 방문일 = 고객 등록일 + 첫 거래일자 + 모든 거래일
    const visitDates = [
      row.registered_on,
      row.first_trade_date,
      ...tradeDates,
    ].filter((d): d is string => Boolean(d));
    const hasPriceTarget = (row.price_targets ?? []).length > 0;
    return { item, visitDates, hasPriceTarget };
  });

  const filtered = mapped
    .filter(({ item, visitDates, hasPriceTarget }) =>
      matchesCustomerFilters(item, visitDates, hasPriceTarget, filters),
    )
    .map(({ item }) => item);

  return { ok: true, data: filtered };
}

const EXPORT_COLUMNS = `${CUSTOMER_FIELDS}, trade_records(trade_date, amount::text), price_targets(id)`;

type RawExportRow = RawRow & {
  trade_records: { trade_date: string; amount: string }[] | null;
  price_targets: { id: string }[] | null;
};

/**
 * 현재 필터가 적용된 고객 목록을 Excel 내보내기용 전체 필드 + 파생값으로 반환한다.
 * 필터 규칙은 `searchCustomers` 와 동일(`matchesCustomerFilters`).
 */
export async function exportCustomers(
  filters: CustomerFilters,
): Promise<QueryResult<CustomerExportRow[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select(EXPORT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[customers] 내보내기 조회 실패:", error.message);
    if (error.code === "42703") return { ok: false, error: MIGRATION_HINT };
    return {
      ok: false,
      error: "고객 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const rows = (data ?? []) as unknown as RawExportRow[];
  const nameById = new Map(rows.map((r) => [r.id, r.name]));

  const result: CustomerExportRow[] = [];
  for (const row of rows) {
    const trades = row.trade_records ?? [];
    const tradeDates = trades.map((t) => t.trade_date);
    const visitDates = [
      row.registered_on,
      row.first_trade_date,
      ...tradeDates,
    ].filter((d): d is string => Boolean(d));
    const hasPriceTarget = (row.price_targets ?? []).length > 0;

    const customer = mapGenderRow(row) as unknown as Customer;
    if (
      !matchesCustomerFilters(customer, visitDates, hasPriceTarget, filters)
    ) {
      continue;
    }

    result.push({
      customer,
      referrerName: row.referred_by_customer_id
        ? (nameById.get(row.referred_by_customer_id) ?? null)
        : null,
      lastVisitDate: resolveLastVisitDate(row.registered_on, [
        row.first_trade_date,
        ...tradeDates,
      ]),
      tradeCount: trades.length,
      totalAmount: sumDecimalStrings(
        trades.map((t) => t.amount ?? "0"),
        0,
      ),
    });
  }

  return { ok: true, data: result };
}

export type CustomerPickerItem = { id: string; name: string; phone: string };

/** 일정 등록 등에서 고객을 고르기 위한 가벼운 목록. 이름 오름차순. */
export async function listCustomersForPicker(): Promise<
  QueryResult<CustomerPickerItem[]>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("name", { ascending: true });

  if (error) {
    console.error("[customers] 선택용 목록 조회 실패:", error.message);
    return {
      ok: false,
      error: "고객 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: (data ?? []) as CustomerPickerItem[] };
}

/**
 * 고객 1건. 다른 사용자의 고객이거나 없는 ID 면 RLS 로 행이 안 나오므로
 * null 을 반환한다(호출 측에서 notFound 처리).
 */
export async function getCustomerById(
  id: string,
): Promise<QueryResult<CustomerDetail | null>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[customers] 상세 조회 실패:", error.message);
    if (error.code === "42703") {
      return { ok: false, error: MIGRATION_HINT };
    }
    return {
      ok: false,
      error: "고객 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const row = data as unknown as RawRow | null;
  return { ok: true, data: row ? mapGenderRow(row) : null };
}

/** 추천인 이름 표시 등 가벼운 참조용 — id/name 만 조회한다. */
export async function getCustomerBasicById(
  id: string,
): Promise<QueryResult<{ id: string; name: string } | null>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[customers] 추천인 조회 실패:", error.message);
    return {
      ok: false,
      error: "고객 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { ok: true, data: (data as { id: string; name: string } | null) ?? null };
}
