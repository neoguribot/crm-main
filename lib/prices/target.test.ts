import { describe, expect, it } from "vitest";

import {
  detectNewlyReached,
  formatGapPercent,
  formatPricePerDon,
  isTargetReached,
  parsePriceInt,
  targetGapPercent,
} from "@/lib/prices/target";

describe("parsePriceInt", () => {
  it("정수 문자열만 수용", () => {
    expect(parsePriceInt("581250")).toBe(581250);
    expect(parsePriceInt("0")).toBeNull();
    expect(parsePriceInt("-5")).toBeNull();
    expect(parsePriceInt("58.5")).toBeNull();
    expect(parsePriceInt("abc")).toBeNull();
    expect(parsePriceInt(null)).toBeNull();
    expect(parsePriceInt(155000)).toBe(155000);
  });
});

describe("formatPricePerDon", () => {
  it("천 단위 구분 + 단위", () => {
    expect(formatPricePerDon("581250")).toBe("581,250원/돈");
    expect(formatPricePerDon(null)).toBe("-");
  });
});

describe("targetGapPercent / formatGapPercent", () => {
  it("목표가가 현재가보다 낮으면 음수", () => {
    // (155000 - 157000) / 157000 * 100 = -1.27
    expect(targetGapPercent("155000", "157000")).toBe(-1.27);
    expect(formatGapPercent(-1.27)).toBe("-1.27%");
  });
  it("목표가가 현재가 이상이면 0 또는 양수", () => {
    expect(targetGapPercent("160000", "157000")).toBe(1.91);
    expect(formatGapPercent(1.91)).toBe("+1.91%");
    expect(targetGapPercent("157000", "157000")).toBe(0);
  });
  it("값이 없으면 null / '-'", () => {
    expect(targetGapPercent(null, "157000")).toBeNull();
    expect(formatGapPercent(null)).toBe("-");
  });
});

describe("isTargetReached", () => {
  it("현재가 <= 목표가 이면 도달", () => {
    expect(isTargetReached("155000", "155000")).toBe(true);
    expect(isTargetReached("155000", "154000")).toBe(true);
    expect(isTargetReached("155000", "156000")).toBe(false);
  });
});

describe("detectNewlyReached", () => {
  const targets = [
    { id: "a", target_price_per_don: "580000" },
    { id: "b", target_price_per_don: "560000" },
    { id: "c", target_price_per_don: "600000" },
  ];

  it("직전엔 목표 위였다가 이번에 이하로 내려온 것만", () => {
    // 이전 590000: a·b 는 미도달, c 는 이미 도달
    // 새로 575000: a 새로 도달, b 아직 미도달, c 는 이미(중복) → 제외
    const hit = detectNewlyReached(targets, "575000", "590000");
    expect(hit.map((t) => t.id)).toEqual(["a"]);
  });

  it("직전 가격이 없으면 도달한 것 모두", () => {
    const hit = detectNewlyReached(targets, "575000", null);
    expect(hit.map((t) => t.id).sort()).toEqual(["a", "c"]);
  });

  it("아무것도 도달 안 하면 빈 배열", () => {
    expect(detectNewlyReached(targets, "650000", "660000")).toEqual([]);
  });
});
