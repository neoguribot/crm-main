"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { saveGoldPrice, type PriceActionState } from "@/lib/prices/actions";
import { isoTimestampToSeoulDateTime } from "@/lib/date";
import { formatPricePerDon } from "@/lib/prices/target";

const initial: PriceActionState = { ok: false, error: null };

export function GoldPriceForm({
  latestPrice,
}: {
  /** 가장 최근 등록된 시세 */
  latestPrice: { price_per_don: string; registered_at: string } | null;
}) {
  const [state, action, pending] = useActionState(saveGoldPrice, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>금 시세 등록</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          순금(24K) 1돈(3.75g) 기준, 원. 저장할 때마다 새 이력으로 쌓이며,
          매수 희망 가격에 도달한 고객을 찾아 알림을 만듭니다.
        </p>

        {latestPrice ? (
          <p className="text-sm text-muted-foreground">
            최근 등록({isoTimestampToSeoulDateTime(latestPrice.registered_at)}):{" "}
            <span className="tabular-nums text-foreground">
              {formatPricePerDon(latestPrice.price_per_don)}
            </span>
          </p>
        ) : null}

        <form action={action} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price_per_don">시세 (원/돈)</Label>
            <MoneyInput
              id="price_per_don"
              name="price_per_don"
              required
              placeholder="예: 588,750"
              className="w-40"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "새 시세 등록"}
          </Button>
        </form>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-primary">
            등록되었습니다.
            {state.newAlerts && state.newAlerts > 0
              ? ` 새 알림 ${state.newAlerts}건이 생성되었습니다.`
              : " 새로 도달한 목표가격은 없습니다."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
