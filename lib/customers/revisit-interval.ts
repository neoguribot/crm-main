import { daysBetweenIsoDates } from "@/lib/customers/recent-visit";

/**
 * 거래일 목록으로부터 평균 재방문 주기(일)를 계산한다.
 * 중복 날짜는 하나로 합치고(같은 날 여러 건은 방문 1회), 오름차순 정렬 후
 * 연속된 날짜 간 일수의 평균을 낸다. 서로 다른 거래일이 2개 미만이면 null.
 */
export function averageRevisitIntervalDays(
  tradeDates: readonly string[],
): number | null {
  const distinctSorted = Array.from(new Set(tradeDates)).sort();
  if (distinctSorted.length < 2) return null;

  let totalDays = 0;
  for (let i = 1; i < distinctSorted.length; i++) {
    totalDays += daysBetweenIsoDates(distinctSorted[i - 1], distinctSorted[i]);
  }
  return Math.round((totalDays / (distinctSorted.length - 1)) * 10) / 10;
}
