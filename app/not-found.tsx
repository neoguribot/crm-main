import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HOME_PATH } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <h1 className="text-lg font-semibold">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm text-muted-foreground">
            주소가 잘못되었거나 접근 권한이 없는 페이지입니다.
          </p>
          <Link href={HOME_PATH} className={buttonVariants()}>
            홈으로 이동
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
