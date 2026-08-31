/** 대시보드 기간별 고객수 — 단위와 표시 로직 (순수, DB 접근 없음). */

export const PERIOD_GRANULARITIES = ["day", "week", "month", "year"] as const;
export type PeriodGranularity = (typeof PERIOD_GRANULARITIES)[number];

/** 코드값 ↔ 한국어 표시명 분리. */
export const PERIOD_LABELS: Record<PeriodGranularity, string> = {
  day: "일간",
  week: "주간",
  month: "월간",
  year: "연간",
};

/** URL `period` 파라미터를 검증된 단위로. 허용되지 않은 값은 기본(day). */
export function parsePeriodGranularity(value: unknown): PeriodGranularity {
  return (PERIOD_GRANULARITIES as readonly string[]).includes(value as string)
    ? (value as PeriodGranularity)
    : "day";
}

/** 단위를 `/home` 링크 href 로. 기본(day)은 파라미터 없이. */
export function periodHref(granularity: PeriodGranularity): string {
  return granularity === "day" ? "/home" : `/home?period=${granularity}`;
}

/** 집계 기준: 거래 건수 / 신규 등록 고객수. */
export const PERIOD_BASES = ["trade", "registration"] as const;
export type PeriodBasis = (typeof PERIOD_BASES)[number];

export const PERIOD_BASIS_LABELS: Record<PeriodBasis, string> = {
  trade: "거래",
  registration: "신규 등록",
};

export type PeriodPoint = {
  /** 버킷 시작일 `YYYY-MM-DD` */
  bucket: string;
  /** 그 버킷의 거래 건수(= 고객수, 거래 1건당 1명) */
  count: number;
};

/** RPC(customer_count_by_period) 응답을 안전하게 정규화한다. */
export function normalizePeriodRows(raw: unknown): PeriodPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const o = row as Record<string, unknown>;
    const bucket =
      typeof o.bucket === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.bucket)
        ? o.bucket
        : null;
    const n = typeof o.count === "number" ? o.count : Number(o.count);
    if (!bucket || !Number.isFinite(n)) return [];
    return [{ bucket, count: Math.max(0, Math.floor(n)) }];
  });
}

/** 버킷 시작일 + 단위 → 화면 라벨. */
export function formatPeriodBucket(
  bucket: string,
  granularity: PeriodGranularity,
): string {
  const [y, m, d] = bucket.split("-").map(Number);
  if (!y || !m || !d) return bucket;
  switch (granularity) {
    case "day":
      return `${m}. ${d}.`;
    case "week":
      return `${m}. ${d}. 주`;
    case "month":
      return `${y}. ${m}.`;
    case "year":
      return `${y}년`;
  }
}
