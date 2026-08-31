import type { customerFormDataToObject } from "@/lib/validation/customer";

export type CustomerFormState = {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
  /** 오류 시 폼 값 복원용 (원본 문자열) */
  values: ReturnType<typeof customerFormDataToObject> | null;
};

export const initialCustomerFormState: CustomerFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: null,
};
