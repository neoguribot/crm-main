"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { isoTimestampToSeoulDateTime } from "@/lib/date";
import { formatWon } from "@/lib/number";
import type { GoldPriceListItem } from "@/lib/prices/queries";
import { deleteGoldPrice, updateGoldPrice } from "@/lib/prices/actions";

function PriceRow({ item }: { item: GoldPriceListItem }) {
  const [editing, setEditing] = useState(false);
  const updateAction = updateGoldPrice.bind(null, item.id);
  const deleteAction = deleteGoldPrice.bind(null, item.id);
  const [updateState, updateFormAction, updatePending] = useActionState(updateAction, {
    ok: false,
    error: null,
  });
  const [, deleteFormAction] = useActionState(deleteAction, { ok: false, error: null });

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
        <span className="w-28 shrink-0 tabular-nums text-muted-foreground">
          {isoTimestampToSeoulDateTime(item.registered_at)}
        </span>
        <form action={updateFormAction} className="flex items-center gap-2">
          <MoneyInput
            name="price_per_don"
            defaultValue={item.price_per_don}
            className="w-32"
          />
          <Button type="submit" size="xs" disabled={updatePending}>
            저장
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => setEditing(false)}>
            취소
          </Button>
        </form>
        {updateState.error ? (
          <p role="alert" className="w-full text-xs text-destructive">
            {updateState.error}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span className="flex items-center gap-3">
        <span className="w-28 shrink-0 tabular-nums text-muted-foreground">
          {isoTimestampToSeoulDateTime(item.registered_at)}
        </span>
        <span className="tabular-nums font-medium">{formatWon(item.price_per_don)}</span>
      </span>
      <span className="flex gap-2">
        <Button type="button" variant="outline" size="xs" onClick={() => setEditing(true)}>
          수정
        </Button>
        <form action={deleteFormAction}>
          <Button type="submit" variant="outline" size="xs">
            삭제
          </Button>
        </form>
      </span>
    </li>
  );
}

export function PriceHistory({ items }: { items: GoldPriceListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>시세 이력</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            등록된 시세가 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <PriceRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
