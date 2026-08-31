"use client";

import { useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/ui/calendar-grid";
import { DateInput, maskIsoDate } from "@/components/ui/date-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 텍스트 입력(YYYY-MM-DD)과 달력 팝오버를 함께 제공하는 날짜 필드. */
export function CalendarDateField({
  id,
  name,
  defaultValue,
  required,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(maskIsoDate(String(defaultValue ?? "")));

  return (
    <div className={className ? className : "flex gap-1.5"}>
      <DateInput
        ref={inputRef}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        onInput={(e) => setDisplay(e.currentTarget.value)}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="달력에서 날짜 선택"
            />
          }
        >
          <CalendarIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end">
          <CalendarGrid
            value={ISO_DATE_RE.test(display) ? display : null}
            onSelect={(iso) => {
              if (inputRef.current) {
                inputRef.current.value = iso;
              }
              setDisplay(iso);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
