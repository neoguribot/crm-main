import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWon } from "@/lib/number";
import { FREQUENCY_LABEL_LABELS, REVENUE_LABEL_LABELS } from "@/lib/labels";
import type { FrequencyLabel, RevenueLabel } from "@/lib/types/database";

/** 차트 없이 숫자/텍스트로만 보여주는 지표 카드(원본 요구사항: 불필요한 차트·색상 최소화). */
export function MetricsCard({
  cumulativeAmount,
  tradeCount,
  averageRevisitDays,
  frequencyLabel,
  revenueLabel,
}: {
  /** 누적 매출액(전체 기간, 판매+매입 합산) */
  cumulativeAmount: number;
  tradeCount: number;
  averageRevisitDays: number | null;
  frequencyLabel: FrequencyLabel;
  revenueLabel: RevenueLabel;
}) {
  const items: { label: string; value: string }[] = [
    { label: "누적 매출액", value: formatWon(String(cumulativeAmount)) },
    { label: "거래 횟수", value: `${tradeCount.toLocaleString("ko-KR")}건` },
    {
      label: "평균 재방문 주기",
      value: averageRevisitDays !== null ? `${averageRevisitDays}일` : "-",
    },
    { label: "빈도 라벨", value: FREQUENCY_LABEL_LABELS[frequencyLabel] },
    { label: "매출 라벨", value: REVENUE_LABEL_LABELS[revenueLabel] },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>지표</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
