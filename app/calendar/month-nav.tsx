"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { monthLabel, type YearMonth } from "@/lib/calendar";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function monthHref(ym: YearMonth): string {
  return `/calendar?year=${ym.year}&month=${ym.month}`;
}

/** 캘린더 헤더의 연월 표시. 클릭하면 연도/월을 바로 골라 이동할 수 있다. */
export function MonthNav({ ym }: { ym: YearMonth }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(ym.year);

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) setPickerYear(ym.year); }}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="min-w-24 text-center text-sm font-medium" />
        }
      >
        {monthLabel(ym)}
      </PopoverTrigger>
      <PopoverContent align="center" className="w-56">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerYear((y) => y - 1)}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:bg-muted"
            >
              이전 해
            </button>
            <span className="text-sm font-semibold tabular-nums">{pickerYear}년</span>
            <button
              type="button"
              onClick={() => setPickerYear((y) => y + 1)}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:bg-muted"
            >
              다음 해
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((m) => {
              const isCurrent = pickerYear === ym.year && m === ym.month;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(monthHref({ year: pickerYear, month: m }), {
                      scroll: false,
                    });
                  }}
                  className={`rounded-md py-1.5 text-sm tabular-nums outline-none hover:bg-muted ${
                    isCurrent ? "bg-primary text-primary-foreground hover:bg-primary" : ""
                  }`}
                >
                  {m}월
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
