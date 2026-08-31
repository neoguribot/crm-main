"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatKoreanDate, todayInSeoul } from "@/lib/date";
import {
  EVENT_TYPE_LABELS,
  ITEM_TYPE_LABELS,
  TRADE_TYPE_LABELS,
} from "@/lib/labels";
import { EVENT_TYPES } from "@/lib/types/database";
import type { CustomerEventItem } from "@/lib/events/queries";
import {
  RelatedTradePicker,
  type PickerTrade,
} from "@/app/customers/[id]/related-trade-picker";
import {
  createCustomerEvent,
  deleteCustomerEvent,
  toggleCustomerEventDone,
} from "@/app/customers/[id]/events/actions";
import { initialCustomerEventFormState } from "@/app/customers/[id]/events/form-state";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function EventRow({
  customerId,
  event,
  tradeLabel,
}: {
  customerId: string;
  event: CustomerEventItem;
  tradeLabel: string | null;
}) {
  const toggleAction = toggleCustomerEventDone.bind(
    null,
    customerId,
    event.id,
    !event.is_done,
  );
  const deleteAction = deleteCustomerEvent.bind(null, customerId, event.id);
  const [, toggleFormAction] = useActionState(toggleAction, { error: null });
  const [, deleteFormAction] = useActionState(deleteAction, { error: null });

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div className="flex flex-col">
        <span className={event.is_done ? "text-muted-foreground line-through" : ""}>
          {formatKoreanDate(event.event_date)} · {EVENT_TYPE_LABELS[event.event_type]}
          {tradeLabel ? ` · ${tradeLabel}` : ""}
        </span>
        {event.memo ? (
          <span className="text-xs text-muted-foreground">{event.memo}</span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <form action={toggleFormAction}>
          <Button type="submit" variant="outline" size="xs">
            {event.is_done ? "다시 열기" : "완료 처리"}
          </Button>
        </form>
        <form action={deleteFormAction}>
          <Button type="submit" variant="outline" size="xs">
            삭제
          </Button>
        </form>
      </div>
    </li>
  );
}

export function EventsSection({
  customerId,
  events,
  trades,
}: {
  customerId: string;
  events: CustomerEventItem[];
  trades: PickerTrade[];
}) {
  const action = createCustomerEvent.bind(null, customerId);
  const [state, formAction, pending] = useActionState(
    action,
    initialCustomerEventFormState,
  );
  const [showForm, setShowForm] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(
    state.values?.trade_id || null,
  );

  const v = state.values;
  const e = state.fieldErrors;

  const tradeLabelById = new Map(
    trades.map((t) => [
      t.id,
      `${formatKoreanDate(t.trade_date)} · ${TRADE_TYPE_LABELS[t.trade_type]} · ${
        ITEM_TYPE_LABELS[t.item_type] ?? t.item_type
      }`,
    ]),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>일정</CardTitle>
        <Button type="button" variant="outline" size="xs" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "취소" : "일정 추가"}
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">등록된 일정이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {events.map((ev) => (
              <EventRow
                key={ev.id}
                customerId={customerId}
                event={ev}
                tradeLabel={ev.trade_id ? tradeLabelById.get(ev.trade_id) ?? null : null}
              />
            ))}
          </ul>
        )}

        {showForm ? (
          <form action={formAction} className="mt-4 flex flex-col gap-4 border-t pt-4">
            {state.status === "error" && state.message ? (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label>
                종류 <span className="text-destructive">*</span>
              </Label>
              <Select name="event_type" items={EVENT_TYPE_LABELS} defaultValue={v?.event_type || undefined}>
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
              <FieldError message={e.event_type} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event_date">
                날짜 <span className="text-destructive">*</span>
              </Label>
              <DateInput
                id="event_date"
                name="event_date"
                defaultValue={v?.event_date ?? todayInSeoul()}
                required
              />
              <FieldError message={e.event_date} />
            </div>

            {trades.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Label>관련 거래 (선택)</Label>
                <RelatedTradePicker
                  name="trade_id"
                  trades={trades}
                  value={selectedTradeId}
                  onChange={setSelectedTradeId}
                />
              </div>
            ) : (
              <input type="hidden" name="trade_id" value="" />
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="memo">메모</Label>
              <Textarea id="memo" name="memo" rows={2} defaultValue={v?.memo ?? ""} />
              <FieldError message={e.memo} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="is_done" value="true" />
              등록과 동시에 완료 처리
            </label>

            <Button type="submit" disabled={pending} className="self-start">
              {pending ? "저장 중…" : "일정 저장"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
