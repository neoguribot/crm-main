"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatKoreanDate } from "@/lib/date";
import { formatWon } from "@/lib/number";
import { ITEM_TYPE_LABELS, TRADE_TYPE_LABELS } from "@/lib/labels";
import type { ItemType, TradeType } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type PickerTrade = {
  id: string;
  trade_date: string;
  trade_type: TradeType;
  item_type: ItemType;
  amount: string;
};

/** 거래 1건을 "매입 · 24K" 형태로. */
function tradeLabel(t: PickerTrade): string {
  return `${TRADE_TYPE_LABELS[t.trade_type]} · ${
    ITEM_TYPE_LABELS[t.item_type] ?? t.item_type
  }`;
}

const rowClass = (active: boolean) =>
  cn(
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted",
    active && "bg-muted font-medium",
  );

/** 같은 날짜에 거래가 여러 건일 때: 행에 마우스를 올리면 옆으로 상세 팝업. */
function MultiDateRow({
  date,
  trades,
  value,
  onPick,
}: {
  date: string;
  trades: PickerTrade[];
  value: string | null;
  onPick: (id: string) => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    const r = rowRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top, left: r.right + 6 });
  };
  const hideSoon = () => {
    timer.current = setTimeout(() => setPos(null), 150);
  };

  const hasSelected = trades.some((t) => t.id === value);

  return (
    <li onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={rowRef}
        type="button"
        className={rowClass(hasSelected)}
        onClick={() => (pos ? setPos(null) : show())}
        aria-expanded={pos !== null}
      >
        <span>{formatKoreanDate(date)}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {trades.length}건
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </span>
      </button>

      {pos !== null
        ? createPortal(
            <div
              className="fixed z-[60] w-max min-w-56 rounded-lg border bg-popover p-1 text-sm shadow-md"
              style={{ top: pos.top, left: pos.left }}
              onMouseEnter={show}
              onMouseLeave={hideSoon}
            >
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {formatKoreanDate(date)} · {trades.length}건
              </p>
              <ul className="flex flex-col">
                {trades.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={cn(
                        rowClass(t.id === value),
                        "justify-between gap-4",
                      )}
                      onClick={() => onPick(t.id)}
                    >
                      <span>{tradeLabel(t)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatWon(t.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </li>
  );
}

/**
 * 일정에 연동할 거래를 고르는 드롭다운.
 * - 날짜 하나당 대표 행 1개. 같은 날짜에 여러 건이면 행 위에 마우스를 올려
 *   매입/판매 · 품목 · 금액으로 구분된 목록을 옆 팝업으로 본다.
 * - 선택값은 hidden input(`name`)으로 폼에 전달된다.
 */
export function RelatedTradePicker({
  name,
  trades,
  value,
  onChange,
}: {
  name: string;
  trades: PickerTrade[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const byDate = new Map<string, PickerTrade[]>();
  for (const t of trades) {
    const list = byDate.get(t.trade_date) ?? [];
    list.push(t);
    byDate.set(t.trade_date, list);
  }
  const dates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1));

  const selected = trades.find((t) => t.id === value) ?? null;

  function pick(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <span className={selected ? "" : "text-muted-foreground"}>
                {selected
                  ? `${formatKoreanDate(selected.trade_date)} · ${tradeLabel(selected)}`
                  : "선택 안 함"}
              </span>
              <ChevronDownIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
          }
        />
        <PopoverContent
          align="start"
          className="max-h-72 w-(--anchor-width) min-w-64 overflow-y-auto p-1"
        >
          <ul className="flex flex-col text-sm">
            <li>
              <button
                type="button"
                className={rowClass(value === null)}
                onClick={() => pick(null)}
              >
                선택 안 함
              </button>
            </li>
            {dates.map((d) => {
              const list = byDate.get(d)!;
              if (list.length === 1) {
                const t = list[0];
                return (
                  <li key={d}>
                    <button
                      type="button"
                      className={rowClass(t.id === value)}
                      onClick={() => pick(t.id)}
                    >
                      <span>{formatKoreanDate(d)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {tradeLabel(t)}
                      </span>
                    </button>
                  </li>
                );
              }
              return (
                <MultiDateRow
                  key={d}
                  date={d}
                  trades={list}
                  value={value}
                  onPick={pick}
                />
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </>
  );
}
