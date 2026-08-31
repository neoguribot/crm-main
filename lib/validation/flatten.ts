import type { z } from "zod";

/** zod 오류를 필드명 → 첫 메시지 맵으로 변환한다. */
export function flattenFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}
