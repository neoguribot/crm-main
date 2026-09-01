/**
 * DB 코드값 → 한국어 표시명 매핑.
 * DB 에는 항상 코드값(대문자 영문)을 저장하고, 화면 표시에만 이 매핑을 사용한다.
 */

import type {
  EventType,
  FrequencyLabel,
  Gender,
  InflowChannel,
  ItemType,
  MessageChannel,
  MessageStatus,
  PurchasePurpose,
  RevenueLabel,
  TradeStatus,
  TradeType,
} from "@/lib/types/database";

export const INFLOW_CHANNEL_LABELS: Record<InflowChannel, string> = {
  CARROT_MARKET: "당근 마켓",
  NAVER_PLACE: "네이버 플레이스",
  KAKAO_MAP: "카카오맵",
  KAKAO_CHANNEL: "카카오채널",
  GOOGLE: "구글",
  TMAP: "티맵",
  REFERRAL: "지인 추천",
  WALK_IN: "워크인",
  OTHER: "기타",
};

/** 방문 목적 (다중). */
export const PURCHASE_PURPOSE_LABELS: Record<PurchasePurpose, string> = {
  PURCHASE: "매입",
  GOLD_BAR: "골드바",
  STONE_PRODUCT: "돌제품",
  CUSTOM_JEWELRY: "주얼리 맞춤",
  OTHER: "기타",
};

/** 코드값 → 표시명 (알 수 없으면 코드 그대로). */
export function inflowChannelLabel(code: string): string {
  return INFLOW_CHANNEL_LABELS[code as InflowChannel] ?? code;
}
export function purchasePurposeLabel(code: string): string {
  return PURCHASE_PURPOSE_LABELS[code as PurchasePurpose] ?? code;
}

export const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  SALE: "판매",
  PURCHASE: "매입",
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  GOLD_BAR: "골드바",
  SILVER_BAR: "실버바",
  GOLD_24K: "24K",
  GOLD_24K_STONE: "24K(돌제품)",
  GOLD_24K_JEWELRY: "24K(주얼리)",
  GOLD_18K: "18K",
  GOLD_14K: "14K",
  SILVER_JEWELRY: "은제품(은주얼리)",
  SILVER_SPOON: "은제품(은수저)",
  SCRAP_GOLD: "치금",
  OTHER: "기타",
};

/** 코드값 → 표시명. 알 수 없는 값이면 코드값을 그대로 돌려준다(옛 데이터 방어). */
export function itemTypeLabel(code: string): string {
  return ITEM_TYPE_LABELS[code as ItemType] ?? code;
}

export const GENDER_LABELS: Record<Gender, string> = {
  UNKNOWN: "모름",
  MALE: "남성",
  FEMALE: "여성",
};

export const FREQUENCY_LABEL_LABELS: Record<FrequencyLabel, string> = {
  신규: "신규",
  단골: "단골",
};

export const REVENUE_LABEL_LABELS: Record<RevenueLabel, string> = {
  일반: "일반",
  우수: "우수",
  VIP: "VIP",
};

/**
 * 매출 라벨 배지 색상 — 일반=동, 우수=은, VIP=금 순으로 등급이 올라간다.
 * shadcn Badge 의 className 에 넣어 쓴다(테두리형 배지 위에 색을 덮음).
 */
export const REVENUE_LABEL_BADGE_CLASS: Record<RevenueLabel, string> = {
  일반: "border-transparent bg-amber-700/15 text-amber-800 dark:bg-amber-600/20 dark:text-amber-300",
  우수: "border-transparent bg-slate-400/25 text-slate-700 dark:bg-slate-300/15 dark:text-slate-200",
  VIP: "border-transparent bg-yellow-400/25 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-200",
};

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  DONE: "완료",
  IN_PROGRESS: "진행 중",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  INQUIRY: "문의",
  RESERVATION: "예약",
  CUSTOM_ORDER: "맞춤 주문",
  REVISIT: "재방문",
  PRICE_ALERT: "시세 알림",
  BIRTHDAY: "생일",
  CHECK_IN: "안부",
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  ALIMTALK: "카카오 알림톡",
  SMS: "문자(SMS)",
  MANUAL: "수동 발송",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  PENDING: "대기",
  SENT: "발송됨",
  FAILED: "실패",
  MANUAL: "수동 처리",
};

export const MESSAGE_STATUS_BADGE_CLASS: Record<MessageStatus, string> = {
  PENDING:
    "border-transparent bg-slate-400/20 text-slate-700 dark:bg-slate-300/15 dark:text-slate-200",
  SENT: "border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  FAILED:
    "border-transparent bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  MANUAL:
    "border-transparent bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
};
