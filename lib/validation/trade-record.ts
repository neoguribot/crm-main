import { z } from "zod";

import { isValidIsoDate, todayInSeoul } from "@/lib/date";
import {
  hasMaxDecimalPlaces,
  isDecimalString,
  isZeroDecimalString,
} from "@/lib/number";
import {
  ITEM_TYPES,
  TRADE_STATUSES,
  TRADE_TYPES,
  isItemTypeAllowedForTradeType,
} from "@/lib/types/database";

const MEMO_MAX = 1000;
const DETAIL_MAX = 200;

/** 필수 양수 십진 문자열 (0 불가). */
const positiveDecimal = (label: string, decimalPlaces: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}을(를) 입력해 주세요.`)
    .refine(isDecimalString, `${label}은(는) 올바른 숫자여야 합니다.`)
    .refine(
      (v) => hasMaxDecimalPlaces(v, decimalPlaces),
      `${label}은(는) 소수점 ${decimalPlaces}자리까지 입력할 수 있습니다.`,
    )
    .refine((v) => !isZeroDecimalString(v), `${label}은(는) 0보다 커야 합니다.`);

/** 필수 양의 정수 원화 (numeric(15,0)). */
const wonAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label}을(를) 입력해 주세요.`)
    .refine((v) => /^\d+$/.test(v), `${label}은(는) 0 이상의 정수여야 합니다.`)
    .refine(
      (v) => v.replace(/^0+/, "").length <= 15,
      `${label}이(가) 너무 큽니다.`,
    );

export const tradeRecordInputSchema = z
  .object({
    trade_type: z.enum(TRADE_TYPES, { message: "거래구분을 선택해 주세요." }),
    item_type: z.enum(ITEM_TYPES, { message: "품목을 선택해 주세요." }),
    item_detail: z
      .string()
      .trim()
      .max(DETAIL_MAX, `기타 세부 내용은 ${DETAIL_MAX}자 이내로 입력해 주세요.`)
      .transform((v) => (v === "" ? null : v))
      .nullable(),
    // 기준 단가: numeric(15,0)
    unit_price: wonAmount("기준 단가"),
    // 중량: numeric(10,3), 0보다 커야 함.
    weight: positiveDecimal("중량", 3),
    // 총 금액: numeric(15,0)
    amount: wonAmount("총 금액"),
    status: z.enum(TRADE_STATUSES, { message: "완료 여부를 선택해 주세요." }),
    trade_date: z
      .string()
      .trim()
      .refine(isValidIsoDate, "올바른 날짜(YYYY-MM-DD)를 입력해 주세요.")
      .refine(
        (v) => v <= todayInSeoul(),
        "거래일은 오늘 이후로 지정할 수 없습니다.",
      ),
    memo: z
      .string()
      .trim()
      .max(MEMO_MAX, `비고는 ${MEMO_MAX}자 이내로 입력해 주세요.`)
      .transform((v) => (v === "" ? null : v))
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.item_type === "OTHER" && !data.item_detail) {
      ctx.addIssue({
        code: "custom",
        path: ["item_detail"],
        message: "기타 품목의 세부 내용을 입력해 주세요.",
      });
    }
    if (!isItemTypeAllowedForTradeType(data.item_type, data.trade_type)) {
      ctx.addIssue({
        code: "custom",
        path: ["item_type"],
        message: "이 품목은 매입 거래에서만 선택할 수 있습니다.",
      });
    }
  });

export type TradeRecordInput = z.infer<typeof tradeRecordInputSchema>;

/** 금액 입력의 1000단위 콤마를 제거한다. "1,000" → "1000" */
function stripCommas(value: FormDataEntryValue | null): string {
  return String(value ?? "").replace(/,/g, "");
}

export function tradeRecordFormDataToObject(formData: FormData) {
  return {
    trade_type: String(formData.get("trade_type") ?? ""),
    item_type: String(formData.get("item_type") ?? ""),
    item_detail: String(formData.get("item_detail") ?? ""),
    unit_price: stripCommas(formData.get("unit_price")),
    weight: String(formData.get("weight") ?? ""),
    amount: stripCommas(formData.get("amount")),
    status: String(formData.get("status") ?? "DONE"),
    trade_date: String(formData.get("trade_date") ?? ""),
    memo: String(formData.get("memo") ?? ""),
  };
}
