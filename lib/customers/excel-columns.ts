/**
 * 고객 Excel 내보내기/불러오기 공통 컬럼 정의 (순수 모듈, DB 접근 없음).
 *
 * - `CUSTOMER_EXCEL_COLUMNS` 하나로 export(셀 생성)와 import(셀 파싱)를 함께 다룬다.
 * - `fromCell` 이 없는 컬럼은 내보내기 전용(파생값): 최근방문일·거래건수·누적거래액.
 * - DB 저장은 코드값이지만 Excel 은 사람이 읽는 라벨을 쓴다. 라벨↔코드 변환은
 *   `lib/labels.ts` 매핑을 뒤집어 처리하고, 코드값 자체도 그대로 허용한다(관대한 입력).
 */

import { todayInSeoul } from "@/lib/date";
import {
  GENDER_LABELS,
  INFLOW_CHANNEL_LABELS,
  PURCHASE_PURPOSE_LABELS,
} from "@/lib/labels";
import {
  FREQUENCY_LABELS,
  INFLOW_CHANNELS,
  PURCHASE_PURPOSES,
  REVENUE_LABELS,
  type Customer,
} from "@/lib/types/database";

// ─────────────────────────────────────────────────────────────
// 라벨 ↔ 코드 역매핑
// ─────────────────────────────────────────────────────────────

/**
 * `{ CODE: "라벨" }` 을 `{ "라벨": "CODE", "CODE": "CODE" }` 로 뒤집는다.
 * 라벨과 코드값 양쪽으로 조회할 수 있게 한다.
 */
export function invertLabelMap<K extends string>(
  map: Record<K, string>,
): Record<string, K> {
  const out: Record<string, K> = {};
  for (const code of Object.keys(map) as K[]) {
    out[map[code]] = code;
    out[code] = code;
  }
  return out;
}

const GENDER_BY_LABEL = invertLabelMap(GENDER_LABELS);
const INFLOW_BY_LABEL = invertLabelMap(INFLOW_CHANNEL_LABELS);
const PURPOSE_BY_LABEL = invertLabelMap(PURCHASE_PURPOSE_LABELS);

// ─────────────────────────────────────────────────────────────
// 셀 값 정규화
// ─────────────────────────────────────────────────────────────

/** exceljs 셀 값(문자열·숫자·날짜·리치텍스트·수식결과·null)을 평범한 문자열로. */
export function cellText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text.trim();
    if ("result" in obj) return cellText(obj.result);
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) => cellText((part as { text?: unknown }).text))
        .join("")
        .trim();
    }
  }
  return String(raw).trim();
}

