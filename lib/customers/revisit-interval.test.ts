import { describe, expect, it } from "vitest";
import { averageRevisitIntervalDays } from "./revisit-interval";

describe("averageRevisitIntervalDays", () => {
  it("거래일이 0개 또는 1개면 null", () => {
    expect(averageRevisitIntervalDays([])).toBeNull();
    expect(averageRevisitIntervalDays(["2026-01-01"])).toBeNull();
  });

  it("같은 날 여러 건은 방문 1회로 합쳐서 여전히 null", () => {
    expect(averageRevisitIntervalDays(["2026-01-01", "2026-01-01"])).toBeNull();
  });

  it("두 건이면 그 간격 그대로", () => {
    expect(averageRevisitIntervalDays(["2026-01-01", "2026-01-11"])).toBe(10);
  });

  it("여러 건의 평균 간격을 계산한다", () => {
    // 1/1 -> 1/11 (10일) -> 1/21 (10일) : 평균 10일
    expect(
      averageRevisitIntervalDays(["2026-01-01", "2026-01-11", "2026-01-21"]),
    ).toBe(10);
  });

  it("입력 순서·중복과 무관하게 정렬 후 계산한다", () => {
    expect(
      averageRevisitIntervalDays(["2026-01-21", "2026-01-01", "2026-01-11", "2026-01-01"]),
    ).toBe(10);
  });

  it("고르지 않은 간격은 평균을 소수 첫째 자리까지 반올림한다", () => {
    // 1/1 -> 1/06 (5일) -> 1/16 (10일) : 합 15, 평균 7.5
    expect(
      averageRevisitIntervalDays(["2026-01-01", "2026-01-06", "2026-01-16"]),
    ).toBe(7.5);
  });
});
