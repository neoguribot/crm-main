import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { listMessageTemplates } from "@/lib/messaging/templates";
import {
  getMessagingContext,
  listMessageCandidates,
} from "@/lib/messaging/send";
import { getMarketingSegments } from "@/lib/marketing/segments";
import { SEGMENT_KEYS, type SegmentKey } from "@/lib/marketing/segment-defs";
import { SendForm } from "@/app/marketing/send/send-form";

export const metadata: Metadata = { title: "메시지 보내기" };
export const dynamic = "force-dynamic";

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const segmentKey =
    typeof sp.segment === "string" &&
    (SEGMENT_KEYS as readonly string[]).includes(sp.segment)
      ? (sp.segment as SegmentKey)
      : null;

  const [templatesRes, candidatesRes, ctx, segmentsRes] = await Promise.all([
    listMessageTemplates(true),
    listMessageCandidates(),
    getMessagingContext(),
    segmentKey ? getMarketingSegments() : Promise.resolve(null),
  ]);

  let preselectedIds: string[] = [];
  if (segmentKey && segmentsRes?.ok) {
    preselectedIds =
      segmentsRes.data.find((s) => s.key === segmentKey)?.customers.map((c) => c.id) ??
      [];
  } else {
    const preselectRaw = sp.customerIds ?? sp.customerId;
    preselectedIds = Array.isArray(preselectRaw)
      ? preselectRaw
      : preselectRaw
        ? [preselectRaw]
        : [];
  }

  const error = !templatesRes.ok
    ? templatesRes.error
    : !candidatesRes.ok
      ? candidatesRes.error
      : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">메시지 보내기</h1>
        <Button variant="outline" size="sm" render={<Link href="/marketing" />}>
          마케팅 홈
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <SendForm
              templates={
                templatesRes.ok
                  ? templatesRes.data.map((t) => ({
                      id: t.id,
                      name: t.name,
                      body: t.body,
                      channel: t.channel,
                    }))
                  : []
              }
              candidates={candidatesRes.ok ? candidatesRes.data : []}
              storeName={ctx.storeName}
              latestPricePerDon={ctx.latestPricePerDon}
              preselectedIds={preselectedIds}
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
