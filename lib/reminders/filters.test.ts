import { describe, expect, it } from "vitest";

import { parseRemindFilter, remindFilterHref } from "@/lib/reminders/filters";

describe("parseRemindFilter", () => {
  it("허용된 status 값을 그대로 반환", () => {
    expect(parseRemindFilter({ status: "OVERDUE" })).toBe("OVERDUE");
    expect(parseRemindFilter({ status: "TODAY" })).toBe("TODAY");
    expect(parseRemindFilter({ status: "WITHIN_7_DAYS" })).toBe("WITHIN_7_DAYS");
  });

  it("없거나 허용되지 않은 값은 null(기본 목록)", () => {
    expect(parseRemindFilter({})).toBeNull();
    expect(parseRemindFilter({ status: "" })).toBeNull();
    expect(parseRemindFilter({ status: "BEYOND_30" })).toBeNull();
    expect(parseRemindFilter({ status: "hack; drop table" })).toBeNull();
    expect(parseRemindFilter({ status: "overdue" })).toBeNull(); // 대소문자 구분
  });

  it("배열이면 첫 값만", () => {
    expect(parseRemindFilter({ status: ["OVERDUE", "TODAY"] })).toBe("OVERDUE");
  });
});

describe("remindFilterHref", () => {
  it("null 은 파라미터 없이 (기본 경로 /home)", () => {
    expect(remindFilterHref(null)).toBe("/home");
  });

  it("필터값은 status 파라미터로", () => {
    expect(remindFilterHref("WITHIN_7_DAYS")).toBe("/home?status=WITHIN_7_DAYS");
  });

  it("basePath 를 지정할 수 있다", () => {
    expect(remindFilterHref("OVERDUE", "/somewhere")).toBe("/somewhere?status=OVERDUE");
  });
});
