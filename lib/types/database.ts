/**
 * 데이터베이스 스키마에 대응하는 TypeScript 타입.
 *
 * 실제 Supabase 프로젝트가 연결되면 `supabase gen types typescript` 로 자동 생성한
 * 타입으로 대체하거나 병행할 수 있다. 지금은 마이그레이션 SQL 과 손으로 맞춘 정의다.
 *
 * numeric 컬럼(amount, weight, purity)은 `string` 으로 다룬다.
 * 이유와 처리 원칙은 supabase/README.md 의 "numeric 값 처리" 항목 참고.
 */

// ─────────────────────────────────────────────────────────────
// 선택값 (DB enum 과 동일한 코드 문자열). 한국어 표시명은 lib/labels.ts 에서 분리 관리.
// ─────────────────────────────────────────────────────────────

/** 유입 경로 (다중 선택). 0008 에서 enum → text[]. */
export const INFLOW_CHANNELS = [
  "CARROT_MARKET",
  "NAVER_PLACE",
  "KAKAO_MAP",
  "KAKAO_CHANNEL",
  "GOOGLE",
  "TMAP",
  "REFERRAL",
  "WALK_IN",
  "OTHER",
] as const;
export type InflowChannel = (typeof INFLOW_CHANNELS)[number];

/** 방문 목적 (다중 선택). 0008 에서 enum → text[]. */
export const PURCHASE_PURPOSES = [
  "PURCHASE",
  "GOLD_BAR",
  "STONE_PRODUCT",
  "CUSTOM_JEWELRY",
  "OTHER",
] as const;
export type PurchasePurpose = (typeof PURCHASE_PURPOSES)[number];

export const TRADE_TYPES = ["SALE", "PURCHASE"] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

/**
 * 거래 품목. 0007 에서 enum → text 로 바뀌어 앱에서 검증한다.
 * PURCHASE_ONLY_ITEM_TYPES 는 매입(PURCHASE) 거래에서만 선택할 수 있다.
 */
