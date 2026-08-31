import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FREQUENCY_LABEL_LABELS,
  GENDER_LABELS,
  INFLOW_CHANNEL_LABELS,
  itemTypeLabel,
  PURCHASE_PURPOSE_LABELS,
  REVENUE_LABEL_LABELS,
} from "@/lib/labels";
import {
  FREQUENCY_LABELS,
  GENDERS,
  INFLOW_CHANNELS,
  ITEM_TYPES,
  PURCHASE_PURPOSES,
  REVENUE_LABELS,
} from "@/lib/types/database";
import { AGE_BUCKETS, AGE_BUCKET_LABELS } from "@/lib/analytics/summary";
import { getCustomerAnalytics } from "@/lib/analytics/queries";
import { formatWon } from "@/lib/number";
import { requireUser } from "@/lib/supabase/require-user";
import { BarList } from "@/app/analytics/bar-list";

export const metadata: Metadata = {
  title: "종합 분석",
};

export const dynamic = "force-dynamic";

/** 관련 있는 두 지표를 한 카드 안에 좌·우로 짝지어 보여준다. */
function PairCard({
  title,
  left,
  right,
  note,
}: {
  title: string;
  left: { heading: string; body: React.ReactNode };
  right: { heading: string; body: React.ReactNode };
  note?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-6 gap-y-4 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="sm:pr-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {left.heading}
            </p>
            {left.body}
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {right.heading}
            </p>
            {right.body}
          </div>
        </div>
        {note ? (
          <p className="mt-3 text-xs text-muted-foreground">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  await requireUser();

  const result = await getCustomerAnalytics();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">종합 분석</h1>
        <p className="text-sm text-muted-foreground">
          {result.ok
            ? `전체 고객 ${result.data.customerCount.toLocaleString("ko-KR")}명 기준`
            : ""}
        </p>
      </div>

      {!result.ok ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : (
        <>
          <PairCard
            title="고객 특성"
            left={{
              heading: "성별 분포",
              body: (
                <BarList
                  rows={GENDERS.map((g) => ({
                    label: GENDER_LABELS[g],
                    count: result.data.genderCounts[g],
                  }))}
                />
              ),
            }}
            right={{
              heading: "연령대 분포",
              body: (
                <BarList
                  rows={AGE_BUCKETS.map((a) => ({
                    label: AGE_BUCKET_LABELS[a],
                    count: result.data.ageBucketCounts[a],
                  }))}
                />
              ),
            }}
          />

          <PairCard
            title="고객 라벨"
            left={{
              heading: "빈도 라벨 분포",
              body: (
                <BarList
                  rows={FREQUENCY_LABELS.map((f) => ({
                    label: FREQUENCY_LABEL_LABELS[f],
                    count: result.data.frequencyCounts[f],
                  }))}
                />
              ),
            }}
            right={{
              heading: "매출 라벨 분포 (일반→우수→VIP)",
              body: (
                <BarList
                  rows={REVENUE_LABELS.map((r) => ({
                    label: REVENUE_LABEL_LABELS[r],
                    count: result.data.revenueCounts[r],
                  }))}
                />
              ),
            }}
          />

          <PairCard
            title="유입 · 방문 목적"
            note="한 고객이 여러 경로·목적을 가질 수 있어 합계가 전체 고객 수와 다를 수 있습니다."
            left={{
              heading: "유입 경로 분포",
              body: (
                <BarList
                  rows={INFLOW_CHANNELS.map((c) => ({
                    label: INFLOW_CHANNEL_LABELS[c],
                    count: result.data.channelCounts[c],
                  }))}
                />
              ),
            }}
            right={{
              heading: `방문 목적별 평균 방문 빈도 (전체 평균 ${result.data.overallAvgFrequency.toFixed(1)}회)`,
              body: (
                <ul className="flex flex-col divide-y text-sm">
                  {PURCHASE_PURPOSES.map((p) => {
                    const avg = result.data.purposeAvgFrequency[p];
                    const overall = result.data.overallAvgFrequency;
                    const pct =
                      overall > 0 ? Math.round((avg / overall) * 100) : 0;
                    return (
                      <li
                        key={p}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span>{PURCHASE_PURPOSE_LABELS[p]}</span>
                        <span className="flex items-center gap-2 tabular-nums">
                          <span className="font-medium">{avg.toFixed(1)}회</span>
                          <span className="text-xs text-muted-foreground">
                            (평균 대비 {pct}%)
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ),
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>품목 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                unit="건"
                rows={ITEM_TYPES.map((it) => ({
                  label: itemTypeLabel(it),
                  count: result.data.itemTypeCounts[it],
                }))}
              />
            </CardContent>
          </Card>

          <PairCard
            title="상위 고객"
            left={{
              heading: "누적 거래액 상위",
              body:
                result.data.topCustomers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    거래 이력이 있는 고객이 없습니다.
                  </p>
                ) : (
                  <ol className="flex flex-col divide-y text-sm">
                    {result.data.topCustomers.map((c, i) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
                            {i + 1}
                          </span>
                          <Link
                            href={`/customers/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {c.tradeCount.toLocaleString("ko-KR")}건
                          </span>
                        </div>
                        <span className="tabular-nums font-medium">
                          {formatWon(c.totalAmount)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ),
            }}
            right={{
              heading: "누적 거래 수 상위",
              body:
                result.data.topCustomersByCount.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    거래 이력이 있는 고객이 없습니다.
                  </p>
                ) : (
                  <ol className="flex flex-col divide-y text-sm">
                    {result.data.topCustomersByCount.map((c, i) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
                            {i + 1}
                          </span>
                          <Link
                            href={`/customers/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatWon(c.totalAmount)}
                          </span>
                        </div>
                        <span className="tabular-nums font-medium">
                          {c.tradeCount.toLocaleString("ko-KR")}건
                        </span>
                      </li>
                    ))}
                  </ol>
                ),
            }}
          />
        </>
      )}
    </main>
  );
}
