import { GRAMS_PER_DON } from "@/lib/prices/target";

/**
 * 고객 상세의 "수익 정보(금 포트폴리오)" 계산 (순수, DB 접근 없음).
 * 원 단위는 정수라 Number 로 다뤄도 안전하지만(README "numeric 값 처리" 참고),
 * 이 값들은 저장하지 않는 참고용 추정치라 g × 시세 곱셈에도 Number 를 쓴다.
 */

export type PortfolioProfit = {
  /** 보유 자산 현재 평가액(원). 시세 정보가 없으면 null. */
  currentValuation: number | null;
  /** 평가손익(원) = 평가액 - 매입원가. 시세 정보가 없으면 null. */
  unrealizedProfit: number | null;
  /** 평가손익률(%). 매입원가가 0이면 null. */
  unrealizedProfitRate: number | null;
};

/**
 * 보유 자산(판매로 고객이 가져간 품목) 평가손익 — 고객 관점.
 * @param totalWeightGrams 보유 중량 합계(g)
 * @param costBasisAmount 매입원가(고객이 실제 지불한 총액, 원)
 * @param currentPricePerDon 오늘 금 1돈 시세(원). 없으면 null.
 */
export function calcPortfolioProfit(
  totalWeightGrams: string,
  costBasisAmount: string,
  currentPricePerDon: string | null,
): PortfolioProfit {
  const weight = Number(totalWeightGrams);
  const cost = Number(costBasisAmount);

  if (currentPricePerDon == null || !Number.isFinite(weight)) {
    return { currentValuation: null, unrealizedProfit: null, unrealizedProfitRate: null };
  }

  const pricePerGram = Number(currentPricePerDon) / GRAMS_PER_DON;
  const currentValuation = Math.round(weight * pricePerGram);
  const unrealizedProfit = currentValuation - cost;
  const unrealizedProfitRate = cost > 0 ? Math.round((unrealizedProfit / cost) * 10000) / 100 : null;

  return { currentValuation, unrealizedProfit, unrealizedProfitRate };
}

/** 매장 입장 거래 수익(원) — 이 고객과의 거래로 매장이 얻은 손익 = 판매 총액 - 매입 총액. */
export function calcStoreProfit(saleAmount: string, purchaseAmount: string): number {
  return Number(saleAmount) - Number(purchaseAmount);
}
