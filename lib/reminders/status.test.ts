import { describe, expect, it } from "vitest";

import {
  classifyRemindStatus,
  formatDayDelta,
  matchesRemindFilter,
  remindDayDelta,
} from "@/lib/reminders/status";

const TODAY = "2026-08-28";

describe("classifyRemindStatus", () => {
  it("오늘 이전이면 OVERDUE", () => {
    expect(classifyRemindStatus("2026-08-27", TODAY)).toBe("OVERDUE");
    expect(classifyRemindStatus("2025-01-01", TODAY)).toBe("OVERDUE");
  });

  it("오늘이면 TODAY", () => {
    expect(classifyRemindStatus(TODAY, TODAY)).toBe("TODAY");
  });

  it("1일 후는 WITHIN_7_DAYS", () => {
    expect(classifyRemindStatus("2026-08-29", TODAY)).toBe("WITHIN_7_DAYS");
  });

  it("정확히 7일 후는 WITHIN_7_DAYS", () => {
    expect(classifyRemindStatus("2026-09-04", TODAY)).toBe("WITHIN_7_DAYS");
  });

  it("정확히 8일 후는 LATER", () => {
    expect(classifyRemindStatus("2026-09-05", TODAY)).toBe("LATER");
  });

  it("월 경계를 넘어도 정확 (Asia/Seoul 날짜 문자열 기준)", () => {
    // 2026-08-28 기준 3일 후 = 2026-08-31
    expect(classifyRemindStatus("2026-08-31", TODAY)).toBe("WITHIN_7_DAYS");
  });
});

describe("remindDayDelta", () => {
  it("미래는 양수, 과거는 음수, 오늘은 0, 없으면 null", () => {
    expect(remindDayDelta("2026-08-30", TODAY)).toBe(2);
    expect(remindDayDelta("2026-08-25", TODAY)).toBe(-3);
    expect(remindDayDelta(TODAY, TODAY)).toBe(0);
    expect(remindDayDelta(null, TODAY)).toBeNull();
  });
});

describe("matchesRemindFilter", () => {
  it("null(기본) = TODAY", () => {
    expect(matchesRemindFilter("TODAY", null)).toBe(true);
    expect(matchesRemindFilter("OVERDUE", null)).toBe(false);
    expect(matchesRemindFilter("WITHIN_7_DAYS", null)).toBe(false);
  });

  it("단일 상태 필터", () => {
    expect(matchesRemindFilter("OVERDUE", "OVERDUE")).toBe(true);
    expect(matchesRemindFilter("WITHIN_7_DAYS", "OVERDUE")).toBe(false);
    expect(matchesRemindFilter("WITHIN_7_DAYS", "WITHIN_7_DAYS")).toBe(true);
  });
});

describe("formatDayDelta", () => {
  it("표시 형식", () => {
    expect(formatDayDelta(null)).toBe("-");
    expect(formatDayDelta(0)).toBe("오늘");
    expect(formatDayDelta(3)).toBe("3일 남음");
    expect(formatDayDelta(-5)).toBe("5일 지남");
  });
});
