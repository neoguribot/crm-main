import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  currentMonthLabelInSeoul,
  formatKoreanDate,
  todayInSeoul,
} from "@/lib/date";
import {
  getCustomerCountByPeriod,
  getDashboardSummary,
} from "@/lib/dashboard/queries";
import {
  parsePeriodGranularity,
  PERIOD_GRANULARITIES,
  PERIOD_LABELS,
  periodHref,
} from "@/lib/dashboard/period";
import { getCurrentAppUser } from "@/lib/users/queries";
import { parseRemindFilter } from "@/lib/reminders/filters";
import { getReminderData } from "@/lib/reminders/queries";
import {
  itemTypeLabel,
  PURCHASE_PURPOSE_LABELS,
  TRADE_STATUS_LABELS,
  TRADE_TYPE_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { formatWon, trimTrailingZeros } from "@/lib/number";
import { PURCHASE_PURPOSES } from "@/lib/types/database";
import type { PurposeCounts } from "@/lib/dashboard/summary";
import { requireUser } from "@/lib/supabase/require-user";
import { PeriodTrendChart } from "@/app/home/period-trend-chart";
import { GoalCard } from "@/app/home/goal-card";
import { RemindersCard } from "@/app/home/reminders-card";

export const metadata: Metadata = {
  title: "홈",
};

// 인증 사용자별 데이터이므로 정적 캐시에 저장하지 않는다.
export const dynamic = "force-dynamic";

const PURPOSE_VIEWS = ["all", "today", "week", "month", "year"] as const;
type PurposeView = (typeof PURPOSE_VIEWS)[number];
const PURPOSE_VIEW_LABELS: Record<PurposeView, string> = {
  all: "전체",
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
  year: "올해",
};

function parsePurposeView(value: unknown): PurposeView {
  return (PURPOSE_VIEWS as readonly string[]).includes(value as string)
    ? (value as PurposeView)
    : "all";
}

function purposeViewHref(view: PurposeView): string {
  return view === "all" ? "/home" : `/home?purposeView=${view}`;
}

function StatCard({
  label,
  value,
  href,
  sub,
}: {
  label: string;
  value: string;
  href?: string;
  sub?: string;
}) {
  const body = (
    <Card className={href ? "transition-colors hover:bg-muted/50" : undefined}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub ? (
          <span className="text-xs text-muted-foreground">{sub}</span>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {body}
    </Link>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const granularity = parsePeriodGranularity(
    Array.isArray(sp.period) ? sp.period[0] : sp.period,
  );
  const remindFilter = parseRemindFilter(sp);
  const purposeView = parsePurposeView(
    Array.isArray(sp.purposeView) ? sp.purposeView[0] : sp.purposeView,
  );

  const [result, tradePeriod, registrationPeriod, reminderData, appUser] =
    await Promise.all([
      getDashboardSummary(),
      getCustomerCountByPeriod(granularity, "trade"),
      getCustomerCountByPeriod(granularity, "registration"),
      getReminderData(remindFilter),
      getCurrentAppUser(),
    ]);
  const monthLabel = currentMonthLabelInSeoul();
  const monthTotalAmount = result.ok
    ? String(Number(result.data.monthSaleAmount) + Number(result.data.monthPurchaseAmount))
    : "0";
  const EMPTY_PURPOSE_COUNTS: PurposeCounts = {
    PURCHASE: 0,
    GOLD_BAR: 0,
    STONE_PRODUCT: 0,
    CUSTOM_JEWELRY: 0,
    OTHER: 0,
  };
  const purposeCountsForView: PurposeCounts = result.ok
    ? {
        all: result.data.purposeCounts,
        today: result.data.purposeCountsToday,
        week: result.data.purposeCountsWeek,
        month: result.data.purposeCountsMonth,
        year: result.data.purposeCountsYear,
      }[purposeView]
    : EMPTY_PURPOSE_COUNTS;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">홈</h1>
        <p className="text-sm text-muted-foreground">
          기준일 {formatKoreanDate(todayInSeoul())} · 시간대 Asia/Seoul
        </p>
      </div>

      <RemindersCard filter={remindFilter} result={reminderData} />

      {!result.ok ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>거래 수 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted-foreground">오늘</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {result.data.tradeCountToday.toLocaleString("ko-KR")}건
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">어제</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {result.data.tradeCountYesterday.toLocaleString("ko-KR")}건
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">진행 중</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {result.data.tradeCountInProgress.toLocaleString("ko-KR")}건
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">완료</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {result.data.tradeCountDone.toLocaleString("ko-KR")}건
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">이번 주</dt>
                  <dd className="text-base font-medium tabular-nums">
                    {result.data.tradeCountWeek.toLocaleString("ko-KR")}건
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">이번 달</dt>
                  <dd className="text-base font-medium tabular-nums">
                    {result.data.tradeCountMonth.toLocaleString("ko-KR")}건
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">올해</dt>
                  <dd className="text-base font-medium tabular-nums">
                    {result.data.tradeCountYear.toLocaleString("ko-KR")}건
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="전체 고객"
              value={`${result.data.customerCount.toLocaleString("ko-KR")}명`}
              href="/customers"
            />
            <StatCard
              label={`${monthLabel} 판매 금액`}
              value={formatWon(result.data.monthSaleAmount)}
            />
            <StatCard
              label={`${monthLabel} 매입 금액`}
              value={formatWon(result.data.monthPurchaseAmount)}
            />
            <StatCard
              label={`${monthLabel} 총 매출액`}
              value={formatWon(monthTotalAmount)}
            />
          </section>

          <GoalCard
            monthLabel={monthLabel}
            currentAmount={monthTotalAmount}
            goal={appUser.ok ? (appUser.data?.monthly_sales_goal ?? null) : null}
          />

          <Card>
            <CardHeader>
              <CardTitle>기간별 추이</CardTitle>
              <CardAction>
                <div
                  role="group"
                  aria-label="집계 단위"
                  className="flex flex-wrap gap-1"
                >
                  {PERIOD_GRANULARITIES.map((g) => (
                    <Link
                      key={g}
                      href={periodHref(g)}
                      scroll={false}
                      aria-current={g === granularity ? "page" : undefined}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                        g === granularity
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {PERIOD_LABELS[g]}
                    </Link>
                  ))}
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {tradePeriod.ok && registrationPeriod.ok ? (
                <PeriodTrendChart
                  granularity={granularity}
                  trade={tradePeriod.data}
                  registration={registrationPeriod.data}
                />
              ) : (
                <p className="py-4 text-center text-sm text-destructive">
                  {!tradePeriod.ok
                    ? tradePeriod.error
                    : !registrationPeriod.ok
                      ? registrationPeriod.error
                      : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <section
            aria-labelledby="dash-detail"
            className="grid gap-6 lg:grid-cols-5"
          >
            <h2 id="dash-detail" className="sr-only">
              방문 목적별 고객 수와 최근 거래 내역
            </h2>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>방문 목적별 고객 수</CardTitle>
                <div
                  role="group"
                  aria-label="집계 기간"
                  className="mt-1 flex flex-wrap gap-1"
                >
                  {PURPOSE_VIEWS.map((v) => (
                    <Link
                      key={v}
                      href={purposeViewHref(v)}
                      scroll={false}
                      aria-current={v === purposeView ? "page" : undefined}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                        v === purposeView
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {PURPOSE_VIEW_LABELS[v]}
                    </Link>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y text-sm">
                  {PURCHASE_PURPOSES.map((p) => (
                    <li key={p}>
                      <Link
                        href={`/customers?purpose=${p}`}
                        className="flex items-center justify-between py-2 hover:text-foreground"
                      >
                        <span>{PURCHASE_PURPOSE_LABELS[p]}</span>
                        <span className="tabular-nums">
                          {purposeCountsForView[p].toLocaleString("ko-KR")}명
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  {purposeView === "all"
                    ? "한 고객이 여러 목적을 가질 수 있어 합계가 전체 고객 수와 다를 수 있습니다."
                    : "선택한 기간 안에 거래한 고객 기준입니다(중복 목적 포함 가능)."}
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>최근 거래 내역</CardTitle>
              </CardHeader>
              <CardContent>
                {result.data.recentTrades.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    아직 거래가 없습니다.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y text-sm">
                    {result.data.recentTrades.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="tabular-nums text-muted-foreground">
                            {formatKoreanDate(t.trade_date)}
                          </span>
                          <Badge
                            variant={
                              t.trade_type === "SALE" ? "secondary" : "outline"
                            }
                          >
                            {TRADE_TYPE_LABELS[t.trade_type]}
                          </Badge>
                          <Link
                            href={`/customers/${t.customer_id}`}
                            className="font-medium hover:underline"
                          >
                            {t.customer_name}
                          </Link>
                          <span className="text-muted-foreground">
                            {itemTypeLabel(t.item_type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {t.unit_price ? (
                            <span className="tabular-nums text-muted-foreground">
                              {formatWon(t.unit_price)} • {trimTrailingZeros(t.weight)}g
                            </span>
                          ) : (
                            <span className="tabular-nums text-muted-foreground">
                              {trimTrailingZeros(t.weight)}g
                            </span>
                          )}
                          <span className="tabular-nums">
                            {formatWon(t.amount)}
                          </span>
                          <Badge variant="outline">{TRADE_STATUS_LABELS[t.status]}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}
