/** 달력 페이지용 순수 날짜 계산 (Asia/Seoul 날짜 문자열 기준, DB 접근 없음). */

export type YearMonth = { year: number; month: number };

/** URL `year`/`month` 파라미터를 검증된 연월로. 잘못되면 오늘(Asia/Seoul) 기준. */
export function parseYearMonth(
  yearParam: string | undefined,
  monthParam: string | undefined,
  todayIso: string,
): YearMonth {
  const [todayY, todayM] = todayIso.split("-").map(Number);
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1970 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  return { year: todayY, month: todayM };
}

export function monthLabel({ year, month }: YearMonth): string {
  return `${year}년 ${month}월`;
}

export function prevMonth({ year, month }: YearMonth): YearMonth {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth({ year, month }: YearMonth): YearMonth {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function toIso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** UTC 기준 요일(0=일 ~ 6=토) → 월요일 시작 인덱스(0=월 ~ 6=일). */
function mondayIndex(utcDate: Date): number {
  const dow = utcDate.getUTCDay();
  return (dow + 6) % 7;
}

/**
 * 해당 연월을 포함하는 주 단위 달력 그리드. 월요일 시작, 각 주는 7일.
 * 이전/다음 달 날짜로 앞뒤 빈 칸을 채워 항상 완전한 주로 구성한다.
 */
export function monthGridWeeks({ year, month }: YearMonth): string[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - mondayIndex(first));

  const weeks: string[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toIso(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    // 다음 달로 넘어간 뒤에도 그 달 1일을 포함하는 주까지만 그린다(보통 5~6주).
    if (w >= 3) {
      const nextCell = new Date(cursor);
      if (
        nextCell.getUTCFullYear() > year ||
        (nextCell.getUTCFullYear() === year && nextCell.getUTCMonth() + 1 > month)
      ) {
        break;
      }
    }
  }
  return weeks;
}

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function isInMonth(iso: string, { year, month }: YearMonth): boolean {
  const [y, m] = iso.split("-").map(Number);
  return y === year && m === month;
}