/** 다중 선택 셀(", " / "·" / "/" 구분)을 라벨/코드 토큰 배열로. */
function splitTokens(value: string): string[] {
  return value
    .split(/[,·/\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** `YYYY-MM-DD` 또는 `YYYY. M. D.` 또는 Excel 날짜 문자열 → `YYYY-MM-DD` (실패 시 ""). */
function parseDateCell(raw: unknown): string {
  const s = cellText(raw);
  if (!s) return "";
  const iso = s.match(/(\d{4})[-.\s]+(\d{1,2})[-.\s]+(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

/** 전화번호 셀: 숫자로 저장돼 선행 0 이 사라진 경우를 보정한다. */
function parsePhoneCell(raw: unknown): string {
  let s = cellText(raw);
  if (typeof raw === "number") {
    const digits = String(raw);
    // 010 → 10 처럼 10자리로 줄어든 휴대폰 번호 복원
    s = digits.length === 10 && !digits.startsWith("0") ? `0${digits}` : digits;
  }
  return s;
}

// ─────────────────────────────────────────────────────────────
// 컬럼 정의
// ─────────────────────────────────────────────────────────────

/** 내보내기 한 행에 필요한 값 (파생값 포함). */
export type CustomerExportRow = {
  customer: Customer;
  referrerName: string | null;
  lastVisitDate: string;
  tradeCount: number;
  /** 누적 거래액 (십진 문자열) */
  totalAmount: string;
};

/** 불러오기 중간 표현 — `customerInputSchema` 입력 형태와 동일. */
export type CustomerImportDraft = {
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  gender: string;
  address: string;
  inflow_channels: string[];
  inflow_channel_detail: string;
  purchase_purposes: string[];
  purchase_purpose_detail: string;
  frequency_label: string;
  revenue_label: string;
  referred_by_customer_id: string;
  registered_on: string;
  first_trade_date: string;
  last_contact_date: string;
  memo: string;
};

export function emptyImportDraft(): CustomerImportDraft {
  return {
    name: "",
    phone: "",
    email: "",
    birth_date: "",
    gender: "UNKNOWN",
    address: "",
    inflow_channels: [],
    inflow_channel_detail: "",
    purchase_purposes: [],
    purchase_purpose_detail: "",
    frequency_label: "신규",
    revenue_label: "일반",
    referred_by_customer_id: "",
    registered_on: "",
    first_trade_date: "",
    last_contact_date: "",
    memo: "",
  };
}

type ExcelColumn = {
  header: string;
  width: number;
  toCell: (row: CustomerExportRow) => string | number | null;
  /** 없으면 내보내기 전용 컬럼. `referrerName` 은 액션에서 별도 후처리한다. */
  fromCell?: (raw: unknown, draft: CustomerImportDraft) => void;
};

function mapTokens<T extends string>(
  value: string,
  lookup: Record<string, T>,
  allowed: readonly T[],
): T[] {
  const set = new Set(allowed as readonly string[]);
  const seen = new Set<T>();
  for (const token of splitTokens(value)) {
    const code = lookup[token];
    if (code && set.has(code)) seen.add(code);
  }
  return Array.from(seen);
}

export const CUSTOMER_EXCEL_COLUMNS: ExcelColumn[] = [
  {
    header: "이름",
    width: 12,
    toCell: (r) => r.customer.name,
    fromCell: (raw, d) => {
      d.name = cellText(raw);
    },
  },
  {
    header: "연락처",
    width: 16,
    toCell: (r) => r.customer.phone,
    fromCell: (raw, d) => {
      d.phone = parsePhoneCell(raw);
    },
  },
  {
    header: "이메일",
    width: 22,
    toCell: (r) => r.customer.email ?? "",
    fromCell: (raw, d) => {
      d.email = cellText(raw);
    },
  },
  {
    header: "생년월일",
    width: 12,
    toCell: (r) => r.customer.birth_date ?? "",
    fromCell: (raw, d) => {
      d.birth_date = parseDateCell(raw);
    },
  },
  {
    header: "성별",
    width: 8,
    toCell: (r) => GENDER_LABELS[r.customer.gender],
    fromCell: (raw, d) => {
      d.gender = GENDER_BY_LABEL[cellText(raw)] ?? "UNKNOWN";
    },
  },
  {
    header: "주소",
    width: 28,
    toCell: (r) => r.customer.address ?? "",
    fromCell: (raw, d) => {
      d.address = cellText(raw);
    },
  },
  {
    header: "유입경로",
    width: 20,
    toCell: (r) =>
      r.customer.inflow_channels
        .map((c) => INFLOW_CHANNEL_LABELS[c] ?? c)
        .join(", "),
    fromCell: (raw, d) => {
      d.inflow_channels = mapTokens(
        cellText(raw),
        INFLOW_BY_LABEL,
        INFLOW_CHANNELS,
      );
    },
  },
  {
    header: "방문목적",
    width: 20,
    toCell: (r) =>
      r.customer.purchase_purposes
        .map((p) => PURCHASE_PURPOSE_LABELS[p] ?? p)
        .join(", "),
    fromCell: (raw, d) => {
      d.purchase_purposes = mapTokens(
        cellText(raw),
        PURPOSE_BY_LABEL,
        PURCHASE_PURPOSES,
      );
    },
  },
  {
    header: "유입경로 기타",
    width: 18,
    toCell: (r) => r.customer.inflow_channel_detail ?? "",
    fromCell: (raw, d) => {
      d.inflow_channel_detail = cellText(raw);
    },
  },
  {
    header: "방문목적 기타",
    width: 18,
    toCell: (r) => r.customer.purchase_purpose_detail ?? "",
    fromCell: (raw, d) => {
      d.purchase_purpose_detail = cellText(raw);
    },
  },
  {
    header: "빈도라벨",
    width: 10,
    toCell: (r) => r.customer.frequency_label,
    fromCell: (raw, d) => {
      const v = cellText(raw);
      d.frequency_label = (FREQUENCY_LABELS as readonly string[]).includes(v)
        ? v
        : "신규";
    },
  },
  {
    header: "매출라벨",
    width: 10,
    toCell: (r) => r.customer.revenue_label,
    fromCell: (raw, d) => {
      const v = cellText(raw);
      d.revenue_label = (REVENUE_LABELS as readonly string[]).includes(v)
        ? v
        : "일반";
    },
  },
  {
    // import 은 액션에서 이름→id 해석 (모호하면 무시)
    header: "추천인",
    width: 12,
    toCell: (r) => r.referrerName ?? "",
    fromCell: () => {},
  },
  {
    header: "등록일",
    width: 12,
    toCell: (r) => r.customer.registered_on,
    fromCell: (raw, d) => {
      d.registered_on = parseDateCell(raw) || todayInSeoul();
    },
  },
  {
    header: "첫거래일",
    width: 12,
    toCell: (r) => r.customer.first_trade_date ?? "",
    fromCell: (raw, d) => {
      d.first_trade_date = parseDateCell(raw);
    },
  },
  {
    header: "마지막연락일",
    width: 14,
    toCell: (r) => r.customer.last_contact_date ?? "",
    fromCell: (raw, d) => {
      d.last_contact_date = parseDateCell(raw);
    },
  },
  {
    header: "비고",
    width: 30,
    toCell: (r) => r.customer.memo ?? "",
    fromCell: (raw, d) => {
      d.memo = cellText(raw);
    },
  },
  // ── 내보내기 전용 파생값 ──
  { header: "최근방문일", width: 14, toCell: (r) => r.lastVisitDate },
  { header: "거래건수", width: 10, toCell: (r) => r.tradeCount },
  { header: "누적거래액", width: 16, toCell: (r) => r.totalAmount },
];

/** 불러오기용 헤더 → 컬럼 매핑 (파생값 컬럼 제외). */
export const IMPORT_COLUMNS_BY_HEADER = new Map(
  CUSTOMER_EXCEL_COLUMNS.filter((c) => c.fromCell).map((c) => [c.header, c]),
);

/** "추천인" 셀 원문을 읽기 위한 헤더 인덱스 조회에 쓴다. */
export const REFERRER_HEADER = "추천인";
