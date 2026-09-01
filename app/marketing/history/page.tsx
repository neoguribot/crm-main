import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_STATUS_BADGE_CLASS,
  MESSAGE_STATUS_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { isoTimestampToSeoulDateTime } from "@/lib/date";
import { requireUser } from "@/lib/supabase/require-user";
import { listMessageLog } from "@/lib/messaging/log";

export const metadata: Metadata = { title: "발송 이력" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await requireUser();
  const result = await listMessageLog();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">발송 이력</h1>
        <Button variant="outline" size="sm" render={<Link href="/marketing" />}>
          마케팅 홈
        </Button>
      </div>

      {!result.ok ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            아직 발송 이력이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.map((row) => (
            <li key={row.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge
                      className={cn(
                        "font-normal",
                        MESSAGE_STATUS_BADGE_CLASS[row.status],
                      )}
                    >
                      {MESSAGE_STATUS_LABELS[row.status]}
                    </Badge>
                    <span className="font-medium">
                      {row.customer_name ?? "(삭제된 고객)"}
                    </span>
                    <span className="text-muted-foreground">{row.to_phone}</span>
                    <Badge variant="outline" className="font-normal">
                      {MESSAGE_CHANNEL_LABELS[row.channel]}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {isoTimestampToSeoulDateTime(row.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {row.rendered_body}
                  </p>
                  {row.error ? (
                    <p className="text-xs text-destructive">{row.error}</p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
