import type { templateFormDataToObject } from "@/lib/validation/message-template";

export type TemplateFormState = {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
  values: ReturnType<typeof templateFormDataToObject> | null;
};

export const initialTemplateFormState: TemplateFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: null,
};
