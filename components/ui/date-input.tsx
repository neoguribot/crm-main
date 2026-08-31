"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/input";

/** 숫자만 남겨 `YYYY-MM-DD` 로 마스킹한다. "20260110" → "2026-01-10" */
export function maskIsoDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

/**
 * 날짜 입력(년-월-일). 네이티브 date 입력은 브라우저 로케일에 따라
 * 월/일/년 순으로 표시되므로, 숫자 입력을 받아 `YYYY-MM-DD` 로 자동 정리한다.
 * 서버 검증(isValidIsoDate)은 그대로 `YYYY-MM-DD` 를 받는다.
 */
export function DateInput({
  className,
  defaultValue,
  onInput,
  ref,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      data-slot="input"
      placeholder="YYYY-MM-DD"
      pattern="\d{4}-\d{2}-\d{2}"
      title="년-월-일 순서로 입력하세요. 예: 2026-01-10"
      maxLength={10}
      className={cn(inputClassName, className)}
      defaultValue={maskIsoDate(String(defaultValue ?? ""))}
      onInput={(e) => {
        const el = e.currentTarget;
        const next = maskIsoDate(el.value);
        if (next !== el.value) el.value = next;
        onInput?.(e);
      }}
    />
  );
}
