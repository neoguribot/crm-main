/**
 * PostgreSQL numeric 값(문자열)의 표시·검증 유틸.
 * 저장·전달은 항상 검증된 십진 문자열로 하고, Number 변환은 표시/경계 검사에만 제한적으로 쓴다.
 */

/** `123` 또는 `123.45` 형태의 음수 아닌 십진 문자열인지. NaN·Infinity·부호·지수표기 불허. */
export function isDecimalString(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

/** 소수 자리수 상한 확인. */
export function hasMaxDecimalPlaces(value: string, places: number): boolean {
  const dot = value.indexOf(".");
  if (dot === -1) return true;
  return value.length - dot - 1 <= places;
}

/** 값이 0인지 (`0`, `0.0`, `00.00` 등). isDecimalString 통과를 전제로 한다. */
export function isZeroDecimalString(value: string): boolean {
  return /^0+(\.0+)?$/.test(value.trim());
}

/** 표시용: 후행 0 과 불필요한 소수점을 제거한다. `3.750` → `3.75`, `5.000` → `5`. */
export function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

/** 원화 금액 표시: 천 단위 구분, 소수점 없음(DB 가 numeric(15,0)). 예: "350000" → "350,000원" */
export function formatWon(value: string): string {
  const [intPart] = value.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = sign ? intPart.slice(1) : intPart;
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

/** 음수 아닌 십진 문자열을 정수(scaled bigint)로. `hasMaxDecimalPlaces` 통과를 전제로 한다. */
function toScaledInt(value: string, decimalPlaces: number): bigint {
  const [intPart, fracPartRaw = ""] = value.trim().split(".");
  const fracPart = (fracPartRaw + "0".repeat(decimalPlaces)).slice(0, decimalPlaces);
  return BigInt((intPart || "0") + fracPart);
}

function fromScaledInt(scaled: bigint, decimalPlaces: number): string {
  const s = scaled.toString().padStart(decimalPlaces + 1, "0");
  if (decimalPlaces === 0) return s;
  const intPart = s.slice(0, -decimalPlaces) || "0";
  const fracPart = s.slice(-decimalPlaces);
  return `${intPart}.${fracPart}`;
}

/**
 * 음수 아닌 십진 문자열 여러 개를 부동소수점 오차 없이 더한다.
 * (BigInt 로 소수점 자리만큼 스케일링 후 정수 덧셈 — weight `numeric(10,3)` 등에 사용)
 */
export function sumDecimalStrings(
  values: readonly string[],
  decimalPlaces: number,
): string {
  const total = values.reduce(
    (sum, v) => sum + toScaledInt(v, decimalPlaces),
    BigInt(0),
  );
  return fromScaledInt(total, decimalPlaces);
}
