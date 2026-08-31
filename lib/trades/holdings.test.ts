import { describe, expect, it } from "vitest";

import { summarizeHoldings, totalHoldingsWeight } from "./holdings";

describe("summarizeHoldings", () => {
  it("SALE 거래만 품목별로 중량을 합산한다", () => {
    const holdings = summarizeHoldings([
      { trade_type: "SALE", item_type: "GOLD_BAR", weight: "3.75" },
      { trade_type: "SALE", item_type: "GOLD_BAR", weight: "7.5" },
      { trade_type: "SALE", item_type: "GOLD_14K", weight: "2" },
      { trade_type: "PURCHASE", item_type: "GOLD_BAR", weight: "3.75" }, // 제외
      { trade_type: "PURCHASE", item_type: "SILVER_JEWELRY", weight: "10" }, // 제외
    ]);
    expect(holdings).toEqual([
      { itemType: "GOLD_BAR", totalWeight: "11.250", count: 2 },
      { itemType: "GOLD_14K", totalWeight: "2.000", count: 1 },
    ]);
  });

  it("건수 0 품목은 빠지고, ITEM_TYPES 순서를 따른다", () => {
    const holdings = summarizeHoldings([
      { trade_type: "SALE", item_type: "SILVER_JEWELRY", weight: "5" },
      { trade_type: "SALE", item_type: "GOLD_BAR", weight: "3.75" },
    ]);
    expect(holdings.map((h) => h.itemType)).toEqual([
      "GOLD_BAR",
      "SILVER_JEWELRY",
    ]);
  });

  it("알 수 없는 품목·빈 입력은 무시", () => {
    expect(
      summarizeHoldings([{ trade_type: "SALE", item_type: "PLATINUM", weight: "1" }]),
    ).toEqual([]);
    expect(summarizeHoldings([])).toEqual([]);
  });

  it("소수점이 섞여도 부동소수점 오차 없이 합산", () => {
    const holdings = summarizeHoldings([
      { trade_type: "SALE", item_type: "GOLD_BAR", weight: "0.1" },
      { trade_type: "SALE", item_type: "GOLD_BAR", weight: "0.2" },
    ]);
    expect(holdings[0].totalWeight).toBe("0.300");
  });
});

describe("totalHoldingsWeight", () => {
  it("총 중량 합산", () => {
    expect(
      totalHoldingsWeight([
        { itemType: "GOLD_BAR", totalWeight: "3.75", count: 1 },
        { itemType: "SILVER_JEWELRY", totalWeight: "10.5", count: 2 },
      ]),
    ).toBe("14.250");
    expect(totalHoldingsWeight([])).toBe("0.000");
  });
});
