import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKoreanDate } from "@/lib/date";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { remindFilterHref } from "@/lib/reminders/filters";
import type { ReminderData } from "@/lib/reminders/queries";
import {
  formatDayDelta,
  type RemindFilter,
  type RemindStatus,
} from "@/lib/reminders/status";
import type { QueryResult } from "@/lib/customers/queries";

const STATUS_BADGE: Record<RemindStatus, "secondary" | "outline"> = {
  OVERDUE: "secondary",
  TODAY: "secondary",
  WITHIN_7_DAYS: "outline",
  LATER: "outline",
};

const TABS: { filter: RemindFilter | null; label: string }[] = [
  { filter: null, label: "오늘" },
  { filter: "OVERDUE", label: "기한 지남" },
  { filter: "WITHIN_7_DAYS", label: "7일 이내" },
];

const MEMO_PREVIEW_LENGTH = 15;

function previewMemo(memo: string | null): string | null {
  if (!memo) return null;
  return memo.length > MEMO_PREVIEW_LENGTH
    ? `${memo.slice(0, MEMO_PREVIEW_LENGTH)}…`
    : memo;
}

export function RemindersCard({
  filter,
  result,
}: {
  filter: RemindFilter | null;
  result: QueryResult<ReminderData>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>오늘의 고객 관리 일정</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!result.ok ? (
          <p className="py-4 text-center text-sm text-destructive">{result.error}</p>
        ) : (
          <>
            <div aria-label="일정 상태 필터" className="flex flex-wrap gap-2">
              {TABS.map((tab) => {
                const isActive = (tab.filter === null && filter === null) || tab.filter === filter;
                const count = tab.filter === null ? result.data.counts.DEFAULT : result.data.counts[tab.filter];
                return (
                  <Button
                    key={tab.label}
                    size="xs"
                    variant={isActive ? "default" : "outline"}
                    render={<Link href={remindFilterHref(tab.filter)} scroll={false} />}
                  >
                    {tab.label} ({count})
                  </Button>
                );
              })}
            </div>

            {result.data.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                조건에 맞는 일정이 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {result.data.items.map((ev) => (
                  <li key={ev.id} className="flex flex-col gap-1 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/customers/${ev.customer_id}`}
                        className="font-medium hover:underline"
                      >
                        {ev.name}
                      </Link>
                      <Badge variant="outline">{EVENT_TYPE_LABELS[ev.event_type]}</Badge>
                      <span className="tabular-nums text-muted-foreground">
                        {formatKoreanDate(ev.event_date)}
                      </span>
                      <Badge variant={STATUS_BADGE[ev.status]}>
                        {formatDayDelta(ev.dayDelta)}
                      </Badge>
                    </div>
                    {previewMemo(ev.memo) ? (
                      <p className="text-xs text-muted-foreground">{previewMemo(ev.memo)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
