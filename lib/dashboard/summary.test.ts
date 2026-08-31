import { describe, expect, it } from "vitest";

import { normalizeDashboardSummary } from "@/lib/dashboard/summary";

describe("normalizeDashboardSummary", () => {
  it("완전한 응답을 그대로 매핑한다", () => {
    const s = normalizeDashboardSummary({
      customer_count: 12,
      month_sale_amount: "3500000",
      month_purchase_amount: "1200000",
      purpose_counts: {
        PURCHASE: 4,
        GOLD_BAR: 3,
        STONE_PRODUCT: 2,
        CUSTOM_JEWELRY: 1,
        OTHER: 0,
      },
      upcoming_event_count: 2,
      recent_trades: [
        {
          id: "t1",
          customer_id: "c1",
          customer_name: "홍길동",
          trade_type: 1,
          item_type: 1,
          unit_price: "93333",
          amount: "350000",
          status: 1,
          trade_date: "2026-08-20",
        },
      ],
    });
    expect(s.customerCount).toBe(12);
    expect(s.monthSaleAmount).toBe("3500000");
    expect(s.monthPurchaseAmount).toBe("1200000");
    expect(s.purposeCounts.PURCHASE).toBe(4);
    expect(s.upcomingEventCount).toBe(2);
    expect(s.recentTrades).toHaveLength(1);
    expect(s.recentTrades[0].customer_name).toBe("홍길동");
  });

  it("빈 응답은 모두 0 / 빈 값", () => {
    const s = normalizeDashboardSummary({});
    expect(s.customerCount).toBe(0);
    expect(s.monthSaleAmount).toBe("0");
    expect(s.monthPurchaseAmount).toBe("0");
    expect(s.upcomingEventCount).toBe(0);
    expect(s.recentTrades).toEqual([]);
    expect(s.purposeCounts).toEqual({
      PURCHASE: 0,
      GOLD_BAR: 0,
      STONE_PRODUCT: 0,
      CUSTOM_JEWELRY: 0,
      OTHER: 0,
    });
  });

  it("null / undefined 입력도 0 으로", () => {
    expect(normalizeDashboardSummary(null).customerCount).toBe(0);
    expect(normalizeDashboardSummary(undefined).monthSaleAmount).toBe("0");
  });

  it("금액이 숫자로 와도 문자열로 정규화", () => {
    const s = normalizeDashboardSummary({ month_sale_amount: 500000 });
    expect(s.monthSaleAmount).toBe("500000");
  });

  it("잘못된 금액 문자열은 0", () => {
    expect(
      normalizeDashboardSummary({ month_sale_amount: "abc" }).monthSaleAmount,
    ).toBe("0");
  });

  it("음수 카운트는 0 으로 clamp", () => {
    expect(normalizeDashboardSummary({ customer_count: -3 }).customerCount).toBe(0);
  });

  it("recent_trades 는 최대 5건, 불완전 항목은 제외", () => {
    const s = normalizeDashboardSummary({
      recent_trades: [
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `t${i}`,
          customer_id: `c${i}`,
          customer_name: `고객${i}`,
          trade_type: 2,
          item_type: 8,
          unit_price: "1000",
          amount: "1000",
          status: 1,
          trade_date: "2026-08-01",
        })),
        { id: "bad" }, // 불완전
      ],
    });
    expect(s.recentTrades).toHaveLength(5);
  });

  it("purpose_counts 의 알 수 없는 키는 무시하고 누락 키는 0", () => {
    const s = normalizeDashboardSummary({
      purpose_counts: { PURCHASE: 2, HACKED: 999 },
    });
    expect(s.purposeCounts.PURCHASE).toBe(2);
    expect(s.purposeCounts.OTHER).toBe(0);
    expect((s.purposeCounts as Record<string, number>).HACKED).toBeUndefined();
  });
});
