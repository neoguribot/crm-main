import { describe, expect, it } from "vitest";

import {
  formatPeriodBucket,
  normalizePeriodRows,
  parsePeriodGranularity,
  periodHref,
} from "@/lib/dashboard/period";

describe("parsePeriodGranularity", () => {
  it("허용값은 그대로", () => {
    expect(parsePeriodGranularity("week")).toBe("week");
    expect(parsePeriodGranularity("year")).toBe("year");
  });
  it("허용되지 않은 값은 day", () => {
    expect(parsePeriodGranularity("hour")).toBe("day");
    expect(parsePeriodGranularity(undefined)).toBe("day");
    expect(parsePeriodGranularity(["week"])).toBe("day");
  });
});

describe("periodHref", () => {
  it("day 는 파라미터 없이, 나머지는 쿼리로", () => {
    expect(periodHref("day")).toBe("/home");
    expect(periodHref("month")).toBe("/home?period=month");
  });
});

describe("normalizePeriodRows", () => {
  it("정상 행 매핑", () => {
    expect(
      normalizePeriodRows([
        { bucket: "2026-08-01", count: 3 },
        { bucket: "2026-08-02", count: "5" },
      ]),
    ).toEqual([
      { bucket: "2026-08-01", count: 3 },
      { bucket: "2026-08-02", count: 5 },
    ]);
  });
  it("잘못된 행은 제외, 음수·소수는 정리", () => {
    expect(
      normalizePeriodRows([
        { bucket: "nope", count: 1 },
        { bucket: "2026-08-01", count: -2 },
        { bucket: "2026-08-02", count: 2.9 },
        null,
        "x",
      ]),
    ).toEqual([
      { bucket: "2026-08-01", count: 0 },
      { bucket: "2026-08-02", count: 2 },
    ]);
  });
  it("배열이 아니면 빈 배열", () => {
    expect(normalizePeriodRows(null)).toEqual([]);
    expect(normalizePeriodRows({})).toEqual([]);
  });
});

describe("formatPeriodBucket", () => {
  it("단위별 표시", () => {
    expect(formatPeriodBucket("2026-08-03", "day")).toBe("8. 3.");
    expect(formatPeriodBucket("2026-08-03", "week")).toBe("8. 3. 주");
    expect(formatPeriodBucket("2026-08-03", "month")).toBe("2026. 8.");
    expect(formatPeriodBucket("2026-08-03", "year")).toBe("2026년");
  });
  it("형식이 깨지면 원본", () => {
    expect(formatPeriodBucket("bad", "day")).toBe("bad");
  });
});
