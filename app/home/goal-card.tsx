"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { formatWon } from "@/lib/number";
import { updateMonthlySalesGoal } from "@/lib/users/actions";

export function GoalCard({
  monthLabel,
  currentAmount,
  goal,
}: {
  monthLabel: string;
  currentAmount: string;
  goal: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateMonthlySalesGoal, {
    error: null,
  });
  const submittedOnce = useRef(false);

  useEffect(() => {
    if (submittedOnce.current && !pending && state.error === null) {
      setEditing(false);
    }
  }, [pending, state.error]);

  const goalNum = goal ? Number(goal) : null;
  const currentNum = Number(currentAmount);
  const rate = goalNum && goalNum > 0 ? Math.round((currentNum / goalNum) * 1000) / 10 : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{monthLabel} 목표 도달 현황</CardTitle>
        <Button type="button" variant="outline" size="xs" onClick={() => setEditing((s) => !s)}>
          {editing ? "취소" : "목표값 수정"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {editing ? (
          <form
            action={(formData) => {
              submittedOnce.current = true;
              formAction(formData);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <MoneyInput
              name="monthly_sales_goal"
              placeholder="예: 50,000,000"
              defaultValue={goal ?? ""}
            />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
            {state.error ? (
              <p role="alert" className="w-full text-xs text-destructive">
                {state.error}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span>
              현재값: <span className="font-semibold tabular-nums">{formatWon(currentAmount)}</span>
            </span>
            <span>
              목표값:{" "}
              <span className="font-semibold tabular-nums">
                {goal ? formatWon(goal) : "미설정"}
              </span>
            </span>
            <span>
              도달률:{" "}
              <span className="font-semibold tabular-nums">
                {rate !== null ? `${rate}%` : "-"}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
