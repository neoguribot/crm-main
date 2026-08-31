"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  deletePriceTarget,
  savePriceTarget,
  type PriceActionState,
} from "@/lib/prices/actions";
import {
  formatGapPercent,
  formatPricePerDon,
  isTargetReached,
  targetGapPercent,
} from "@/lib/prices/target";

const initial: PriceActionState = { ok: false, error: null };

export function PriceTargetCard({
  customerId,
  target,
  currentPricePerDon,
  editing,
}: {
  customerId: string;
  target: { target_price_per_don: string; note: string | null } | null;
  currentPricePerDon: string | null;
  /** URL ?editTarget=1 로 편집 모드 진입 */
  editing: boolean;
}) {
  const [saveState, saveAction, saving] = useActionState(
    savePriceTarget.bind(null, customerId),
    initial,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deletePriceTarget.bind(null, customerId),
    initial,
  );

  const showForm = target === null || editing;

  const reached =
    target && currentPricePerDon
      ? isTargetReached(target.target_price_per_don, currentPricePerDon)
      : false;
  const gap =
    target && currentPricePerDon
      ? targetGapPercent(target.target_price_per_don, currentPricePerDon)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객 목표가격</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {target && !showForm ? (
          <>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">매수 희망</dt>
                <dd className="text-base font-semibold tabular-nums">
                  {formatPricePerDon(target.target_price_per_don)}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">현재</dt>
                <dd className="text-base font-semibold tabular-nums">
                  {currentPricePerDon
                    ? formatPricePerDon(currentPricePerDon)
                    : "시세 미입력"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">차이</dt>
                <dd
                  className={
                    "text-base font-semibold tabular-nums " +
                    (reached ? "text-primary" : "text-muted-foreground")
                  }
                >
                  {formatGapPercent(gap)}
                </dd>
              </div>
            </dl>

            {reached ? (
              <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                🔔 매수 희망 가격에 도달했습니다. 전화 상담을 추천합니다.
              </p>
            ) : null}

            {target.note ? (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                메모: {target.note}
              </p>
            ) : null}

            {!currentPricePerDon ? (
              <p className="text-xs text-muted-foreground">
                현재 시세는{" "}
                <Link href="/prices" className="underline">
                  시세 관리
                </Link>{" "}
                에서 입력합니다.
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    href={`/customers/${customerId}?editTarget=1`}
                    scroll={false}
                  />
                }
              >
                수정
              </Button>
              <form action={deleteAction}>
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={deleting}
                >
                  삭제
                </Button>
              </form>
            </div>
            {deleteState.error ? (
              <p className="text-sm text-destructive">{deleteState.error}</p>
            ) : null}
          </>
        ) : (
          <form action={saveAction} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              상담 중 들은 매수 희망 가격을 등록합니다. 금 1돈(3.75g) 기준, 원.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target_price_per_don">매수 희망 (원/돈)</Label>
              <MoneyInput
                id="target_price_per_don"
                name="target_price_per_don"
                required
                placeholder="예: 581,250"
                defaultValue={target?.target_price_per_don ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target_note">메모 (선택)</Label>
              <Input
                id="target_note"
                name="note"
                placeholder="예: 돌반지 세트 구매 예정"
                defaultValue={target?.note ?? ""}
              />
            </div>
            {saveState.error ? (
              <p className="text-sm text-destructive">{saveState.error}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "저장 중…" : "저장"}
              </Button>
              {target ? (
                <Button
                  size="sm"
                  variant="ghost"
                  render={<Link href={`/customers/${customerId}`} scroll={false} />}
                >
                  취소
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
