import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatKoreanDate, todayInSeoul } from "@/lib/date";
import { getCustomerBasicById, getCustomerById } from "@/lib/customers/queries";
import {
  calendarMonthsWindowStart,
  suggestFrequencyLabel,
  suggestRevenueLabel,
} from "@/lib/customers/label-suggestion";
import { averageRevisitIntervalDays } from "@/lib/customers/revisit-interval";
import { listTradeRecordsByCustomer } from "@/lib/trades/queries";
import { listCustomerEvents } from "@/lib/events/queries";
import {
  FREQUENCY_LABEL_LABELS,
  GENDER_LABELS,
  INFLOW_CHANNEL_LABELS,
  PURCHASE_PURPOSE_LABELS,
  REVENUE_LABEL_LABELS,
} from "@/lib/labels";
import { summarizeHoldings, totalHoldingsWeight } from "@/lib/trades/holdings";
import { getLatestGoldPrice, getPriceTarget } from "@/lib/prices/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { EventsSection } from "@/app/customers/[id]/events-section";
import { HoldingsSummary } from "@/app/customers/[id]/holdings-summary";
import { MetricsCard } from "@/app/customers/[id]/metrics-card";
import { PriceTargetCard } from "@/app/customers/[id]/price-target-card";
import { ProfitCard } from "@/app/customers/[id]/profit-card";
import { TradeHistorySection } from "@/app/customers/[id]/trade-history";

export const metadata: Metadata = {
  title: "고객 상세",
};

