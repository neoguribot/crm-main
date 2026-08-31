import { describe, expect, it } from "vitest";
import { calcPortfolioProfit, calcStoreProfit } from "./profit";

describe("calcPortfolioProfit", () => {
  it("시세가 없으면 전부 null", () => {
    expect(calcPortfolioProfit("3.75", "400000", null)).toEqual({
      currentValuation: null,
      unrealizedProfit: null,
      unrealizedProfitRate: null,
    });
  });

  it("평가액·평가손익·손익률을 계산한다", () => {
    // 3.75g(1돈), 매입원가 400,000원, 현재 시세 420,000원/돈
    const r = calcPortfolioProfit("3.75", "400000", "420000");
    expect(r.currentValuation).toBe(420000);
    expect(r.unrealizedProfit).toBe(20000);
    expect(r.unrealizedProfitRate).toBe(5);
  });

  it("손실(마이너스)도 정확히 계산한다", () => {
    const r = calcPortfolioProfit("3.75", "450000", "420000");
    expect(r.unrealizedProfit).toBe(-30000);
    expect(r.unrealizedProfitRate).toBeCloseTo(-6.67, 1);
  });

  it("매입원가 0 이면 손익률은 null", () => {
    const r = calcPortfolioProfit("3.75", "0", "420000");
    expect(r.unrealizedProfitRate).toBeNull();
  });
});

describe("calcStoreProfit", () => {
  it("판매 총액 - 매입 총액", () => {
    expect(calcStoreProfit("1000000", "400000")).toBe(600000);
  });
  it("매입이 더 크면 음수", () => {
    expect(calcStoreProfit("100000", "400000")).toBe(-300000);
  });
});
