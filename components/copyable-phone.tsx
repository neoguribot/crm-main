"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** 연락처를 클릭하면 클립보드로 복사한다. 전화 걸기·문자 발송은 하지 않는다. */
export function CopyablePhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 불가 시 조용히 무시 (번호 텍스트는 그대로 보임)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-label={`연락처 ${phone} 복사`}
      title="클릭하여 복사"
      className="h-auto px-1.5 py-0.5 font-normal tabular-nums"
    >
      <span aria-hidden={copied}>{phone}</span>
      <span className="ml-1 text-xs text-muted-foreground" aria-live="polite">
        {copied ? "복사됨" : ""}
      </span>
    </Button>
  );
}
