import { describe, expect, it } from "vitest";

import { todayInSeoul } from "@/lib/date";
import {
  tradeRecordFormDataToObject,
  tradeRecordInputSchema,
} from "@/lib/validation/trade-record";

const base = {
  trade_type: "SALE",
  item_type: "GOLD_BAR",
  item_detail: "",
  unit_price: "155000",
  amount: "581250",
  weight: "3.75",
  status: "DONE",
  trade_date: "2026-01-10",
  memo: "",
};

describe("tradeRecordInputSchema", () => {
  it("정상 판매 거래를 통과시킨다", () => {
    const parsed = tradeRecordInputSchema.parse(base);
    expect(parsed.trade_type).toBe("SALE");
    expect(parsed.unit_price).toBe("155000");
    expect(parsed.amount).toBe("581250");
    expect(parsed.weight).toBe("3.75");
    expect(parsed.item_detail).toBeNull();
    expect(parsed.memo).toBeNull();
  });

  it("정상 매입 거래를 통과시킨다", () => {
    const parsed = tradeRecordInputSchema.parse({
      ...base,
      trade_type: "PURCHASE",
    });
    expect(parsed.trade_type).toBe("PURCHASE");
  });

  it("빈 세부내용·비고를 null 로 정규화한다", () => {
    const parsed = tradeRecordInputSchema.parse({
      ...base,
      item_detail: "",
      memo: "",
    });
    expect(parsed.item_detail).toBeNull();
    expect(parsed.memo).toBeNull();
  });

  it("품목이 기타면 세부 내용이 필수", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, item_type: "OTHER" }).success,
    ).toBe(false);
    const ok = tradeRecordInputSchema.parse({
      ...base,
      item_type: "OTHER",
      item_detail: "백금 반지",
    });
    expect(ok.item_detail).toBe("백금 반지");
  });

  it("매입 전용 품목(은수저·치금)은 판매에서 거부, 매입에서 허용", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, item_type: "SILVER_SPOON" })
        .success,
    ).toBe(false);
    expect(
      tradeRecordInputSchema.safeParse({ ...base, item_type: "SCRAP_GOLD" })
        .success,
    ).toBe(false);
    expect(
      tradeRecordInputSchema.safeParse({
        ...base,
        trade_type: "PURCHASE",
        item_type: "SILVER_SPOON",
      }).success,
    ).toBe(true);
  });

  it("새 품목 코드를 허용한다", () => {
    for (const code of [
      "SILVER_BAR",
      "GOLD_24K",
      "GOLD_24K_STONE",
      "GOLD_24K_JEWELRY",
      "SILVER_JEWELRY",
    ]) {
      expect(
        tradeRecordInputSchema.safeParse({ ...base, item_type: code }).success,
      ).toBe(true);
    }
  });

  it("중량 0 을 거부한다", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, weight: "0" }).success,
    ).toBe(false);
    expect(
      tradeRecordInputSchema.safeParse({ ...base, weight: "0.000" }).success,
    ).toBe(false);
  });

  it("기준 단가·총 금액 필수, 음수·소수·문자열 거부", () => {
    for (const field of ["unit_price", "amount"] as const) {
      expect(
        tradeRecordInputSchema.safeParse({ ...base, [field]: "" }).success,
      ).toBe(false);
      expect(
        tradeRecordInputSchema.safeParse({ ...base, [field]: "-1" }).success,
      ).toBe(false);
      expect(
        tradeRecordInputSchema.safeParse({ ...base, [field]: "1000.5" }).success,
      ).toBe(false);
      expect(
        tradeRecordInputSchema.safeParse({ ...base, [field]: "abc" }).success,
      ).toBe(false);
    }
  });

  it("기준 단가·총 금액 0 은 허용한다", () => {
    const parsed = tradeRecordInputSchema.parse({
      ...base,
      unit_price: "0",
      amount: "0",
    });
    expect(parsed.unit_price).toBe("0");
    expect(parsed.amount).toBe("0");
  });

  it("NaN·Infinity·지수표기 문자열을 거부한다", () => {
    for (const bad of ["NaN", "Infinity", "1e3", "0x10", "1,000"]) {
      expect(
        tradeRecordInputSchema.safeParse({ ...base, weight: bad }).success,
      ).toBe(false);
    }
  });

  it("중량 소수 4자리를 거부한다", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, weight: "3.7501" }).success,
    ).toBe(false);
  });

  it("완료 여부를 통과시키고 잘못된 값은 거부한다", () => {
    expect(
      tradeRecordInputSchema.parse({ ...base, status: "IN_PROGRESS" }).status,
    ).toBe("IN_PROGRESS");
    expect(
      tradeRecordInputSchema.safeParse({ ...base, status: "CANCELLED" })
        .success,
    ).toBe(false);
  });

  it("잘못된 거래구분·품목을 거부한다", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, trade_type: "GIFT" }).success,
    ).toBe(false);
    expect(
      tradeRecordInputSchema.safeParse({ ...base, item_type: "PLATINUM" })
        .success,
    ).toBe(false);
  });

  it("존재하지 않는 거래일을 거부한다", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, trade_date: "2026-02-30" })
        .success,
    ).toBe(false);
  });

  it("미래 거래일을 거부한다", () => {
    expect(
      tradeRecordInputSchema.safeParse({ ...base, trade_date: "2999-12-31" })
        .success,
    ).toBe(false);
  });

  it("오늘 거래일을 허용한다", () => {
    const parsed = tradeRecordInputSchema.parse({
      ...base,
      trade_date: todayInSeoul(),
    });
    expect(parsed.trade_date).toBe(todayInSeoul());
  });
});

describe("tradeRecordFormDataToObject", () => {
  it("금액의 1000단위 콤마를 제거한다", () => {
    const fd = new FormData();
    fd.set("trade_type", "SALE");
    fd.set("item_type", "GOLD_BAR");
    fd.set("unit_price", "155,000");
    fd.set("amount", "1,581,250");
    fd.set("weight", "3.75");
    fd.set("trade_date", "2026-01-10");
    const obj = tradeRecordFormDataToObject(fd);
    expect(obj.unit_price).toBe("155000");
    expect(obj.amount).toBe("1581250");
    expect(tradeRecordInputSchema.safeParse(obj).success).toBe(true);
  });
});
