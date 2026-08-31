/**
 * 목표가격(매수 희망) 계산·표시 (순수, DB 접근 없음).
 * 가격은 모두 "금 1돈(3.75g) 기준, 원, 소수점 없음" 문자열/정수.
 */

export const GRAMS_PER_DON = 3.75;

/** `"581250"` 같은 음수 아닌 정수 문자열 → number. 아니면 null. */
export function parsePriceInt(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  const s = value.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 예: "581250" → "581,250원/돈" */
export function formatPricePerDon(
  value: string | number | null | undefined,
): string {
  const n = parsePriceInt(value);
  if (n == null) return "-";
  return `${n.toLocaleString("ko-KR")}원/돈`;
}

/**
 * 목표가가 현재가 대비 몇 %인지. (target - current) / current * 100.
 * 음수 = 목표가가 현재가보다 낮음(가격이 더 내려가야 매수). 소수 둘째 자리.
 */
export function targetGapPercent(
  targetPerDon: string | number | null | undefined,
  currentPerDon: string | number | null | undefined,
): number | null {
  const t = parsePriceInt(targetPerDon);
  const c = parsePriceInt(currentPerDon);
  if (t == null || c == null) return null;
  return Math.round(((t - c) / c) * 10000) / 100;
}

/** 예: 1.27 → "+1.27%", -1.27 → "-1.27%", null → "-" */
export function formatGapPercent(pct: number | null): string {
  if (pct == null) return "-";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/** 매수 희망 도달: 현재가가 목표가 이하로 내려왔는지. */
export function isTargetReached(
  targetPerDon: string | number | null | undefined,
  currentPerDon: string | number | null | undefined,
): boolean {
  const t = parsePriceInt(targetPerDon);
  const c = parsePriceInt(currentPerDon);
  return t != null && c != null && c <= t;
}

/**
 * 이번 시세 저장으로 "새로" 도달한 목표들 (하향 돌파).
 * - 새 가격이 목표 이하이고,
 * - 직전 가격이 없거나(첫 기록) 직전엔 목표 위였던 경우.
 * 이미 도달 상태가 유지되는 목표는 다시 알리지 않는다.
 */
export function detectNewlyReached<T extends { target_price_per_don: string }>(
  targets: readonly T[],
  newPrice: string,
  prevPrice: string | null,
): T[] {
  return targets.filter((t) => {
    if (!isTargetReached(t.target_price_per_don, newPrice)) return false;
    if (prevPrice == null) return true;
    return !isTargetReached(t.target_price_per_don, prevPrice);
  });
}
