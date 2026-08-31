/**
 * 앱 레벨 문자열 코드 ↔ DB 정수 코드 변환.
 *
 * DB는 문서 9번 기준 정수 코드로 저장한다(성별 0/1/2, 거래구분 1/2,
 * 거래품목 01~99, 완료여부 1/2). 앱 코드(zod 검증, 폼, 라벨)는 가독성을
 * 위해 계속 문자열 식별자를 쓰고, Supabase 조회/저장 시점에만 이 모듈을
 * 거쳐 정수로 변환한다.
 */
import type {
  EventType,
  Gender,
  ItemType,
  TradeStatus,
  TradeType,
} from "./database";

// ─────────────────────────────────────────────────────────────
// gender
// ─────────────────────────────────────────────────────────────
const GENDER_TO_CODE: Record<Gender, number> = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
};
const CODE_TO_GENDER: Record<number, Gender> = {
  0: "UNKNOWN",
  1: "MALE",
  2: "FEMALE",
};
export function genderToCode(value: Gender): number {
  return GENDER_TO_CODE[value];
}
export function codeToGender(code: number): Gender {
  return CODE_TO_GENDER[code] ?? "UNKNOWN";
}

// ─────────────────────────────────────────────────────────────
// trade_type
// ─────────────────────────────────────────────────────────────
const TRADE_TYPE_TO_CODE: Record<TradeType, number> = {
  SALE: 1,
  PURCHASE: 2,
};
const CODE_TO_TRADE_TYPE: Record<number, TradeType> = {
  1: "SALE",
  2: "PURCHASE",
};
export function tradeTypeToCode(value: TradeType): number {
  return TRADE_TYPE_TO_CODE[value];
}
export function codeToTradeType(code: number): TradeType {
  const value = CODE_TO_TRADE_TYPE[code];
  if (!value) throw new Error(`알 수 없는 거래구분 코드: ${code}`);
  return value;
}

// ─────────────────────────────────────────────────────────────
// item_type
// ─────────────────────────────────────────────────────────────
const ITEM_TYPE_TO_CODE: Record<ItemType, number> = {
  GOLD_BAR: 1,
  SILVER_BAR: 2,
  GOLD_24K: 3,
  GOLD_24K_STONE: 4,
  GOLD_24K_JEWELRY: 5,
  GOLD_18K: 6,
  GOLD_14K: 7,
  SILVER_JEWELRY: 8,
  SILVER_SPOON: 9,
  SCRAP_GOLD: 10,
  OTHER: 99,
};
const CODE_TO_ITEM_TYPE: Record<number, ItemType> = Object.fromEntries(
  Object.entries(ITEM_TYPE_TO_CODE).map(([k, v]) => [v, k as ItemType]),
);
export function itemTypeToCode(value: ItemType): number {
  return ITEM_TYPE_TO_CODE[value];
}
export function codeToItemType(code: number): ItemType {
  const value = CODE_TO_ITEM_TYPE[code];
  if (!value) throw new Error(`알 수 없는 거래품목 코드: ${code}`);
  return value;
}

// ─────────────────────────────────────────────────────────────
// trade status (완료 여부)
// ─────────────────────────────────────────────────────────────
const TRADE_STATUS_TO_CODE: Record<TradeStatus, number> = {
  DONE: 1,
  IN_PROGRESS: 2,
};
const CODE_TO_TRADE_STATUS: Record<number, TradeStatus> = {
  1: "DONE",
  2: "IN_PROGRESS",
};
export function tradeStatusToCode(value: TradeStatus): number {
  return TRADE_STATUS_TO_CODE[value];
}
export function codeToTradeStatus(code: number): TradeStatus {
  const value = CODE_TO_TRADE_STATUS[code];
  if (!value) throw new Error(`알 수 없는 완료여부 코드: ${code}`);
  return value;
}

// ─────────────────────────────────────────────────────────────
// event_type (고객 일정 종류)
// ─────────────────────────────────────────────────────────────
const EVENT_TYPE_TO_CODE: Record<EventType, number> = {
  INQUIRY: 1,
  RESERVATION: 2,
  CUSTOM_ORDER: 3,
  REVISIT: 4,
  PRICE_ALERT: 5,
  BIRTHDAY: 6,
  CHECK_IN: 7,
};
const CODE_TO_EVENT_TYPE: Record<number, EventType> = Object.fromEntries(
  Object.entries(EVENT_TYPE_TO_CODE).map(([k, v]) => [v, k as EventType]),
);
export function eventTypeToCode(value: EventType): number {
  return EVENT_TYPE_TO_CODE[value];
}
export function codeToEventType(code: number): EventType {
  const value = CODE_TO_EVENT_TYPE[code];
  if (!value) throw new Error(`알 수 없는 일정 종류 코드: ${code}`);
  return value;
}
