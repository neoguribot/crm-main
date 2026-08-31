import { describe, expect, it } from "vitest";

import {
  daysBetweenIsoDates,
  resolveLastVisitDate,
  visitedWithin,
} from "@/lib/customers/recent-visit";

describe("daysBetweenIsoDates", () => {
  it("같은 날은 0", () => {
    expect(daysBetweenIsoDates("2026-03-01", "2026-03-01")).toBe(0);
  });

  it("30일 차이", () => {
    expect(daysBetweenIsoDates("2026-01-01", "2026-01-31")).toBe(30);
  });

  it("월·연 경계를 넘어도 정확", () => {
    expect(daysBetweenIsoDates("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetweenIsoDates("2024-02-28", "2024-03-01")).toBe(2); // 2024 윤년
  });

  it("from 이 미래면 음수", () => {
    expect(daysBetweenIsoDates("2026-03-10", "2026-03-01")).toBe(-9);
  });
});

describe("resolveLastVisitDate", () => {
  it("거래가 없으면 기준 날짜", () => {
    expect(resolveLastVisitDate("2026-01-10", [])).toBe("2026-01-10");
  });

  it("거래가 여러 건이면 가장 최근 거래일", () => {
    expect(
      resolveLastVisitDate("2026-01-10", ["2026-02-01", "2026-03-15", "2026-01-20"]),
    ).toBe("2026-03-15");
  });

  it("모든 거래가 기준 날짜보다 이전이면 기준 날짜", () => {
    expect(
      resolveLastVisitDate("2026-05-01", ["2026-01-01", "2026-02-01"]),
    ).toBe("2026-05-01");
  });
});

describe("visitedWithin", () => {
  const dates = ["2026-01-10", "2026-05-20", "2026-08-01"];

  it("from·to 모두 없으면 항상 true", () => {
    expect(visitedWithin(dates, null, null)).toBe(true);
    expect(visitedWithin([], null, null)).toBe(true);
  });

  it("구간 안에 방문일이 하나라도 있으면 true (양끝 포함)", () => {
    expect(visitedWithin(dates, "2026-05-01", "2026-06-01")).toBe(true);
    expect(visitedWithin(dates, "2026-08-01", "2026-08-01")).toBe(true);
  });

  it("구간에 방문일이 없으면 false", () => {
    expect(visitedWithin(dates, "2026-02-01", "2026-04-30")).toBe(false);
    expect(visitedWithin(dates, "2026-09-01", null)).toBe(false);
  });

  it("한쪽만 지정", () => {
    expect(visitedWithin(dates, null, "2026-01-31")).toBe(true);
    expect(visitedWithin(dates, "2026-06-01", null)).toBe(true);
    expect(visitedWithin(dates, null, "2026-01-01")).toBe(false);
  });

  it("형식이 깨진 날짜는 무시", () => {
    expect(visitedWithin(["bad", ""], "2026-01-01", "2026-12-31")).toBe(false);
  });
});
