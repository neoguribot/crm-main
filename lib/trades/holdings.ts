import { ITEM_TYPES, type ItemType } from "@/lib/types/database";
import { sumDecimalStrings } from "@/lib/number";

export type ItemHolding = {
  itemType: ItemType;
  /** 그 품목의 판매(SALE) 거래 중량 합계(g), 소수점 최대 3자리 문자열 */
  totalWeight: string;
  /** 참고용: 판매 거래 건수 */
  count: number;
};

type TradeLike = { trade_type: string; item_type: string; weight: string };

/**
 * 고객이 매장에서 구매(SALE)한 거래를 품목별 **중량 합계**로 집계한다.
 * - 매입(PURCHASE, 매장이 고객에게서 사들인 것)은 "보유" 로 세지 않는다.
 * - 합계가 0(품목 자체가 없음)인 경우는 제외. 결과 순서는 ITEM_TYPES 순서를 따른다.
 */
export function summarizeHoldings(
  trades: readonly TradeLike[],
): ItemHolding[] {
  const weightsByType = new Map<ItemType, string[]>();
  const countByType = new Map<ItemType, number>();

  for (const t of trades) {
    if (t.trade_type !== "SALE") continue;
    if (!(ITEM_TYPES as readonly string[]).includes(t.item_type)) continue;
    const it = t.item_type as ItemType;
    const list = weightsByType.get(it) ?? [];
    list.push(t.weight);
    weightsByType.set(it, list);
    countByType.set(it, (countByType.get(it) ?? 0) + 1);
  }

  return ITEM_TYPES.filter((it) => weightsByType.has(it)).map((it) => ({
    itemType: it,
    totalWeight: sumDecimalStrings(weightsByType.get(it) ?? [], 3),
    count: countByType.get(it) ?? 0,
  }));
}

/** 보유 품목 총 중량(g) 합계. */
export function totalHoldingsWeight(holdings: readonly ItemHolding[]): string {
  return sumDecimalStrings(
    holdings.map((h) => h.totalWeight),
    3,
  );
}
