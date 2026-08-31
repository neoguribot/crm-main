"use client";

import { useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarList } from "@/app/analytics/bar-list";
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
import type { CustomerAnalytics } from "@/lib/analytics/summary";
import { formatWon } from "@/lib/number";
import { cn } from "@/lib/utils";

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

/** 한 줄로 늘어놓는 세그먼트 토글. */
function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            o.key === value
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {sub ? (
        <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>
      ) : null}
    </div>
  );
}

type DistKey =
  | "gender"
  | "age"
  | "frequency"
  | "revenue"
  | "channel"
  | "item";

const DIST_OPTIONS: { key: DistKey; label: string }[] = [
  { key: "gender", label: "성별" },
  { key: "age", label: "연령대" },
  { key: "frequency", label: "빈도 라벨" },
  { key: "revenue", label: "매출 라벨" },
  { key: "channel", label: "유입 경로" },
  { key: "item", label: "품목" },
];

type TopBy = "amount" | "count" | "referral";

export function AnalyticsView({ data }: { data: CustomerAnalytics }) {
  const [dist, setDist] = useState<DistKey>("gender");
  const [topBy, setTopBy] = useState<TopBy>("amount");

  const distRows: { label: string; count: number }[] =
    dist === "gender"
      ? GENDERS.map((g) => ({
          label: GENDER_LABELS[g],
          count: data.genderCounts[g],
        }))
      : dist === "age"
        ? AGE_BUCKETS.map((a) => ({
            label: AGE_BUCKET_LABELS[a],
            count: data.ageBucketCounts[a],
          }))
        : dist === "frequency"
          ? FREQUENCY_LABELS.map((f) => ({
              label: FREQUENCY_LABEL_LABELS[f],
              count: data.frequencyCounts[f],
            }))
          : dist === "revenue"
            ? REVENUE_LABELS.map((r) => ({
                label: REVENUE_LABEL_LABELS[r],
                count: data.revenueCounts[r],
              }))
            : dist === "channel"
              ? INFLOW_CHANNELS.map((c) => ({
                  label: INFLOW_CHANNEL_LABELS[c],
                  count: data.channelCounts[c],
                }))
              : ITEM_TYPES.map((it) => ({
                  label: itemTypeLabel(it),
                  count: data.itemTypeCounts[it],
                }));

  const distNote =
    dist === "channel"
      ? "한 고객이 여러 경로를 가질 수 있어 합계가 전체 고객 수와 다를 수 있습니다."
      : dist === "item"
        ? "고객 수가 아니라 누적 거래 건수 기준입니다."
        : null;

  const topList: { id: string; name: string; primary: string; secondary: string }[] =
    topBy === "amount"
      ? data.topCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          primary: formatWon(c.totalAmount),
          secondary: `${c.tradeCount.toLocaleString("ko-KR")}건`,
        }))
      : topBy === "count"
        ? data.topCustomersByCount.map((c) => ({
            id: c.id,
            name: c.name,
            primary: `${c.tradeCount.toLocaleString("ko-KR")}건`,
            secondary: formatWon(c.totalAmount),
          }))
        : data.topReferrers.map((c) => ({
            id: c.id,
            name: c.name,
            primary: `${c.referralCount.toLocaleString("ko-KR")}명 추천`,
            secondary: "",
          }));

  const topEmptyMessage =
    topBy === "referral"
      ? "추천인으로 지정된 고객이 없습니다."
      : "거래 이력이 있는 고객이 없습니다.";

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="전체 고객"
          value={`${data.customerCount.toLocaleString("ko-KR")}명`}
        />
        <Tile
          label="VIP 고객"
          value={`${data.revenueCounts.VIP.toLocaleString("ko-KR")}명`}
          sub={`전체의 ${pct(data.revenueCounts.VIP, data.customerCount)}`}
        />
        <Tile
          label="단골 고객"
          value={`${data.frequencyCounts.단골.toLocaleString("ko-KR")}명`}
          sub={`전체의 ${pct(data.frequencyCounts.단골, data.customerCount)}`}
        />
        <Tile
          label="평균 방문 빈도"
          value={`${data.overallAvgFrequency.toFixed(1)}회`}
          sub="고객 1명당 누적 거래"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>고객 분포</CardTitle>
          <Toggle
            label="분포 기준"
            options={DIST_OPTIONS}
            value={dist}
            onChange={setDist}
          />
        </CardHeader>
        <CardContent>
          <BarList rows={distRows} unit={dist === "item" ? "건" : "명"} />
          {distNote ? (
            <p className="mt-3 text-xs text-muted-foreground">{distNote}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상위 고객</CardTitle>
          <Toggle
            label="정렬 기준"
            options={[
              { key: "amount", label: "누적 거래액순" },
              { key: "count", label: "누적 거래 건수순" },
              { key: "referral", label: "최다 추천순" },
            ]}
            value={topBy}
            onChange={setTopBy}
          />
        </CardHeader>
        <CardContent>
          {topList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {topEmptyMessage}
            </p>
          ) : (
            <ol className="flex flex-col divide-y text-sm">
              {topList.map((c, i) => (
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
                    {c.secondary ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {c.secondary}
                      </span>
                    ) : null}
                  </div>
                  <span className="font-medium tabular-nums">{c.primary}</span>
                </li>
              ))}
            </ol>
          )}
          {topBy === "referral" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              이 고객을 추천인으로 등록한 다른 고객 수 기준입니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>방문 목적별 평균 방문 빈도</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y text-sm">
            {PURCHASE_PURPOSES.map((p) => {
              const avg = data.purposeAvgFrequency[p];
              const overall = data.overallAvgFrequency;
              const rel =
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
                      (평균 대비 {rel}%)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            전체 평균 방문 빈도 {data.overallAvgFrequency.toFixed(1)}회 기준.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
