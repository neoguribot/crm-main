import type { NotificationRow } from "@/lib/types/database";

/** 화면에서 다루는 알림 필드 (서버 쿼리·클라이언트 공용, server-only 아님). */
export type AppNotification = Pick<
  NotificationRow,
  | "id"
  | "type"
  | "customer_id"
  | "title"
  | "body"
  | "read_at"
  | "dismissed_at"
  | "created_at"
>;
