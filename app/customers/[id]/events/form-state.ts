import type { customerEventFormDataToObject } from "@/lib/validation/customer-event";

export type CustomerEventFormState = {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
  values: ReturnType<typeof customerEventFormDataToObject> | null;
};

export const initialCustomerEventFormState: CustomerEventFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: null,
};
