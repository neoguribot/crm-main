import { describe, expect, it } from "vitest";

import {
  SEGMENT_KEYS,
  SEGMENT_META,
  normalizeSegments,
} from "./segment-defs";

describe("normalizeSegments", () => {
  it("빈/누락 입력이면 6개 세그먼트 전부 count 0", () => {
    for (const data of [null, undefined, {}, "nope", 42]) {
      const segs = normalizeSegments(data);
      expect(segs).toHaveLength(SEGMENT_KEYS.length);
      expect(segs.every((s) => s.count === 0 && s.customers.length === 0)).toBe(
        true,
      );
    }
  });

  it("RPC 응답을 세그먼트 배열로 정규화한다", () => {
    const segs = normalizeSegments({
      dormant: {
        count: 2,
        customers: [
          { id: "a", name: "김", phone: "010-1", metric: 120 },
          { id: "b", name: "이", phone: "010-2", metric: 95 },
        ],
      },
      birthday: {
        count: 1,
        customers: [{ id: "c", name: "박", phone: "010-3", metric: 0 }],
      },
    });

    const dormant = segs.find((s) => s.key === "dormant")!;
    expect(dormant.count).toBe(2);
    expect(dormant.customers[0]).toEqual({
      id: "a",
      name: "김",
      phone: "010-1",
      metric: 120,
    });
    expect(dormant.title).toBe(SEGMENT_META.dormant.title);

    const referral = segs.find((s) => s.key === "referral")!;
    expect(referral.count).toBe(0);
  });

  it("count 누락 시 customers 길이로 채운다", () => {
    const segs = normalizeSegments({
      vip_care: { customers: [{ id: "x", name: "n", phone: "p", metric: 70 }] },
    });
    expect(segs.find((s) => s.key === "vip_care")!.count).toBe(1);
  });

  it("잘못된 metric 은 null 로", () => {
    const segs = normalizeSegments({
      dormant: {
        count: 1,
        customers: [{ id: "a", name: "김", phone: "010", metric: "bad" }],
      },
    });
    expect(segs.find((s) => s.key === "dormant")!.customers[0].metric).toBeNull();
  });

  it("metric 포맷터", () => {
    expect(SEGMENT_META.dormant.formatMetric(120)).toBe("120일째 미방문");
    expect(SEGMENT_META.birthday.formatMetric(0)).toBe("오늘");
    expect(SEGMENT_META.birthday.formatMetric(5)).toBe("D-5");
    expect(SEGMENT_META.target_reached.formatMetric(588000)).toBe(
      "희망가 588,000원/돈",
    );
    expect(SEGMENT_META.referral.formatMetric(null)).toBe("-");
  });
});
