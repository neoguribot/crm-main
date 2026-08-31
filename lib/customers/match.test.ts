import { describe, expect, it } from "vitest";

import { customerMatchesQuery } from "@/lib/customers/match";

describe("customerMatchesQuery", () => {
  it("빈 검색어는 항상 매칭", () => {
    expect(customerMatchesQuery("홍길동", "010-1234-5678", "")).toBe(true);
    expect(customerMatchesQuery("홍길동", "010-1234-5678", "   ")).toBe(true);
  });

  it("이름은 정확히 일치할 때만 매칭", () => {
    expect(customerMatchesQuery("홍길동", "010-0000-0000", "홍길동")).toBe(true);
    expect(customerMatchesQuery("홍길동", "010-0000-0000", "홍길")).toBe(false);
    expect(customerMatchesQuery("홍길동", "010-0000-0000", "길동")).toBe(false);
    expect(customerMatchesQuery("홍길동전", "010-0000-0000", "홍길동")).toBe(false);
  });

  it("이름 매칭은 앞뒤 공백·대소문자 무시", () => {
    expect(customerMatchesQuery("  홍길동 ", "010", "홍길동")).toBe(true);
    expect(customerMatchesQuery("Kim", "010", "kim")).toBe(true);
  });

  it("연락처는 부분 일치", () => {
    expect(customerMatchesQuery("홍길동", "010-1234-5678", "1234")).toBe(true);
    expect(customerMatchesQuery("홍길동", "010-1234-5678", "5678")).toBe(true);
  });

  it("연락처는 하이픈 유무가 달라도 매칭", () => {
    expect(customerMatchesQuery("홍길동", "010-1234-5678", "01012345678")).toBe(true);
    expect(customerMatchesQuery("홍길동", "01012345678", "010-1234")).toBe(true);
  });

  it("이름 일부만 입력하면 연락처에도 없으면 매칭 안 됨", () => {
    expect(customerMatchesQuery("홍길동", "010-1234-5678", "홍")).toBe(false);
  });
});
