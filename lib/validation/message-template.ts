import { z } from "zod";

import { MESSAGE_CHANNELS } from "@/lib/types/database";

const NAME_MAX = 100;
const BODY_MAX = 2000;
const KAKAO_ID_MAX = 100;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max}자 이내로 입력해 주세요.`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

export const messageTemplateSchema = z
  .object({
    name: z
      .string()
      .transform((v) => v.trim())
      .pipe(
        z
          .string()
          .min(1, "템플릿 이름을 입력해 주세요.")
          .max(NAME_MAX, `이름은 ${NAME_MAX}자 이내로 입력해 주세요.`),
      ),
    channel: z.enum(MESSAGE_CHANNELS).default("MANUAL"),
    body: z
      .string()
      .transform((v) => v.trim())
      .pipe(
        z
          .string()
          .min(1, "본문을 입력해 주세요.")
          .max(BODY_MAX, `본문은 ${BODY_MAX}자 이내로 입력해 주세요.`),
      ),
    kakao_template_id: optionalText(KAKAO_ID_MAX, "알림톡 템플릿 코드"),
    event_type: z
      .string()
      .trim()
      .transform((v) => (v === "" || v === "NONE" ? null : Number(v)))
      .nullable()
      .refine(
        (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 7),
        "연결 일정 종류가 올바르지 않습니다.",
      ),
    is_active: z
      .union([z.literal("on"), z.literal("true"), z.literal("")])
      .transform((v) => v === "on" || v === "true")
      .or(z.boolean()),
  })
  .superRefine((val, ctx) => {
    if (val.channel === "ALIMTALK" && !val.kakao_template_id) {
      ctx.addIssue({
        code: "custom",
        path: ["kakao_template_id"],
        message:
          "알림톡 채널은 승인된 템플릿 코드가 필요합니다. (없으면 채널을 '수동 발송'으로)",
      });
    }
  });

export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;

export function templateFormDataToObject(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    channel: String(formData.get("channel") ?? "MANUAL"),
    body: String(formData.get("body") ?? ""),
    kakao_template_id: String(formData.get("kakao_template_id") ?? ""),
    event_type: String(formData.get("event_type") ?? ""),
    is_active: formData.get("is_active") === null ? "" : "on",
  };
}

export { flattenFieldErrors } from "@/lib/validation/flatten";
