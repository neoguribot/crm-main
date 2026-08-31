import { describe, expect, it } from "vitest";
import { formatWon, sumDecimalStrings, trimTrailingZeros } from "./number";

describe("sumDecimalStrings", () => {
  it("정수만 더한다", () => {
    expect(sumDecimalStrings(["1", "2", "3"], 0)).toBe("6");
  });

  it("소수를 부동소수점 오차 없이 더한다", () => {
    expect(sumDecimalStrings(["0.1", "0.2"], 3)).toBe("0.300");
  });

  it("자리수가 다른 소수도 정확히 더한다", () => {
    expect(sumDecimalStrings(["3.75", "7.5", "2"], 3)).toBe("13.250");
  });

  it("빈 배열은 0", () => {
    expect(sumDecimalStrings([], 3)).toBe("0.000");
  });

  it("값 하나면 그대로(자리수 맞춰서)", () => {
    expect(sumDecimalStrings(["5"], 3)).toBe("5.000");
  });
});

describe("formatWon / trimTrailingZeros 회귀", () => {
  it("formatWon 은 그대로 동작", () => {
    expect(formatWon("350000")).toBe("350,000원");
  });
  it("trimTrailingZeros 는 그대로 동작", () => {
    expect(trimTrailingZeros("3.750")).toBe("3.75");
  });
});
