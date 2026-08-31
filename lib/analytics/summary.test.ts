import { describe, expect, it } from "vitest";
import { normalizeCustomerAnalytics } from "./summary";

describe("normalizeCustomerAnalytics", () => {
  it("완전한 응답을 그대로 매핑한다", () => {
    const a = normalizeCustomerAnalytics({
      customer_count: 18,
      gender_counts: { UNKNOWN: 2, MALE: 8, FEMALE: 8 },
      frequency_counts: { 신규: 12, 단골: 6 },
      revenue_counts: { 일반: 10, 우수: 5, VIP: 3 },
      channel_counts: { CARROT_MARKET: 3, WALK_IN: 5 },
      age_bucket_counts: { "20s": 4, "30s": 6, UNKNOWN: 2 },
      top_customers: [
        { id: "c1", name: "홍길동", total_amount: "5000000", trade_count: 3 },
      ],
      purpose_avg_frequency: { GOLD_BAR: 2.5, OTHER: 0 },
      overall_avg_frequency: 1.8,
      item_type_counts: { "1": 4, "99": 2 },
      top_customers_by_count: [
        { id: "c1", name: "홍길동", total_amount: "5000000", trade_count: 3 },
      ],
      top_referrers: [
        { id: "c1", name: "홍길동", referral_count: 4 },
        { id: "bad" },
      ],
    });
    expect(a.customerCount).toBe(18);
    expect(a.genderCounts.MALE).toBe(8);
    expect(a.frequencyCounts.신규).toBe(12);
    expect(a.frequencyCounts.단골).toBe(6);
    expect(a.revenueCounts.VIP).toBe(3);
    expect(a.revenueCounts.일반).toBe(10);
    expect(a.channelCounts.CARROT_MARKET).toBe(3);
    expect(a.channelCounts.NAVER_PLACE).toBe(0);
    expect(a.ageBucketCounts["20s"]).toBe(4);
    expect(a.ageBucketCounts["10s"]).toBe(0);
    expect(a.topCustomers).toHaveLength(1);
    expect(a.topCustomers[0].totalAmount).toBe("5000000");
    expect(a.purposeAvgFrequency.GOLD_BAR).toBe(2.5);
    expect(a.purposeAvgFrequency.OTHER).toBe(0);
    expect(a.overallAvgFrequency).toBe(1.8);
    expect(a.itemTypeCounts.GOLD_BAR).toBe(4);
    expect(a.itemTypeCounts.OTHER).toBe(2);
    expect(a.topCustomersByCount).toHaveLength(1);
    expect(a.topReferrers).toHaveLength(1);
    expect(a.topReferrers[0].referralCount).toBe(4);
  });

  it("빈/잘못된 응답은 0과 빈 배열로 안전하게 채운다", () => {
    const a = normalizeCustomerAnalytics({});
    expect(a.customerCount).toBe(0);
    expect(a.genderCounts.MALE).toBe(0);
    expect(a.frequencyCounts.단골).toBe(0);
    expect(a.revenueCounts.VIP).toBe(0);
    expect(a.topCustomers).toEqual([]);
    expect(a.topReferrers).toEqual([]);

    expect(normalizeCustomerAnalytics(null).customerCount).toBe(0);
    expect(normalizeCustomerAnalytics(undefined).customerCount).toBe(0);
  });

  it("불완전한 top_customers 항목은 제외한다", () => {
    const a = normalizeCustomerAnalytics({
      top_customers: [
        { id: "c1", name: "정상", total_amount: "1000", trade_count: 1 },
        { id: "bad" },
      ],
    });
    expect(a.topCustomers).toHaveLength(1);
  });
});
