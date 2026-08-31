import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWon } from "@/lib/number";
import { calcPortfolioProfit, calcStoreProfit } from "@/lib/trades/profit";

function SignedWon({ amount }: { amount: number }) {
  const sign = amount > 0 ? "+" : "";
  const cls = amount > 0 ? "text-primary" : amount < 0 ? "text-destructive" : "";
  return (
    <span className={`tabular-nums font-semibold ${cls}`}>
      {sign}
      {formatWon(String(amount))}
    </span>
  );
}

export function ProfitCard({
  totalWeightGrams,
  costBasisAmount,
  currentPricePerDon,
  saleAmount,
  purchaseAmount,
}: {
  /** 보유 자산 총 중량(g) */
  totalWeightGrams: string;
  /** 매입원가 — 고객이 보유 품목에 실제 지불한 총액(원) */
  costBasisAmount: string;
  currentPricePerDon: string | null;
  /** 이 고객과의 판매 총액(원) */
  saleAmount: string;
  /** 이 고객과의 매입 총액(원) */
  purchaseAmount: string;
}) {
  const portfolio = calcPortfolioProfit(totalWeightGrams, costBasisAmount, currentPricePerDon);
  const storeProfit = calcStoreProfit(saleAmount, purchaseAmount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>수익 정보 (금 포트폴리오)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">
            보유 자산 평가손익 (고객 관점)
          </p>
          {portfolio.currentValuation === null ? (
            <p className="text-sm text-muted-foreground">
              등록된 시세가 없어 평가액을 계산할 수 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span>
                매입원가: <span className="tabular-nums">{formatWon(costBasisAmount)}</span>
              </span>
              <span>
                현재 평가액:{" "}
                <span className="tabular-nums">{formatWon(String(portfolio.currentValuation))}</span>
              </span>
              <span>
                평가손익: <SignedWon amount={portfolio.unrealizedProfit ?? 0} />
                {portfolio.unrealizedProfitRate !== null ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({portfolio.unrealizedProfitRate > 0 ? "+" : ""}
                    {portfolio.unrealizedProfitRate}%)
                  </span>
                ) : null}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">
            매장 거래 수익 (매장 관점)
          </p>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <span>
              판매 총액: <span className="tabular-nums">{formatWon(saleAmount)}</span>
            </span>
            <span>
              매입 총액: <span className="tabular-nums">{formatWon(purchaseAmount)}</span>
            </span>
            <span>
              차익: <SignedWon amount={storeProfit} />
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          참고용 추정치입니다. DB에 저장되지 않으며 매번 조회 시점에 계산합니다.
        </p>
      </CardContent>
    </Card>
  );
}
