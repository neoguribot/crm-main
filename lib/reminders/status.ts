import { daysBetweenIsoDates } from "@/lib/customers/recent-visit";

/** 일정 1건의 리마인드 상태 (customer_events.event_date 로 계산, DB 에 저장하지 않음). */
export const REMIND_STATUSES = ["OVERDUE", "TODAY", "WITHIN_7_DAYS", "LATER"] as const;
export type RemindStatus = (typeof REMIND_STATUSES)[number];

/** URL `status` 파라미터로 허용되는 필터 값. */
export const REMIND_FILTERS = ["TODAY", "OVERDUE", "WITHIN_7_DAYS"] as const;
export type RemindFilter = (typeof REMIND_FILTERS)[number];

/** 상태값 ↔ 한국어 표시명 분리. */
export const REMIND_STATUS_LABELS: Record<RemindStatus, string> = {
  OVERDUE: "기한 지남",
  TODAY: "오늘",
  WITHIN_7_DAYS: "7일 이내",
  LATER: "7일 이후",
};

export const REMIND_FILTER_LABELS: Record<RemindFilter, string> = {
  TODAY: "오늘",
  OVERDUE: "기한 지남",
  WITHIN_7_DAYS: "7일 이내",
};

/**
 * `today` 로부터 이벤트일까지 남은 일수. 양수 = 미래, 0 = 오늘, 음수 = 지남.
 * 이벤트일이 없으면 null.
 */
export function remindDayDelta(
  nextEventDate: string | null,
  today: string,
): number | null {
  if (!nextEventDate) return null;
  return daysBetweenIsoDates(today, nextEventDate);
}

/**
 * 일정의 event_date 로 리마인드 상태를 계산한다.
 * - 오늘 이전 → OVERDUE
 * - 오늘 → TODAY
 * - 1일 ~ 7일 → WITHIN_7_DAYS
 * - 8일 이후 → LATER
 */
export function classifyRemindStatus(
  nextEventDate: string | null,
  today: string,
): RemindStatus {
  const delta = remindDayDelta(nextEventDate, today);
  if (delta === null || delta < 0) return "OVERDUE";
  if (delta === 0) return "TODAY";
  if (delta <= 7) return "WITHIN_7_DAYS";
  return "LATER";
}

/** 상태가 주어진 필터에 해당하는지. filter 가 null 이면 기본값(오늘) 규칙. */
export function matchesRemindFilter(
  status: RemindStatus,
  filter: RemindFilter | null,
): boolean {
  return status === (filter ?? "TODAY");
}

/** 남은/지난 일수를 한국어로. */
export function formatDayDelta(delta: number | null): string {
  if (delta === null) return "-";
  if (delta === 0) return "오늘";
  if (delta > 0) return `${delta}일 남음`;
  return `${-delta}일 지남`;
}
