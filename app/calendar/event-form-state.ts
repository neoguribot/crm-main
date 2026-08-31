/** 캘린더 일정 등록·수정 폼 상태 (서버 액션 파일과 분리 — "use server" 는 async 함수만 export 가능). */

export type CalendarEventFormState = {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string>;
  values: {
    customer_id: string;
    event_type: string;
    event_date: string;
    memo: string;
    is_done: string;
  } | null;
};

export const initialCalendarEventFormState: CalendarEventFormState = {
  ok: false,
  message: null,
  fieldErrors: {},
  values: null,
};

export type CalendarEventActionState = { error: string | null };

export const initialCalendarEventActionState: CalendarEventActionState = {
  error: null,
};