// 인증 사용자별 데이터이므로 정적 캐시에 저장하지 않는다.
export const dynamic = "force-dynamic";

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex gap-4 py-2 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      {children ?? <span className="whitespace-pre-wrap">{value}</span>}
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const { id } = await params;
  const editingTarget = (await searchParams).editTarget === "1";

  const result = await getCustomerById(id);

  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      </main>
    );
  }

  // 없는 ID 또는 다른 사용자의 고객 → 404 와 동일하게 처리(정보 노출 없음)
  if (!result.data) {
    notFound();
  }

  const c = result.data;
  const [trades, targetResult, priceResult, eventsResult, referrerResult] =
    await Promise.all([
      listTradeRecordsByCustomer(c.id),
      getPriceTarget(c.id),
      getLatestGoldPrice(),
      listCustomerEvents(c.id),
      c.referred_by_customer_id
        ? getCustomerBasicById(c.referred_by_customer_id)
        : Promise.resolve({ ok: true as const, data: null }),
    ]);
  const holdings = trades.ok ? summarizeHoldings(trades.data) : [];
  const cumulativeSaleAmount = trades.ok
    ? trades.data
        .filter((t) => t.trade_type === "SALE")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    : 0;
  const cumulativePurchaseAmount = trades.ok
    ? trades.data
        .filter((t) => t.trade_type === "PURCHASE")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    : 0;
  const cumulativeAmount = cumulativeSaleAmount + cumulativePurchaseAmount;
  const totalTradeCount = trades.ok ? trades.data.length : 0;
  const today = todayInSeoul();
  const last3MonthsStart = calendarMonthsWindowStart(2, today);
  const last3MonthsAmount = trades.ok
    ? trades.data
        .filter((t) => t.trade_date >= last3MonthsStart)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    : 0;
  const suggestedFrequencyLabel = suggestFrequencyLabel(totalTradeCount);
  const suggestedRevenueLabel = suggestRevenueLabel(last3MonthsAmount);
  const averageRevisitDays = trades.ok
    ? averageRevisitIntervalDays(trades.data.map((t) => t.trade_date))
    : null;
  const referrer = referrerResult.ok ? referrerResult.data : null;
  const priceTarget = targetResult.ok ? targetResult.data : null;
  const currentPricePerDon =
    priceResult.ok && priceResult.data
      ? priceResult.data.price_per_don
      : null;
  const channels =
    (c.inflow_channels.length > 0
      ? c.inflow_channels.map((ch) => INFLOW_CHANNEL_LABELS[ch]).join(", ")
      : "없음") + (c.inflow_channel_detail ? ` (${c.inflow_channel_detail})` : "");
  const purposes =
    (c.purchase_purposes.length > 0
      ? c.purchase_purposes.map((p) => PURCHASE_PURPOSE_LABELS[p]).join(", ")
      : "없음") + (c.purchase_purpose_detail ? ` (${c.purchase_purpose_detail})` : "");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{c.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/customers" />}>
            목록으로
          </Button>
          <Button render={<Link href={`/customers/${c.id}/edit`} />}>
            고객 정보 수정
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>고객 정보</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label="이름" value={c.name} />
          <Row label="전화번호" value={c.phone} />
          <Row label="이메일" value={c.email ?? "없음"} />
          <Row
            label="생년월일"
            value={c.birth_date ? formatKoreanDate(c.birth_date) : "없음"}
          />
          <Row label="성별" value={GENDER_LABELS[c.gender]} />
          <Row label="주소" value={c.address ?? "없음"} />
          <Row label="유입 경로" value={channels} />
          <Row label="방문 목적" value={purposes} />
          <Row label="빈도 라벨">
            <span className="flex items-center gap-2">
              {FREQUENCY_LABEL_LABELS[c.frequency_label]}
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                자동 추천: {FREQUENCY_LABEL_LABELS[suggestedFrequencyLabel]}
                (누적 {totalTradeCount}건)
              </span>
            </span>
          </Row>
          <Row label="매출 라벨">
            <span className="flex items-center gap-2">
              {REVENUE_LABEL_LABELS[c.revenue_label]}
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                자동 추천: {REVENUE_LABEL_LABELS[suggestedRevenueLabel]}
                (최근 3개월 매출 기준)
              </span>
            </span>
          </Row>
          <Row label="추천인">
            {referrer ? (
              <Link
                href={`/customers/${referrer.id}`}
                className="text-sm text-primary hover:underline"
              >
                {referrer.name}
              </Link>
            ) : (
              <span className="text-sm">없음</span>
            )}
          </Row>
          <Row label="고객 등록일" value={formatKoreanDate(c.registered_on)} />
          <Row
            label="첫 거래일자"
            value={
              c.first_trade_date ? formatKoreanDate(c.first_trade_date) : "없음"
            }
          />
          <Row
            label="마지막 연락일"
            value={
              c.last_contact_date ? formatKoreanDate(c.last_contact_date) : "없음"
            }
          />
          <Row label="비고" value={c.memo ?? "없음"} />
        </CardContent>
      </Card>

      <MetricsCard
        cumulativeAmount={cumulativeAmount}
        tradeCount={totalTradeCount}
        averageRevisitDays={averageRevisitDays}
        frequencyLabel={c.frequency_label}
        revenueLabel={c.revenue_label}
      />

      <PriceTargetCard
        customerId={c.id}
        target={
          priceTarget
            ? {
                target_price_per_don: priceTarget.target_price_per_don,
                note: priceTarget.note,
              }
            : null
        }
        currentPricePerDon={currentPricePerDon}
        editing={editingTarget}
      />

      {trades.ok ? <HoldingsSummary holdings={holdings} /> : null}

      {trades.ok ? (
        <ProfitCard
          totalWeightGrams={totalHoldingsWeight(holdings)}
          costBasisAmount={String(cumulativeSaleAmount)}
          currentPricePerDon={currentPricePerDon}
          saleAmount={String(cumulativeSaleAmount)}
          purchaseAmount={String(cumulativePurchaseAmount)}
        />
      ) : null}

      <TradeHistorySection customerId={c.id} result={trades} />

      <EventsSection
        customerId={c.id}
        events={eventsResult.ok ? eventsResult.data : []}
        trades={
          trades.ok
            ? trades.data.map((t) => ({
                id: t.id,
                trade_date: t.trade_date,
                trade_type: t.trade_type,
                item_type: t.item_type,
                amount: t.amount,
              }))
            : []
        }
      />
    </main>
  );
}
