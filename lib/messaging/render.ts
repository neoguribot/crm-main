/**
 * 메시지 템플릿 변수 치환 (순수 모듈, DB 접근 없음).
 *
 * 템플릿 본문은 `{이름}님, ...` 처럼 중괄호 토큰을 쓴다. 알 수 없는 토큰은
 * 그대로 두고(오타를 눈에 띄게), 값이 빈 문자열이면 토큰만 제거한다.
 */

import { formatKoreanDate, todayInSeoul } from "@/lib/date";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatPricePerDon } from "@/lib/prices/target";
import { codeToEventType } from "@/lib/types/codes";

export type MessageVars = Record<string, string>;

const TOKEN_RE = /\{([^{}]+)\}/g;

/** 본문에 쓰인 변수 토큰 목록(중복 제거). */
export function templateTokens(body: string): string[] {
  const out = new Set<string>();
  for (const match of body.matchAll(TOKEN_RE)) out.add(match[1].trim());
  return [...out];
}

/** `{키}` 를 vars 값으로 치환. 미정의 키는 원문 유지. */
export function renderTemplate(body: string, vars: MessageVars): string {
  return body.replace(TOKEN_RE, (whole, key: string) => {
    const k = key.trim();
    return k in vars ? vars[k] : whole;
  });
}

/** 템플릿 편집 화면에 노출하는 사용 가능 변수. */
export const TEMPLATE_VARIABLES = [
  "이름",
  "연락처",
  "매장명",
  "오늘",
  "현재시세",
  "목표가",
  "마지막연락일",
  "다음일정",
  "생일",
] as const;

export type CustomerVarsInput = {
  customer: {
    name: string;
    phone: string;
    last_contact_date: string | null;
    birth_date: string | null;
  };
  storeName: string | null;
  /** 최신 금 시세 (원/돈, 정수 문자열) */
  latestPricePerDon: string | null;
  /** 이 고객의 매수 희망가 (원/돈, 정수 문자열) */
  targetPricePerDon?: string | null;
  /** 다가오는 일정 1건 */
  nextEvent?: { event_date: string; event_type: number } | null;
};

/** 고객 1명에 대한 변수 맵을 만든다. */
export function buildCustomerVars(input: CustomerVarsInput): MessageVars {
  const { customer } = input;

  let nextEvent = "";
  if (input.nextEvent) {
    let typeLabel = "";
    try {
      typeLabel = EVENT_TYPE_LABELS[codeToEventType(input.nextEvent.event_type)];
    } catch {
      typeLabel = "";
    }
    nextEvent = [formatKoreanDate(input.nextEvent.event_date), typeLabel]
      .filter(Boolean)
      .join(" ");
  }

  return {
    이름: customer.name,
    연락처: customer.phone,
    매장명: input.storeName ?? "",
    오늘: formatKoreanDate(todayInSeoul()),
    현재시세: input.latestPricePerDon
      ? formatPricePerDon(input.latestPricePerDon)
      : "",
    목표가: input.targetPricePerDon
      ? formatPricePerDon(input.targetPricePerDon)
      : "",
    마지막연락일: customer.last_contact_date
      ? formatKoreanDate(customer.last_contact_date)
      : "",
    다음일정: nextEvent,
    생일: customer.birth_date ? formatKoreanDate(customer.birth_date) : "",
  };
}
