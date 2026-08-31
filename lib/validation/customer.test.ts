import { describe, expect, it } from "vitest";

import { todayInSeoul } from "@/lib/date";
import {
  customerInputSchema,
  flattenFieldErrors,
} from "@/lib/validation/customer";

const validBase = {
  name: "홍길동",
  phone: "010-1234-5678",
  email: "",
  birth_date: "",
  gender: "UNKNOWN",
  address: "",
  inflow_channels: ["CARROT_MARKET", "KAKAO_MAP"],
  inflow_channel_detail: "",
  purchase_purposes: ["PURCHASE", "GOLD_BAR"],
  purchase_purpose_detail: "",
  frequency_label: "신규",
  revenue_label: "일반",
  referred_by_customer_id: "",
  registered_on: "2026-01-10",
  first_trade_date: "",
  last_contact_date: "",
  memo: "",
};

describe("customerInputSchema", () => {
  it("정상 입력을 통과시키고 이름·연락처 공백을 제거한다", () => {
    const parsed = customerInputSchema.parse({
      ...validBase,
      name: "  홍길동  ",
      phone: "  010-1234-5678  ",
    });
    expect(parsed.name).toBe("홍길동");
    expect(parsed.phone).toBe("010-1234-5678");
    expect(parsed.inflow_channels).toEqual(["CARROT_MARKET", "KAKAO_MAP"]);
    expect(parsed.purchase_purposes).toEqual(["PURCHASE", "GOLD_BAR"]);
  });

  it("빈 선택 항목을 null 로 변환한다", () => {
    const parsed = customerInputSchema.parse(validBase);
    expect(parsed.email).toBeNull();
    expect(parsed.birth_date).toBeNull();
    expect(parsed.address).toBeNull();
    expect(parsed.first_trade_date).toBeNull();
    expect(parsed.last_contact_date).toBeNull();
    expect(parsed.referred_by_customer_id).toBeNull();
    expect(parsed.memo).toBeNull();
  });

  it("성별 기본값은 UNKNOWN", () => {
    const { gender: _gender, ...rest } = validBase;
    expect(customerInputSchema.parse(rest).gender).toBe("UNKNOWN");
  });

  it("빈도 라벨 기본값은 신규, 매출 라벨 기본값은 일반", () => {
    const { frequency_label: _f, revenue_label: _r, ...rest } = validBase;
    const parsed = customerInputSchema.parse(rest);
    expect(parsed.frequency_label).toBe("신규");
    expect(parsed.revenue_label).toBe("일반");
  });

  it("올바른 빈도 라벨을 통과시키고 알 수 없는 값은 거부한다", () => {
    expect(
      customerInputSchema.parse({ ...validBase, frequency_label: "단골" })
        .frequency_label,
    ).toBe("단골");
    expect(
      customerInputSchema.safeParse({ ...validBase, frequency_label: "일반" })
        .success,
    ).toBe(false);
  });

  it("올바른 매출 라벨을 통과시키고 알 수 없는 값은 거부한다", () => {
    expect(
      customerInputSchema.parse({ ...validBase, revenue_label: "VIP" })
        .revenue_label,
    ).toBe("VIP");
    expect(
      customerInputSchema.safeParse({ ...validBase, revenue_label: "다이아" })
        .success,
    ).toBe(false);
  });

  it("추천인 id 는 빈 문자열/NONE이면 null, 값이 있으면 그대로 통과한다", () => {
    expect(
      customerInputSchema.parse({ ...validBase, referred_by_customer_id: "" })
        .referred_by_customer_id,
    ).toBeNull();
    expect(
      customerInputSchema.parse({ ...validBase, referred_by_customer_id: "NONE" })
        .referred_by_customer_id,
    ).toBeNull();
    expect(
      customerInputSchema.parse({
        ...validBase,
        referred_by_customer_id: "11111111-1111-1111-1111-111111111111",
      }).referred_by_customer_id,
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("이름이 공백만이면 거부한다", () => {
    expect(
      customerInputSchema.safeParse({ ...validBase, name: "   " }).success,
    ).toBe(false);
  });

  it("연락처가 없으면 거부한다", () => {
    expect(
      customerInputSchema.safeParse({ ...validBase, phone: "" }).success,
    ).toBe(false);
  });

  it("이메일 형식을 검증한다 (빈 값은 허용)", () => {
    expect(
      customerInputSchema.safeParse({ ...validBase, email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      customerInputSchema.parse({ ...validBase, email: "hong@example.com" })
        .email,
    ).toBe("hong@example.com");
  });

  it("유입 경로는 필수가 아니며 비워도 통과한다", () => {
    const parsed = customerInputSchema.parse({ ...validBase, inflow_channels: [] });
    expect(parsed.inflow_channels).toEqual([]);
  });

  it("유입 경로를 기타로 선택하면 세부 내용이 필요하다", () => {
    expect(
      customerInputSchema.safeParse({
        ...validBase,
        inflow_channels: ["OTHER"],
        inflow_channel_detail: "",
      }).success,
    ).toBe(false);
    expect(
      customerInputSchema.parse({
        ...validBase,
        inflow_channels: ["OTHER"],
        inflow_channel_detail: "지인 소개 블로그",
      }).inflow_channel_detail,
    ).toBe("지인 소개 블로그");
  });

  it("방문 목적을 기타로 선택하면 세부 내용이 필요하다", () => {
    expect(
      customerInputSchema.safeParse({
        ...validBase,
        purchase_purposes: ["OTHER"],
        purchase_purpose_detail: "",
      }).success,
    ).toBe(false);
    expect(
      customerInputSchema.parse({
        ...validBase,
        purchase_purposes: ["OTHER"],
        purchase_purpose_detail: "시계 수리 문의",
      }).purchase_purpose_detail,
    ).toBe("시계 수리 문의");
  });

  it("알 수 없는 유입 경로·방문 목적을 거부한다", () => {
    expect(
      customerInputSchema.safeParse({
        ...validBase,
        inflow_channels: ["UNKNOWN"],
      }).success,
    ).toBe(false);
    expect(
      customerInputSchema.safeParse({
        ...validBase,
        purchase_purposes: ["PURCHASE", "NOPE"],
      }).success,
    ).toBe(false);
  });

  it("방문 목적을 비워도 통과하고 빈 배열이 된다", () => {
    expect(
      customerInputSchema.parse({ ...validBase, purchase_purposes: [] })
        .purchase_purposes,
    ).toEqual([]);
  });

  it("존재하지 않는 날짜(2026-02-30)를 거부한다", () => {
    expect(
      customerInputSchema.safeParse({
        ...validBase,
        registered_on: "2026-02-30",
      }).success,
    ).toBe(false);
  });

  it("미래 등록일·생년월일·첫 거래일자·마지막 연락일을 거부한다", () => {
    for (const key of [
      "registered_on",
      "birth_date",
      "first_trade_date",
      "last_contact_date",
    ] as const) {
      expect(
        customerInputSchema.safeParse({ ...validBase, [key]: "2999-12-31" })
          .success,
      ).toBe(false);
    }
  });

  it("오늘 날짜의 등록일을 허용한다", () => {
    const parsed = customerInputSchema.parse({
      ...validBase,
      registered_on: todayInSeoul(),
    });
    expect(parsed.registered_on).toBe(todayInSeoul());
  });

  it("메모 길이 상한을 넘으면 거부한다", () => {
    expect(
      customerInputSchema.safeParse({ ...validBase, memo: "가".repeat(1001) })
        .success,
    ).toBe(false);
  });
});

describe("flattenFieldErrors", () => {
  it("필드별 첫 오류 메시지만 남긴다", () => {
    const result = customerInputSchema.safeParse({
      ...validBase,
      name: "",
      phone: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenFieldErrors(result.error);
      expect(errors.name).toBeTruthy();
      expect(errors.phone).toBeTruthy();
    }
  });
});
