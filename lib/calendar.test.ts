import { describe, expect, it } from "vitest";
import {
  isInMonth,
  monthGridWeeks,
  monthLabel,
  nextMonth,
  parseYearMonth,
  prevMonth,
  WEEKDAY_LABELS,
} from "./calendar";

describe("parseYearMonth", () => {
  it("유효한 연/월을 그대로 사용한다", () => {
    expect(parseYearMonth("2026", "3", "2026-08-30")).toEqual({ year: 2026, month: 3 });
  });
  it("잘못된 값이면 오늘 기준으로 대체한다", () => {
    expect(parseYearMonth("abc", "13", "2026-08-30")).toEqual({ year: 2026, month: 8 });
    expect(parseYearMonth(undefined, undefined, "2026-08-30")).toEqual({ year: 2026, month: 8 });
    expect(parseYearMonth("2026", "0", "2026-08-30")).toEqual({ year: 2026, month: 8 });
    expect(parseYearMonth("2026", "13", "2026-08-30")).toEqual({ year: 2026, month: 8 });
  });
});

describe("monthLabel", () => {
  it("연도+월 라벨", () => {
    expect(monthLabel({ year: 2026, month: 9 })).toBe("2026년 9월");
  });
});

describe("prevMonth / nextMonth", () => {
  it("일반적인 달 이동", () => {
    expect(prevMonth({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 4 });
    expect(nextMonth({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 6 });
  });
  it("연도 경계를 넘는다", () => {
    expect(prevMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
    expect(nextMonth({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
  });
});

describe("monthGridWeeks", () => {
  it("모든 주가 7일이고 월요일 시작이다", () => {
    const weeks = monthGridWeeks({ year: 2026, month: 9 });
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    // 2026-09-01 은 화요일 → 첫 주 월요일은 2026-08-31
    expect(weeks[0][0]).toBe("2026-08-31");
    expect(weeks[0][1]).toBe("2026-09-01");
  });

  it("해당 월의 모든 날짜를 포함한다", () => {
    const weeks = monthGridWeeks({ year: 2026, month: 2 });
    const allDays = weeks.flat();
    expect(allDays).toContain("2026-02-01");
    expect(allDays).toContain("2026-02-28");
  });

  it("WEEKDAY_LABELS 는 월~일 7개", () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(WEEKDAY_LABELS[0]).toBe("월");
    expect(WEEKDAY_LABELS[6]).toBe("일");
  });
});

describe("isInMonth", () => {
  it("같은 연/월이면 true", () => {
    expect(isInMonth("2026-09-15", { year: 2026, month: 9 })).toBe(true);
    expect(isInMonth("2026-08-31", { year: 2026, month: 9 })).toBe(false);
    expect(isInMonth("2026-10-01", { year: 2026, month: 9 })).toBe(false);
  });
});
