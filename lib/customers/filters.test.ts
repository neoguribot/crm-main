import { describe, expect, it } from "vitest";

import {
  buildCustomerSearchParams,
  EMPTY_FILTERS,
  hasActiveFilters,
  parseCustomerFilters,
  SEARCH_MAX_LENGTH,
  type CustomerFilters,
} from "@/lib/customers/filters";

function filters(over: Partial<CustomerFilters> = {}): CustomerFilters {
  return { ...EMPTY_FILTERS, ...over };
}

describe("parseCustomerFilters", () => {
  it("빈 파라미터는 기본값", () => {
    expect(parseCustomerFilters({})).toEqual(EMPTY_FILTERS);
  });

  it("검색어 앞뒤 공백 제거", () => {
    expect(parseCustomerFilters({ q: "  김철수  " }).q).toBe("김철수");
  });

  it("검색어 길이 상한 적용", () => {
    const long = "가".repeat(SEARCH_MAX_LENGTH + 50);
    expect(parseCustomerFilters({ q: long }).q.length).toBe(SEARCH_MAX_LENGTH);
  });

  it("허용된 구매목적·유입경로만 수용(다중 선택)", () => {
    expect(parseCustomerFilters({ purpose: ["GOLD_BAR", "예물"] }).purposes).toEqual([
      "GOLD_BAR",
    ]);
    expect(parseCustomerFilters({ purpose: "NOPE" }).purposes).toEqual([]);
    expect(
      parseCustomerFilters({ channel: ["CARROT_MARKET", "WALK_IN"] }).channels,
    ).toEqual(["CARROT_MARKET", "WALK_IN"]);
    expect(parseCustomerFilters({ channel: "hack" }).channels).toEqual([]);
  });

  it("중복 값은 한 번만 남긴다", () => {
    expect(
      parseCustomerFilters({ purpose: ["GOLD_BAR", "GOLD_BAR"] }).purposes,
    ).toEqual(["GOLD_BAR"]);
  });

  it("허용된 빈도·매출 라벨만 수용(다중 선택)", () => {
    expect(parseCustomerFilters({ frequencyLabel: "단골" }).frequencyLabels).toEqual([
      "단골",
    ]);
    expect(parseCustomerFilters({ frequencyLabel: "일반" }).frequencyLabels).toEqual([]);
    expect(
      parseCustomerFilters({ revenueLabel: ["VIP", "우수"] }).revenueLabels,
    ).toEqual(["VIP", "우수"]);
    expect(parseCustomerFilters({ revenueLabel: "다이아" }).revenueLabels).toEqual([]);
  });

  it("방문일 구간: 유효한 날짜만 수용", () => {
    const p = parseCustomerFilters({
      visitFrom: "2026-08-01",
      visitTo: "2026-08-31",
    });
    expect(p.visitFrom).toBe("2026-08-01");
    expect(p.visitTo).toBe("2026-08-31");
  });

  it("방문일 구간: 잘못된 날짜는 null", () => {
    expect(parseCustomerFilters({ visitFrom: "2026-13-40" }).visitFrom).toBeNull();
    expect(parseCustomerFilters({ visitTo: "어제" }).visitTo).toBeNull();
  });

  it("방문일 시작이 종료보다 뒤면 뒤바꾼다", () => {
    const p = parseCustomerFilters({
      visitFrom: "2026-09-10",
      visitTo: "2026-09-01",
    });
    expect(p.visitFrom).toBe("2026-09-01");
    expect(p.visitTo).toBe("2026-09-10");
  });

  it("배열 파라미터는 첫 값만(검색어)", () => {
    expect(parseCustomerFilters({ q: ["김", "이"] }).q).toBe("김");
  });

  it("알 수 없는 파라미터는 무시", () => {
    expect(parseCustomerFilters({ evil: "1", page: "99" })).toEqual(EMPTY_FILTERS);
  });
});

describe("buildCustomerSearchParams", () => {
  it("빈 값·기본값은 넣지 않는다", () => {
    expect(buildCustomerSearchParams(EMPTY_FILTERS).toString()).toBe("");
  });

  it("설정된 값만 직렬화(다중 선택은 반복 파라미터)", () => {
    const qs = buildCustomerSearchParams(
      filters({
        q: "김",
        purposes: ["GOLD_BAR", "STONE_PRODUCT"],
        frequencyLabels: ["단골"],
        revenueLabels: ["VIP"],
        visitFrom: "2026-08-01",
      }),
    );
    expect(qs.get("q")).toBe("김");
    expect(qs.getAll("purpose")).toEqual(["GOLD_BAR", "STONE_PRODUCT"]);
    expect(qs.get("frequencyLabel")).toBe("단골");
    expect(qs.get("revenueLabel")).toBe("VIP");
    expect(qs.get("visitFrom")).toBe("2026-08-01");
    expect(qs.has("channel")).toBe(false);
    expect(qs.has("visitTo")).toBe(false);
  });

  it("parse ↔ build 왕복 (방문일 포함)", () => {
    const qs = buildCustomerSearchParams(
      filters({
        q: "이영희",
        channels: ["WALK_IN", "TMAP"],
        visitFrom: "2026-01-02",
        visitTo: "2026-03-04",
      }),
    );
    const params = new URLSearchParams(qs);
    const sp: Record<string, string | string[]> = {};
    for (const key of new Set(params.keys())) {
      const values = params.getAll(key);
      sp[key] = values.length > 1 ? values : values[0];
    }
    const parsed = parseCustomerFilters(sp);
    expect(parsed.q).toBe("이영희");
    expect(parsed.channels).toEqual(["WALK_IN", "TMAP"]);
    expect(parsed.visitFrom).toBe("2026-01-02");
    expect(parsed.visitTo).toBe("2026-03-04");
  });
});

describe("hasActiveFilters", () => {
  it("아무 조건 없으면 false", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("하나라도 있으면 true", () => {
    expect(hasActiveFilters(filters({ q: "김" }))).toBe(true);
    expect(hasActiveFilters(filters({ visitFrom: "2026-08-01" }))).toBe(true);
    expect(hasActiveFilters(filters({ visitTo: "2026-08-31" }))).toBe(true);
    expect(hasActiveFilters(filters({ frequencyLabels: ["단골"] }))).toBe(true);
    expect(hasActiveFilters(filters({ revenueLabels: ["VIP"] }))).toBe(true);
  });
});
