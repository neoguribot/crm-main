"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 라우트 세그먼트에서 처리되지 않은 오류의 최종 처리.
 * 내부 메시지·스택은 화면에 노출하지 않는다.
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <h1 className="text-lg font-semibold">문제가 발생했습니다</h1>
          <p className="text-sm text-muted-foreground">
            잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.
          </p>
          <Button onClick={reset}>다시 시도</Button>
        </CardContent>
      </Card>
    </main>
  );
}
