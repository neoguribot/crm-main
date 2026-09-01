/**
 * 프로모션 세그먼트 정의 + RPC 응답 정규화 (순수 모듈, DB 접근 없음).
 * DB 집계는 `marketing_segments()` RPC, 조회는 `lib/marketing/segments.ts`.
 */

import { formatPricePerDon } from "@/lib/prices/target";

export const SEGMENT_KEYS = [
  "dormant",
  "new_no_trade",
  "birthday",
  "target_reached",
  "vip_care",
  "referral",
] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export type SegmentCustomer = {
  id: string;
  name: string;
  phone: string;
  metric: number | null;
};

export type Segment = {
  key: SegmentKey;
  title: string;
  description: string;
  /** 이 세그먼트에 어울리는 메시지 초안(템플릿 작성 참고용). */
  suggestion: string;
  count: number;
  customers: SegmentCustomer[];
  /** 고객 행의 metric 을 사람이 읽는 문구로. */
  formatMetric: (m: number | null) => string;
};

type SegmentMeta = Pick<
  Segment,
  "title" | "description" | "suggestion" | "formatMetric"
>;

export const SEGMENT_META: Record<SegmentKey, SegmentMeta> = {
  dormant: {
    title: "휴면 고객",
    description: "거래 이력이 있는데 평소 주기보다 오래 안 오신 분들",
    suggestion:
      "{이름}님, 오랜만이에요. 요즘 금 시세가 {현재시세}인데 한 번 들러보시겠어요? - {매장명}",
    formatMetric: (m) => (m == null ? "-" : `${m}일째 미방문`),
  },
  new_no_trade: {
    title: "신규 · 첫 거래 전",
    description: "최근 30일 안에 등록했지만 아직 거래가 없는 분들",
    suggestion:
      "{이름}님, 방문해 주셔서 감사합니다. 궁금하신 점 있으면 편하게 연락 주세요. - {매장명}",
    formatMetric: (m) => (m == null ? "-" : `등록 ${m}일차`),
  },
  birthday: {
    title: "생일 임박",
    description: "생일이 2주 이내인 분들",
    suggestion:
      "{이름}님, 곧 생일이네요! 미리 축하드립니다. 매장 방문 시 작은 선물 준비해 두겠습니다. - {매장명}",
    formatMetric: (m) => (m == null ? "-" : m === 0 ? "오늘" : `D-${m}`),
  },
  target_reached: {
    title: "매수 희망가 도달",
    description: "설정한 매수 희망가가 현재 시세 이상인 분들",
    suggestion:
      "{이름}님, 말씀하신 희망가 {목표가}에 시세가 도달했습니다. 현재 {현재시세}입니다. - {매장명}",
    formatMetric: (m) => (m == null ? "-" : `희망가 ${formatPricePerDon(m)}`),
  },
  vip_care: {
    title: "우수 · VIP 케어",
    description: "우수/VIP 등급인데 2개월 넘게 방문이 없는 분들",
    suggestion:
      "{이름}님, 늘 감사드립니다. 오랜만에 시세 상담 한 번 잡아드릴까요? - {매장명}",
    formatMetric: (m) => (m == null ? "-" : `${m}일째 미방문`),
  },
  referral: {
    title: "추천 유도",
    description: "단골인데 아직 지인을 추천해 주신 적이 없는 분들",
    suggestion:
      "{이름}님, 소개해 주실 지인이 있으면 두 분 모두 혜택을 드립니다. - {매장명}",
    formatMetric: (m) => (m == null ? "-" : `누적 거래 ${m}건`),
  },
};

/** marketing_segments() RPC 응답(jsonb)을 화면용 Segment 배열로. */
export function normalizeSegments(data: unknown): Segment[] {
  const obj = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;

  return SEGMENT_KEYS.map((key) => {
    const raw = (obj[key] ?? {}) as { count?: unknown; customers?: unknown };
    const rawCustomers = Array.isArray(raw.customers) ? raw.customers : [];

    return {
      key,
      ...SEGMENT_META[key],
      count: typeof raw.count === "number" ? raw.count : rawCustomers.length,
      customers: rawCustomers.map((c) => {
        const row = (c ?? {}) as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          name: String(row.name ?? ""),
          phone: String(row.phone ?? ""),
          metric: typeof row.metric === "number" ? row.metric : null,
        };
      }),
    } satisfies Segment;
  });
}
