"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CalendarDateField } from "@/components/ui/calendar-date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ITEM_TYPE_LABELS,
  TRADE_STATUS_LABELS,
  TRADE_TYPE_LABELS,
} from "@/lib/labels";
import {
  ITEM_TYPES,
  TRADE_STATUSES,
  TRADE_TYPES,
  isPurchaseOnlyItemType,
} from "@/lib/types/database";
import {
  initialTradeFormState,
  type TradeFormState,
} from "@/app/customers/[id]/trades/form-state";

type Action = (
  state: TradeFormState,
  formData: FormData,
) => Promise<TradeFormState>;

type TradeDefaults = {
  trade_date: string;
  trade_type: string;
  item_type: string;
  item_detail: string | null;
  unit_price: string | null;
  weight: string;
  amount: string;
  status: string;
  memo: string | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function TradeForm({
  action,
  cancelHref,
  submitLabel = "거래 등록",
  defaults,
  beforeFields,
}: {
  action: Action;
  cancelHref: string;
  submitLabel?: string;
  defaults?: TradeDefaults;
  /** 거래일 필드 앞에 끼워넣을 추가 필드(예: 고객 선택). */
  beforeFields?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialTradeFormState,
  );

  const v = state.values;
  const e = state.fieldErrors;

  const val = (key: keyof TradeDefaults) =>
    (v as Record<string, unknown> | null)?.[key] as string | undefined ??
    (defaults ? (defaults[key] ?? "") : "");

  const [tradeType, setTradeType] = useState<string>(val("trade_type") || "");
  const [itemType, setItemType] = useState<string>(val("item_type") || "");
  const [status, setStatus] = useState<string>(val("status") || "DONE");

  // 매입일 때만 매입 전용 품목을 노출한다.
  const itemOptions = useMemo(
    () =>
      ITEM_TYPES.filter(
        (it) => tradeType === "PURCHASE" || !isPurchaseOnlyItemType(it),
      ),
    [tradeType],
  );
  const itemItems = useMemo(
    () =>
      Object.fromEntries(itemOptions.map((it) => [it, ITEM_TYPE_LABELS[it]])),
    [itemOptions],
  );

  function onTradeTypeChange(next: string) {
    setTradeType(next);
    // 판매로 바꿨는데 현재 품목이 매입 전용이면 초기화
    if (next === "SALE" && isPurchaseOnlyItemType(itemType)) {
      setItemType("");
    }
  }

  const showDetail = itemType === "OTHER";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {beforeFields}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trade_date">
          거래일 <span className="text-destructive">*</span>
        </Label>
        <CalendarDateField
          id="trade_date"
          name="trade_date"
          defaultValue={val("trade_date")}
          required
        />
        <FieldError message={e.trade_date} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          거래구분 <span className="text-destructive">*</span>
        </Label>
        <Select
          name="trade_type"
          items={TRADE_TYPE_LABELS}
          value={tradeType || undefined}
          onValueChange={(next) => onTradeTypeChange(String(next))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="선택해 주세요" />
          </SelectTrigger>
          <SelectContent>
            {TRADE_TYPES.map((code) => (
              <SelectItem key={code} value={code}>
                {TRADE_TYPE_LABELS[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={e.trade_type} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          거래 품목 <span className="text-destructive">*</span>
        </Label>
        <Select
          name="item_type"
          items={itemItems}
          value={itemType || undefined}
          onValueChange={(next) => setItemType(String(next))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="선택해 주세요" />
          </SelectTrigger>
          <SelectContent>
            {itemOptions.map((code) => (
              <SelectItem key={code} value={code}>
                {ITEM_TYPE_LABELS[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tradeType !== "PURCHASE" ? (
          <p className="text-xs text-muted-foreground">
            은수저·치금은 매입 거래에서만 선택할 수 있습니다.
          </p>
        ) : null}
        <FieldError message={e.item_type} />
      </div>

      {showDetail ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item_detail">
            기타 세부 내용 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="item_detail"
            name="item_detail"
            type="text"
            placeholder="예: 백금 반지"
            defaultValue={val("item_detail")}
          />
          <FieldError message={e.item_detail} />
        </div>
      ) : (
        <input type="hidden" name="item_detail" value="" />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit_price">
          기준 단가 (원) <span className="text-destructive">*</span>
        </Label>
        <MoneyInput
          id="unit_price"
          name="unit_price"
          placeholder="예: 155,000"
          defaultValue={val("unit_price")}
          required
        />
        <FieldError message={e.unit_price} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="weight">
          중량 (g) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="weight"
          name="weight"
          type="text"
          inputMode="decimal"
          placeholder="예: 3.75"
          defaultValue={val("weight")}
          required
        />
        <FieldError message={e.weight} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">
          총 금액 (원) <span className="text-destructive">*</span>
        </Label>
        <MoneyInput
          id="amount"
          name="amount"
          placeholder="예: 581,250"
          defaultValue={val("amount")}
          required
        />
        <FieldError message={e.amount} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          완료 여부 <span className="text-destructive">*</span>
        </legend>
        <div className="flex gap-4">
          {TRADE_STATUSES.map((code) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="status"
                value={code}
                checked={status === code}
                onChange={() => setStatus(code)}
              />
              {TRADE_STATUS_LABELS[code]}
            </label>
          ))}
        </div>
        <FieldError message={e.status} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="memo">비고</Label>
        <Textarea id="memo" name="memo" rows={3} defaultValue={val("memo")} />
        <FieldError message={e.memo} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          render={<Link href={cancelHref} />}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
