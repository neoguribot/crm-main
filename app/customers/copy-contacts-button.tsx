"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 현재 필터링된 고객 목록의 "이름 전화번호"를 줄바꿈으로 묶어 클립보드에 복사한다.
 * 문자 발송 등에 바로 붙여넣어 쓸 수 있도록. 새 테이블·백엔드 불필요.
 */
export function CopyContactsButton({
  customers,
}: {
  customers: { name: string; phone: string }[];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = customers.map((c) => `${c.name} ${c.phone}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 불가 시 조용히 무시
    }
  }

  if (customers.length === 0) return null;

  return (
    <Button type="button" variant="outline" onClick={copy}>
      연락처 복사 ({customers.length}명){copied ? " · 복사됨" : ""}
    </Button>
  );
}
