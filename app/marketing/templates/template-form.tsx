"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPE_LABELS, MESSAGE_CHANNEL_LABELS } from "@/lib/labels";
import { EVENT_TYPES, MESSAGE_CHANNELS } from "@/lib/types/database";
import { eventTypeToCode } from "@/lib/types/codes";
import { TEMPLATE_VARIABLES } from "@/lib/messaging/render";
import type { MessageTemplate } from "@/lib/types/database";
import {
  initialTemplateFormState,
  type TemplateFormState,
} from "@/app/marketing/templates/form-state";

type Action = (
  state: TemplateFormState,
  formData: FormData,
) => Promise<TemplateFormState>;

const CHANNEL_ITEMS = Object.fromEntries(
  MESSAGE_CHANNELS.map((c) => [c, MESSAGE_CHANNEL_LABELS[c]]),
) as Record<string, string>;

const EVENT_ITEMS: Record<string, string> = {
  NONE: "연결 안 함",
  ...Object.fromEntries(
    EVENT_TYPES.map((t) => [String(eventTypeToCode(t)), EVENT_TYPE_LABELS[t]]),
  ),
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function TemplateForm({
  action,
  submitLabel,
  defaults,
  initialBody,
}: {
  action: Action;
  submitLabel: string;
  defaults?: MessageTemplate;
  /** 세그먼트 추천 문구 등으로 본문을 미리 채울 때. */
  initialBody?: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialTemplateFormState,
  );
  const v = state.values;
  const e = state.fieldErrors;

  const [channel, setChannel] = useState<string>(
    v?.channel ?? defaults?.channel ?? "MANUAL",
  );
  const [eventType, setEventType] = useState<string>(
    v?.event_type ??
      (defaults?.event_type != null ? String(defaults.event_type) : "NONE"),
  );
  const [body, setBody] = useState<string>(
    v?.body ?? defaults?.body ?? initialBody ?? "",
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">템플릿 이름</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={v?.name ?? defaults?.name ?? ""}
          placeholder="예: 재방문 안내"
        />
        <FieldError message={e.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>발송 채널</Label>
        <Select
          name="channel"
          items={CHANNEL_ITEMS}
          value={channel}
          onValueChange={(val) => setChannel(String(val))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESSAGE_CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                {MESSAGE_CHANNEL_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          알림톡·문자는 발송 설정과 솔라피 연동이 끝나야 실제로 나갑니다. 그
          전에는 &quot;수동 발송&quot;처럼 문구만 만들어 줍니다.
        </p>
      </div>

      {channel === "ALIMTALK" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kakao_template_id">알림톡 템플릿 코드</Label>
          <Input
            id="kakao_template_id"
            name="kakao_template_id"
            defaultValue={
              v?.kakao_template_id ?? defaults?.kakao_template_id ?? ""
            }
            placeholder="솔라피에서 승인받은 템플릿 코드"
          />
          <FieldError message={e.kakao_template_id} />
        </div>
      ) : (
        <input
          type="hidden"
          name="kakao_template_id"
          value={defaults?.kakao_template_id ?? ""}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <Label>연결 일정 종류 (선택)</Label>
        <Select
          name="event_type"
          items={EVENT_ITEMS}
          value={eventType}
          onValueChange={(val) => setEventType(String(val))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EVENT_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={e.event_type} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">본문</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={6}
          value={body}
          onChange={(ev) => setBody(ev.target.value)}
          placeholder="{이름}님, 안녕하세요. ..."
        />
        <FieldError message={e.body} />
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setBody((b) => `${b}{${name}}`)}
              className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            >
              {`{${name}}`}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={v ? v.is_active === "on" : (defaults?.is_active ?? true)}
        />
        사용 중 (발송 화면 목록에 표시)
      </label>

      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          render={<Link href="/marketing/templates" />}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
