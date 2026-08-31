"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { deleteTradeRecord } from "@/app/transactions/actions";

export function DeleteTradeButton({
  tradeId,
  customerId,
}: {
  tradeId: string;
  customerId: string;
}) {
  const action = deleteTradeRecord.bind(null, tradeId, customerId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("이 거래를 삭제할까요? 되돌릴 수 없습니다.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="outline" disabled={pending}>
        삭제
      </Button>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
