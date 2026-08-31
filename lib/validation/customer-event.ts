import { z } from "zod";

import { isValidIsoDate } from "@/lib/date";
import { EVENT_TYPES } from "@/lib/types/database";

const MEMO_MAX = 1000;

export const customerEventInputSchema = z.object({
  event_type: z.enum(EVENT_TYPES, { message: "일정 종류를 선택해 주세요." }),
  event_date: z
    .string()
    .trim()
    .refine(isValidIsoDate, "올바른 날짜(YYYY-MM-DD)를 입력해 주세요."),
  trade_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  memo: z
    .string()
    .trim()
    .max(MEMO_MAX, `메모는 ${MEMO_MAX}자 이내로 입력해 주세요.`)
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  is_done: z
    .union([z.literal("true"), z.literal("on"), z.literal(""), z.null()])
    .optional()
    .transform((v) => v === "true" || v === "on"),
});

export type CustomerEventInput = z.infer<typeof customerEventInputSchema>;

export function customerEventFormDataToObject(formData: FormData) {
  return {
    event_type: String(formData.get("event_type") ?? ""),
    event_date: String(formData.get("event_date") ?? ""),
    trade_id: String(formData.get("trade_id") ?? ""),
    memo: String(formData.get("memo") ?? ""),
    is_done: formData.get("is_done") ? String(formData.get("is_done")) : "",
  };
}

export { flattenFieldErrors } from "@/lib/validation/flatten";
