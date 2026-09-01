import { isValidIsoDate } from "@/lib/date";
import { customerMatchesQuery } from "@/lib/customers/match";
import { visitedWithin } from "@/lib/customers/recent-visit";
import {
  FREQUENCY_LABELS,
  INFLOW_CHANNELS,
  PURCHASE_PURPOSES,
  REVENUE_LABELS,
  type FrequencyLabel,
  type InflowChannel,
  type PurchasePurpose,
  type RevenueLabel,
} from "@/lib/types/database";

export const SEARCH_MAX_LENGTH = 100;

export type CustomerFilters = {
  /** 이름·연락처 통합 검색어 (trim 됨, 빈 문자열이면 전체) */
  q: string;
  /** 방문 목적(다중 선택, OR 조건). 비어 있으면 제한 없음. */
  purposes: PurchasePurpose[];
  /** 유입 경로(다중 선택, OR 조건). 비어 있으면 제한 없음. */
  channels: InflowChannel[];
  /** 빈도 라벨(다중 선택, OR 조건). 비어 있으면 제한 없음. */
  frequencyLabels: FrequencyLabel[];
  /** 매출 라벨(다중 선택, OR 조건). 비어 있으면 제한 없음. */
  revenueLabels: RevenueLabel[];
  /** 방문일 구간 시작 `YYYY-MM-DD` (포함). null 이면 제한 없음. */
  visitFrom: string | null;
  /** 방문일 구간 종료 `YYYY-MM-DD` (포함). null 이면 제한 없음. */
  visitTo: string | null;
  /** true 면 매수 희망가(price_targets)가 설정된 고객만. */
  hasPriceTarget: boolean;
};

export const EMPTY_FILTERS: CustomerFilters = {
  q: "",
  purposes: [],
  channels: [],
  frequencyLabels: [],
  revenueLabels: [],
  visitFrom: null,
  visitTo: null,
  hasPriceTarget: false,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function allValues(v: string | string[] | undefined): string[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function parseIsoDate(v: string | string[] | undefined): string | null {
  const raw = firstValue(v).trim();
  return isValidIsoDate(raw) ? raw : null;
}

function parseAllowedValues<T extends string>(
  v: string | string[] | undefined,
  allowed: readonly T[],
): T[] {
  const set = new Set(allowed as readonly string[]);
  const seen = new Set<T>();
  for (const raw of allValues(v)) {
    if (set.has(raw) && !seen.has(raw as T)) seen.add(raw as T);
  }
  return Array.from(seen);
}

/**
 * URL 검색 파라미터를 검증된 필터로 변환한다.
 * 알 수 없는 값·음수·허용되지 않은 값은 조용히 무시(기본값)한다.
 */
export function parseCustomerFilters(sp: RawSearchParams): CustomerFilters {
  const q = firstValue(sp.q).trim().slice(0, SEARCH_MAX_LENGTH);

  const purposes = parseAllowedValues(sp.purpose, PURCHASE_PURPOSES);
  const channels = parseAllowedValues(sp.channel, INFLOW_CHANNELS);
  const frequencyLabels = parseAllowedValues(sp.frequencyLabel, FREQUENCY_LABELS);
  const revenueLabels = parseAllowedValues(sp.revenueLabel, REVENUE_LABELS);

  let visitFrom = parseIsoDate(sp.visitFrom);
  let visitTo = parseIsoDate(sp.visitTo);
  // 시작이 종료보다 뒤면 뒤바꾼다(사용자 편의).
  if (visitFrom && visitTo && visitFrom > visitTo) {
    [visitFrom, visitTo] = [visitTo, visitFrom];
  }

  const hasPriceTarget = firstValue(sp.hasPriceTarget) === "1";

  return {
    q,
    purposes,
    channels,
    frequencyLabels,
    revenueLabels,
    visitFrom,
    visitTo,
    hasPriceTarget,
  };
}

/** 필터를 URL 쿼리스트링으로. 빈 값/기본값은 넣지 않는다. */
export function buildCustomerSearchParams(
  filters: CustomerFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const p of filters.purposes) params.append("purpose", p);
  for (const c of filters.channels) params.append("channel", c);
  for (const f of filters.frequencyLabels) params.append("frequencyLabel", f);
  for (const r of filters.revenueLabels) params.append("revenueLabel", r);
  if (filters.visitFrom) params.set("visitFrom", filters.visitFrom);
  if (filters.visitTo) params.set("visitTo", filters.visitTo);
  if (filters.hasPriceTarget) params.set("hasPriceTarget", "1");
  return params;
}

/** 필터 매칭에 필요한 고객 최소 필드. */
export type FilterableCustomer = {
  name: string;
  phone: string;
  inflow_channels: InflowChannel[];
  purchase_purposes: PurchasePurpose[];
  frequency_label: FrequencyLabel;
  revenue_label: RevenueLabel;
};

/**
 * 한 고객이 필터 조건을 모두 통과하는지. 목록 조회와 Excel 내보내기가 공유한다.
 * `visitDates` 는 등록일·첫거래일·거래일 모음, `hasPriceTarget` 는 매수 희망가 존재 여부.
 */
export function matchesCustomerFilters(
  customer: FilterableCustomer,
  visitDates: readonly string[],
  hasPriceTarget: boolean,
  filters: CustomerFilters,
): boolean {
  if (filters.hasPriceTarget && !hasPriceTarget) return false;

  if (!customerMatchesQuery(customer.name, customer.phone, filters.q)) {
    return false;
  }

  if (
    filters.channels.length > 0 &&
    !customer.inflow_channels.some((ch) => filters.channels.includes(ch))
  ) {
    return false;
  }

  if (
    filters.purposes.length > 0 &&
    !customer.purchase_purposes.some((p) => filters.purposes.includes(p))
  ) {
    return false;
  }

  if (
    filters.frequencyLabels.length > 0 &&
    !filters.frequencyLabels.includes(customer.frequency_label)
  ) {
    return false;
  }

  if (
    filters.revenueLabels.length > 0 &&
    !filters.revenueLabels.includes(customer.revenue_label)
  ) {
    return false;
  }

  if (
    (filters.visitFrom || filters.visitTo) &&
    !visitedWithin(visitDates, filters.visitFrom, filters.visitTo)
  ) {
    return false;
  }

  return true;
}

export function hasActiveFilters(filters: CustomerFilters): boolean {
  return Boolean(
    filters.q ||
      filters.purposes.length > 0 ||
      filters.channels.length > 0 ||
      filters.frequencyLabels.length > 0 ||
      filters.revenueLabels.length > 0 ||
      filters.visitFrom ||
      filters.visitTo ||
      filters.hasPriceTarget,
  );
}