export const ITEM_TYPES = [
  "GOLD_BAR",
  "SILVER_BAR",
  "GOLD_24K",
  "GOLD_24K_STONE",
  "GOLD_24K_JEWELRY",
  "GOLD_18K",
  "GOLD_14K",
  "SILVER_JEWELRY",
  "SILVER_SPOON",
  "SCRAP_GOLD",
  "OTHER",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** 매입 거래에서만 쓰는 품목. */
export const PURCHASE_ONLY_ITEM_TYPES = ["SILVER_SPOON", "SCRAP_GOLD"] as const;
export type PurchaseOnlyItemType = (typeof PURCHASE_ONLY_ITEM_TYPES)[number];

export function isPurchaseOnlyItemType(value: string): value is PurchaseOnlyItemType {
  return (PURCHASE_ONLY_ITEM_TYPES as readonly string[]).includes(value);
}

/** 해당 거래구분에서 이 품목을 쓸 수 있는지. */
export function isItemTypeAllowedForTradeType(
  itemType: string,
  tradeType: TradeType,
): boolean {
  if (tradeType === "PURCHASE") return true;
  return !isPurchaseOnlyItemType(itemType);
}

/** 성별. DB에는 정수 코드로 저장(0=모름, 1=남성, 2=여성). */
export const GENDERS = ["UNKNOWN", "MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

/** 빈도 라벨(재방문 빈도). 수동 입력, DB 저장(자동 추천은 참고 배지). */
export const FREQUENCY_LABELS = ["신규", "단골"] as const;
export type FrequencyLabel = (typeof FREQUENCY_LABELS)[number];

/** 매출 라벨(거래 금액). 수동 입력, DB 저장(자동 추천은 참고 배지). */
export const REVENUE_LABELS = ["일반", "우수", "VIP"] as const;
export type RevenueLabel = (typeof REVENUE_LABELS)[number];

/** 거래 완료 여부. DB에는 정수 코드로 저장(1=완료, 2=진행중). */
export const TRADE_STATUSES = ["DONE", "IN_PROGRESS"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

/** 고객 일정(다음 일정) 종류. DB에는 정수 코드로 저장(1~7). */
export const EVENT_TYPES = [
  "INQUIRY",
  "RESERVATION",
  "CUSTOM_ORDER",
  "REVISIT",
  "PRICE_ALERT",
  "BIRTHDAY",
  "CHECK_IN",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ─────────────────────────────────────────────────────────────
// 행(Row) 타입 — SELECT 결과
// ─────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` 형식의 날짜 문자열 */
export type IsoDateString = string;
/** ISO 8601 타임스탬프 문자열 */
export type IsoTimestampString = string;
/** PostgreSQL numeric 값. 정밀도 보존을 위해 문자열로 다룬다. */
export type NumericString = string;

export interface Customer {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  email: string | null;
  birth_date: IsoDateString | null;
  gender: Gender;
  address: string | null;
  inflow_channels: InflowChannel[];
  inflow_channel_detail: string | null;
  purchase_purposes: PurchasePurpose[];
  purchase_purpose_detail: string | null;
  frequency_label: FrequencyLabel;
  revenue_label: RevenueLabel;
  referred_by_customer_id: string | null;
  /** 고객 등록일 (기본값 오늘, 수정 가능) */
  registered_on: IsoDateString;
  /** 첫 거래일자 (선택) */
  first_trade_date: IsoDateString | null;
  last_contact_date: IsoDateString | null;
  memo: string | null;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

export interface TradeRecord {
  id: string;
  owner_id: string;
  customer_id: string;
  trade_type: TradeType;
  item_type: ItemType;
  /** 품목이 OTHER 일 때 세부 내용 */
  item_detail: string | null;
  /** 기준 단가(원). 0007 이전 행은 null. */
  unit_price: NumericString | null;
  weight: NumericString;
  /** 총 금액(원) */
  amount: NumericString;
  status: TradeStatus;
  trade_date: IsoDateString;
  memo: string | null;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

/** 고객 일정. 여러 건 동시 관리 가능, 거래와 선택적으로 연동(trade_id). */
export interface CustomerEvent {
  id: string;
  owner_id: string;
  customer_id: string;
  trade_id: string | null;
  event_type: EventType;
  event_date: IsoDateString;
  memo: string | null;
  is_done: boolean;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

/** 사용자(직원) 프로필. 인증 자체는 Supabase Auth(auth.users)가 담당한다. */
export interface AppUser {
  id: string;
  name: string | null;
  registered_on: IsoDateString;
  monthly_sales_goal: NumericString | null;
  /** 메시지 서명용 매장 이름 (0029) */
  store_name: string | null;
  /** SMS 폴백 발신번호 (0029) */
  sender_phone: string | null;
  /** 솔라피 카카오 알림톡 발신 프로필 키 (0029) */
  kakao_pf_id: string | null;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

// ─────────────────────────────────────────────────────────────
// 마케팅 메시지 (0027~0029)
// ─────────────────────────────────────────────────────────────

/** 메시지 채널. DB 에는 문자열 그대로 저장. */
export const MESSAGE_CHANNELS = ["ALIMTALK", "SMS", "MANUAL"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

/** 메시지 발송 상태. */
export const MESSAGE_STATUSES = ["PENDING", "SENT", "FAILED", "MANUAL"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface MessageTemplate {
  id: string;
  owner_id: string;
  name: string;
  channel: MessageChannel;
  body: string;
  kakao_template_id: string | null;
  /** 연결된 일정 종류 코드(1~7) 또는 null. */
  event_type: number | null;
  is_active: boolean;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

export interface MessageLog {
  id: string;
  owner_id: string;
  customer_id: string | null;
  template_id: string | null;
  channel: MessageChannel;
  to_phone: string;
  rendered_body: string;
  status: MessageStatus;
  provider: string | null;
  provider_message_id: string | null;
  error: string | null;
  sent_at: IsoTimestampString | null;
  created_at: IsoTimestampString;
}

export interface MessageTemplateCreateInput {
  name: string;
  channel: MessageChannel;
  body: string;
  kakao_template_id?: string | null;
  event_type?: number | null;
  is_active?: boolean;
}

export type MessageTemplateUpdateInput = Partial<MessageTemplateCreateInput>;

/** 고객별 매수 희망 가격 (금 1돈 기준, 원). 고객당 최대 1건. */
export interface PriceTarget {
  id: string;
  owner_id: string;
  customer_id: string;
  target_price_per_don: NumericString;
  note: string | null;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

export const GOLD_PRICE_SOURCES = ["MANUAL", "API"] as const;
export type GoldPriceSource = (typeof GOLD_PRICE_SOURCES)[number];

/** 순금(24K) 시세 이력, 1돈(3.75g) 기준. 등록할 때마다 새 행이 쌓인다. */
export interface GoldPrice {
  id: string;
  owner_id: string;
  registered_at: IsoTimestampString;
  price_per_don: NumericString;
  source: GoldPriceSource;
  created_at: IsoTimestampString;
  updated_at: IsoTimestampString;
}

export const NOTIFICATION_TYPES = ["PRICE_TARGET_REACHED"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** 직원(owner)별 알림. */
export interface NotificationRow {
  id: string;
  owner_id: string;
  type: string;
  customer_id: string | null;
  title: string;
  body: string | null;
  dedupe_key: string | null;
  read_at: IsoTimestampString | null;
  dismissed_at: IsoTimestampString | null;
  created_at: IsoTimestampString;
}

// ─────────────────────────────────────────────────────────────
// 입력 타입 — owner_id 는 클라이언트가 보내지 않는다.
// DB 기본값 auth.uid() 로 채워지고 RLS 로 검증된다.
// ─────────────────────────────────────────────────────────────

export interface CustomerCreateInput {
  name: string;
  phone: string;
  email?: string | null;
  birth_date?: IsoDateString | null;
  gender?: Gender;
  address?: string | null;
  inflow_channels: InflowChannel[];
  inflow_channel_detail?: string | null;
  purchase_purposes: PurchasePurpose[];
  purchase_purpose_detail?: string | null;
  frequency_label?: FrequencyLabel;
  revenue_label?: RevenueLabel;
  referred_by_customer_id?: string | null;
  registered_on: IsoDateString;
  first_trade_date?: IsoDateString | null;
  last_contact_date?: IsoDateString | null;
  memo?: string | null;
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>;

export interface TradeRecordCreateInput {
  customer_id: string;
  trade_type: TradeType;
  item_type: ItemType;
  item_detail?: string | null;
  unit_price: NumericString;
  weight: NumericString;
  amount: NumericString;
  status: TradeStatus;
  trade_date: IsoDateString;
  memo?: string | null;
}

/** 거래의 소속 고객은 수정하지 않는다. */
export type TradeRecordUpdateInput = Partial<
  Omit<TradeRecordCreateInput, "customer_id">
>;

export interface CustomerEventCreateInput {
  customer_id: string;
  trade_id?: string | null;
  event_type: EventType;
  event_date: IsoDateString;
  memo?: string | null;
  is_done?: boolean;
}

export type CustomerEventUpdateInput = Partial<
  Omit<CustomerEventCreateInput, "customer_id">
>;
