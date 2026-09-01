"use client";

import { useActionState, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESSAGE_STATUS_BADGE_CLASS, MESSAGE_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { buildCustomerVars, renderTemplate } from "@/lib/messaging/render";
import type { MessageCandidate } from "@/lib/messaging/send";
import { sendMessages } from "@/app/marketing/send/actions";
import { initialSendState } from "@/app/marketing/send/form-state";

type TemplateOption = {
  id: string;
  name: string;
  body: string;
  channel: string;
};

export function SendForm({
  templates,
  candidates,
  storeName,
  latestPricePerDon,
  preselectedIds,
}: {
  templates: TemplateOption[];
  candidates: MessageCandidate[];
  storeName: string | null;
  latestPricePerDon: string | null;
  preselectedIds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    sendMessages,
    initialSendState,
  );

  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselectedIds),
  );

  const template = templates.find((t) => t.id === templateId) ?? null;

  const previews = useMemo(() => {
    const map = new Map<string, string>();
    if (!template) return map;
    for (const c of candidates) {
      const vars = buildCustomerVars({
        customer: {
          name: c.name,
          phone: c.phone,
          last_contact_date: c.last_contact_date,
          birth_date: c.birth_date,
        },
        storeName,
        latestPricePerDon,
        targetPricePerDon: c.target_price_per_don,
        nextEvent: c.next_event,
      });
      map.set(c.id, renderTemplate(template.body, vars));
    }
    return map;
  }, [template, candidates, storeName, latestPricePerDon]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === candidates.length
        ? new Set()
        : new Set(candidates.map((c) => c.id)),
    );
  }

  const manualLines =
    state.status === "done" && state.manual > 0
      ? state.results
          .filter((r) => r.status === "MANUAL")
          .map((r) => ({ phone: r.phone, body: r.body }))
      : [];

  const csvHref = manualLines.length
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(
        `연락처,메시지\n${manualLines
          .map((l) => `"${l.phone}","${l.body.replace(/"/g, '""')}"`)
          .join("\n")}`,
      )}`
    : "";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="templateId" value={templateId} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">템플릿</label>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            사용 중인 템플릿이 없습니다. 먼저 템플릿을 만들어 주세요.
          </p>
        ) : (
          <Select
            items={Object.fromEntries(templates.map((t) => [t.id, t.name]))}
            value={templateId}
            onValueChange={(val) => setTemplateId(String(val))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            대상 ({selected.size}/{candidates.length})
          </span>
          <Button type="button" variant="outline" size="xs" onClick={toggleAll}>
            {selected.size === candidates.length ? "전체 해제" : "전체 선택"}
          </Button>
        </div>

        <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
          {candidates.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer gap-2 rounded p-2 hover:bg-muted">
                <input
                  type="checkbox"
                  name="customerIds"
                  value={c.id}
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="mt-0.5"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-muted-foreground">{c.phone}</span>
                  </span>
                  {template ? (
                    <span className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {previews.get(c.id)}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <Button type="submit" disabled={pending || !templateId} className="self-start">
        {pending ? "처리 중…" : `${selected.size}명에게 보내기`}
      </Button>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {state.status === "done" ? (
        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 text-sm">
          <p className="font-medium">{state.message}</p>

          {manualLines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(
                    manualLines
                      .map((l) => `${l.phone}\t${l.body}`)
                      .join("\n"),
                  )
                }
              >
                문구 전체 복사
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={
                  <a href={csvHref} download="수동발송_대상.csv">
                    CSV 내려받기
                  </a>
                }
              />
            </div>
          ) : null}

          <ul className="flex flex-col gap-1">
            {state.results.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "font-normal",
                    MESSAGE_STATUS_BADGE_CLASS[r.status],
                  )}
                >
                  {MESSAGE_STATUS_LABELS[r.status]}
                </Badge>
                <span>{r.name}</span>
                <span className="text-muted-foreground">{r.phone}</span>
                {r.error ? (
                  <span className="text-destructive">{r.error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
