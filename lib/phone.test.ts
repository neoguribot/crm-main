import { describe, expect, it } from "vitest";

import { formatKoreanPhone } from "@/lib/phone";

describe("formatKoreanPhone", () => {
  it("휴대폰 번호를 3-4-4 로 포맷", () => {
    expect(formatKoreanPhone("01012345678")).toBe("010-1234-5678");
  });

  it("입력 중간 단계도 자연스럽게 포맷", () => {
    expect(formatKoreanPhone("010")).toBe("010");
    expect(formatKoreanPhone("0101")).toBe("010-1");
    expect(formatKoreanPhone("0101234")).toBe("010-1234");
    expect(formatKoreanPhone("01012345")).toBe("010-123-45");
  });

  it("이미 하이픈이 있어도 다시 정규화", () => {
    expect(formatKoreanPhone("010-1234-5678")).toBe("010-1234-5678");
    expect(formatKoreanPhone("010--1234")).toBe("010-1234");
  });

  it("서울 지역번호 02", () => {
    expect(formatKoreanPhone("0212345678")).toBe("02-1234-5678");
    expect(formatKoreanPhone("021234567")).toBe("02-123-4567");
  });

  it("그 외 지역번호는 3-3-4 / 3-4-4", () => {
    expect(formatKoreanPhone("0311234567")).toBe("031-123-4567");
    expect(formatKoreanPhone("03112345678")).toBe("031-1234-5678");
  });

  it("숫자가 아닌 문자는 제거", () => {
    expect(formatKoreanPhone("010 1234 5678")).toBe("010-1234-5678");
    expect(formatKoreanPhone("abc010def1234")).toBe("010-1234");
  });

  it("11자리를 초과하는 숫자는 잘라냄", () => {
    expect(formatKoreanPhone("010123456789999")).toBe("010-1234-5678");
  });

  it("빈 입력은 빈 문자열", () => {
    expect(formatKoreanPhone("")).toBe("");
    expect(formatKoreanPhone("---")).toBe("");
  });
});
