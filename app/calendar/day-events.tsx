"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatKoreanDate } from "@/lib/date";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { EVENT_TYPES } from "@/lib/types/database";
import type { CustomerPickerItem } from "@/lib/customers/queries";
import type { UpcomingEventItem } from "@/lib/events/queries";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  toggleCalendarEventDone,
  updateCalendarEvent,
} from "@/app/calendar/actions";
import {
  initialCalendarEventActionState,
  initialCalendarEventFormState,
} from "@/app/calendar/event-form-state";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function EventTypeField({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        종류 <span className="text-destructive">*</span>
      </Label>
      <Select name="event_type" items={EVENT_TYPE_LABELS} defaultValue={defaultValue}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="선택해 주세요" />
        </SelectTrigger>
        <SelectContent>
          {EVENT_TYPES.map((code) => (
            <SelectItem key={code} value={code}>
              {EVENT_TYPE_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CreateForm({
  selectedDay,
  customers,
  onDone,
}: {
  selectedDay: string;
  customers: CustomerPickerItem[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createCalendarEvent,
    initialCalendarEventFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state.ok, onDone]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-3 flex flex-col gap-3 rounded-md border p-3"
    >
      <p className="text-sm font-medium">새 일정 등록</p>
      {state.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label>
          고객 <span className="text-destructive">*</span>
        </Label>
        <Select name="customer_id" items={Object.fromEntries(customers.map((c) => [c.id, c.name]))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="고객 선택" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={state.fieldErrors.customer_id} />
      </div>

      <EventTypeField />
      <FieldError message={state.fieldErrors.event_type} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create_event_date">
          날짜 <span className="text-destructive">*</span>
        </Label>
        <DateInput
          id="create_event_date"
          name="event_date"
          defaultValue={selectedDay}
          required
        />
        <FieldError message={state.fieldErrors.event_date} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create_event_memo">메모</Label>
        <Textarea id="create_event_memo" name="memo" rows={2} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="is_done" value="true" />
        등록과 동시에 완료 처리
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "저장 중…" : "일정 저장"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}

function EditForm({
  event,
  onDone,
}: {
  event: UpcomingEventItem;
  onDone: () => void;
}) {
  const action = updateCalendarEvent.bind(null, event.id);
  const [state, formAction, pending] = useActionState(
    action,
    initialCalendarEventFormState,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-3 rounded-md border p-3">
      {state.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <EventTypeField defaultValue={event.event_type} />
      <FieldError message={state.fieldErrors.event_type} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`edit_date_${event.id}`}>
          날짜 <span className="text-destructive">*</span>
        </Label>
        <DateInput
          id={`edit_date_${event.id}`}
          name="event_date"
          defaultValue={event.event_date}
          required
        />
        <FieldError message={state.fieldErrors.event_date} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`edit_memo_${event.id}`}>메모</Label>
        <Textarea
          id={`edit_memo_${event.id}`}
          name="memo"
          rows={2}
          defaultValue={event.memo ?? ""}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="is_done" value="true" defaultChecked={event.is_done} />
        완료 처리됨
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "저장 중…" : "수정 저장"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}

function EventRow({ event }: { event: UpcomingEventItem }) {
  const [editing, setEditing] = useState(false);
  const toggleAction = toggleCalendarEventDone.bind(
    null,
    event.id,
    !event.is_done,
  );
  const deleteAction = deleteCalendarEvent.bind(null, event.id);
  const [, toggleFormAction] = useActionState(
    toggleAction,
    initialCalendarEventActionState,
  );
  const [, deleteFormAction] = useActionState(
    deleteAction,
    initialCalendarEventActionState,
  );

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{EVENT_TYPE_LABELS[event.event_type]}</Badge>
          <Link
            href={`/customers/${event.customer_id}`}
            className={`font-medium hover:underline ${
              event.is_done ? "text-muted-foreground line-through" : ""
            }`}
          >
            {event.customer_name}
          </Link>
          {event.memo ? (
            <span className="text-xs text-muted-foreground">{event.memo}</span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <form action={toggleFormAction}>
            <Button type="submit" variant="outline" size="xs">
              {event.is_done ? "다시 열기" : "완료"}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setEditing((s) => !s)}
          >
            {editing ? "닫기" : "수정"}
          </Button>
          <form action={deleteFormAction}>
            <Button type="submit" variant="outline" size="xs">
              삭제
            </Button>
          </form>
        </div>
      </div>
      {editing ? (
        <EditForm event={event} onDone={() => setEditing(false)} />
      ) : null}
    </li>
  );
}

export function DayEvents({
  selectedDay,
  events,
  customers,
}: {
  selectedDay: string;
  events: UpcomingEventItem[];
  customers: CustomerPickerItem[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {formatKoreanDate(selectedDay)} 일정
          </h2>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setCreating((s) => !s)}
          >
            {creating ? "취소" : "일정 추가"}
          </Button>
        </div>

        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            이 날짜에는 일정이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {events.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </ul>
        )}

        {creating ? (
          customers.length > 0 ? (
            <CreateForm
              selectedDay={selectedDay}
              customers={customers}
              onDone={() => setCreating(false)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              먼저 고객을 등록해 주세요.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
