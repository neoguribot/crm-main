/** 날짜/시간대 기준은 Asia/Seoul 고정. */

const KST_TIME_ZONE = "Asia/Seoul";

/** 오늘 날짜(Asia/Seoul)를 `YYYY-MM-DD` 문자열로 반환한다. */
export function todayInSeoul(): string {
  // en-CA 로케일은 YYYY-MM-DD 형식을 만든다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 오늘(Asia/Seoul)의 연·월 라벨. 예: "2026년 8월" */
export function currentMonthLabelInSeoul(): string {
  const [year, month] = todayInSeoul().split("-");
  return `${year}년 ${Number(month)}월`;
}

/**
 * DB 의 `YYYY-MM-DD` 날짜 문자열을 화면용 한국어 형식으로.
 * 예: "2026-08-20" → "2026. 8. 20." (시간대 변환 없음, 순수 문자열 파싱)
 * 값이 없으면 빈 문자열을 반환한다(호출 측에서 "없음" 등으로 대체).
 */
export function formatKoreanDate(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${y}. ${Number(m)}. ${Number(d)}.`;
}

/**
 * timestamptz(ISO 문자열)를 Asia/Seoul 기준 "M. D. HH:MM" 로.
 * 값이 없거나 파싱 불가면 빈 문자열.
 */
export function isoTimestampToSeoulDateTime(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return parts;
}

/** `YYYY-MM-DD` 가 실제 존재하는 날짜인지 확인한다. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}
