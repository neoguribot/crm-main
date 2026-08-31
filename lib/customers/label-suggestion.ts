import type { FrequencyLabel, RevenueLabel } from "@/lib/types/database";

const REVENUE_VIP_THRESHOLD = 50_000_000;
const REVENUE_PREMIUM_THRESHOLD = 10_000_000;
const FREQUENCY_REGULAR_THRESHOLD = 2;

/**
 * 최근 3개월(캘린더 월 기준) 판매+매입 합산 거래액 기준 매출 라벨 자동 추천.
 * 참고용 배지로만 표시하며 DB에는 저장하지 않는다(라벨은 사장님이 수동으로 선택).
 */
export function suggestRevenueLabel(last3MonthsAmount: number): RevenueLabel {
  if (last3MonthsAmount >= REVENUE_VIP_THRESHOLD) return "VIP";
  if (last3MonthsAmount >= REVENUE_PREMIUM_THRESHOLD) return "우수";
  return "일반";
}

/**
 * 누적 거래 횟수(전체 기간, 판매+매입 합산) 기준 빈도 라벨 자동 추천.
 * 참고용 배지로만 표시하며 DB에는 저장하지 않는다(라벨은 사장님이 수동으로 선택).
 */
export function suggestFrequencyLabel(tradeCount: number): FrequencyLabel {
  return tradeCount >= FREQUENCY_REGULAR_THRESHOLD ? "단골" : "신규";
}

/**
 * "이번 달을 포함해 최근 monthsBack+1개월"의 시작일(YYYY-MM-01)을 캘린더 월
 * 경계로 계산한다. 예: todayIso가 2026-08-31이고 monthsBack=2 면 "최근 3개월"
 * (6월·7월·8월)의 시작일인 2026-06-01을 반환한다.
 */
export function calendarMonthsWindowStart(
  monthsBack: number,
  todayIso: string,
): string {
  const [y, m] = todayIso.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) - monthsBack;
  const resultYear = Math.floor(totalMonths / 12);
  const resultMonth = (totalMonths % 12) + 1;
  return `${String(resultYear).padStart(4, "0")}-${String(resultMonth).padStart(2, "0")}-01`;
}
