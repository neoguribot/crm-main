"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 고객 영역에서 예상하지 못한 오류가 났을 때. 내부 정보는 노출하지 않는다.
 */
export default function CustomersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <Button onClick={reset}>다시 시도</Button>
        </CardContent>
      </Card>
    </main>
  );
}
