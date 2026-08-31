import { describe, expect, it } from "vitest";
import {
  calendarMonthsWindowStart,
  suggestFrequencyLabel,
  suggestRevenueLabel,
} from "./label-suggestion";

describe("suggestRevenueLabel", () => {
  it("1,000만원 미만은 일반", () => {
    expect(suggestRevenueLabel(0)).toBe("일반");
    expect(suggestRevenueLabel(9_999_999)).toBe("일반");
  });
  it("1,000만원 이상 5,000만원 미만은 우수", () => {
    expect(suggestRevenueLabel(10_000_000)).toBe("우수");
    expect(suggestRevenueLabel(49_999_999)).toBe("우수");
  });
  it("5,000만원 이상은 VIP", () => {
    expect(suggestRevenueLabel(50_000_000)).toBe("VIP");
    expect(suggestRevenueLabel(100_000_000)).toBe("VIP");
  });
});

describe("suggestFrequencyLabel", () => {
  it("2회 미만은 신규", () => {
    expect(suggestFrequencyLabel(0)).toBe("신규");
    expect(suggestFrequencyLabel(1)).toBe("신규");
  });
  it("2회 이상은 단골", () => {
    expect(suggestFrequencyLabel(2)).toBe("단골");
    expect(suggestFrequencyLabel(10)).toBe("단골");
  });
});

describe("calendarMonthsWindowStart", () => {
  it("최근 3개월(monthsBack=2) 시작일을 캘린더 월 경계로 계산한다", () => {
    expect(calendarMonthsWindowStart(2, "2026-08-31")).toBe("2026-06-01");
    expect(calendarMonthsWindowStart(2, "2026-08-01")).toBe("2026-06-01");
  });

  it("연도 경계를 넘어도 정확하다", () => {
    expect(calendarMonthsWindowStart(2, "2026-01-15")).toBe("2025-11-01");
    expect(calendarMonthsWindowStart(2, "2026-02-15")).toBe("2025-12-01");
  });

  it("monthsBack=0 이면 이번 달 시작일", () => {
    expect(calendarMonthsWindowStart(0, "2026-08-31")).toBe("2026-08-01");
  });
});
