import type { tradeRecordFormDataToObject } from "@/lib/validation/trade-record";

export type TradeFormState = {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
  values: ReturnType<typeof tradeRecordFormDataToObject> | null;
};

export const initialTradeFormState: TradeFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: null,
};
