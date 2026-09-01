import type { MessageChannel, MessageStatus } from "@/lib/types/database";

export type SendResultRow = {
  name: string;
  phone: string;
  channel: MessageChannel;
  status: MessageStatus;
  body: string;
  error: string | null;
};

export type SendMessagesState = {
  status: "idle" | "done" | "error";
  message: string | null;
  sent: number;
  failed: number;
  manual: number;
  results: SendResultRow[];
};

export const initialSendState: SendMessagesState = {
  status: "idle",
  message: null,
  sent: 0,
  failed: 0,
  manual: 0,
  results: [],
};
