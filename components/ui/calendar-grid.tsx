"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  isInMonth,
  monthGridWeeks,
  monthLabel,
  nextMonth,
  prevMonth,
  WEEKDAY_LABELS,
  type YearMonth,
} from "@/lib/calendar";
import { todayInSeoul } from "@/lib/date";

/** 날짜 선택용 순수 달력 그리드. 값 선택 시 `YYYY-MM-DD` 를 돌려준다. */
export function CalendarGrid({
  value,
  onSelect,
  className,
}: {
  value: string | null;
  onSelect: (iso: string) => void;
  className?: string;
}) {
  const today = todayInSeoul();
  const initial: YearMonth = (() => {
    const [y, m] = (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today)
      .split("-")
      .map(Number);
    return { year: y, month: m };
  })();
  const [ym, setYm] = useState<YearMonth>(initial);

  const weeks = monthGridWeeks(ym);

  return (
    <div className={cn("flex w-64 flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYm(prevMonth(ym))}
          className="rounded-md p-1 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="이전 달"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel(ym)}</span>
        <button
          type="button"
          onClick={() => setYm(nextMonth(ym))}
          className="rounded-md p-1 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="다음 달"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day) => {
          const inMonth = isInMonth(day, ym);
          const isToday = day === today;
          const isSelected = day === value;
          const dayNum = Number(day.slice(-2));
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-sm tabular-nums outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
                inMonth ? "" : "text-muted-foreground/40",
                isToday && !isSelected ? "font-semibold text-primary" : "",
                isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : "",
              )}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
