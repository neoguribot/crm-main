"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/input";

/** 숫자만 남겨 1000단위 콤마를 찍는다. "1000" → "1,000" */
export function formatWithCommas(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function reformat(el: HTMLInputElement) {
  const before = el.value;
  const caret = el.selectionStart ?? before.length;
  const digitsBeforeCaret = before.slice(0, caret).replace(/\D/g, "").length;

  const formatted = formatWithCommas(before);
  if (formatted === before) return;
  el.value = formatted;

  let pos = 0;
  let seen = 0;
  while (pos < formatted.length && seen < digitsBeforeCaret) {
    if (/\d/.test(formatted[pos]!)) seen += 1;
    pos += 1;
  }
  try {
    el.setSelectionRange(pos, pos);
  } catch {
    // ignore
  }
}

/**
 * 원화 금액 입력. 입력하는 동안 1000단위 콤마를 자동으로 찍는다.
 * 폼 제출 값에는 콤마가 포함되므로 서버(zod 변환)에서 콤마를 제거한다.
 */
export function MoneyInput({
  className,
  defaultValue,
  onInput,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      data-slot="input"
      className={cn(inputClassName, className)}
      defaultValue={formatWithCommas(String(defaultValue ?? ""))}
      onInput={(e) => {
        reformat(e.currentTarget);
        onInput?.(e);
      }}
    />
  );
}
