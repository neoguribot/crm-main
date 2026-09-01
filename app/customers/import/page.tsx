import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { IMPORT_HEADERS } from "@/app/customers/import/form-state";
import { ImportForm } from "@/app/customers/import/import-form";

export const metadata: Metadata = {
  title: "고객 Excel 불러오기",
};

export const dynamic = "force-dynamic";

// 라우트 핸들러(파일 다운로드)라 <Link> 가 아닌 <a> 로 연결한다.
const TEMPLATE_HREF = "/customers/export?template=1";

export default async function CustomerImportPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">고객 Excel 불러오기</h1>
        <Button variant="outline" render={<Link href="/customers" />}>
          목록으로
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-6 text-sm">
          <div className="flex flex-col gap-2">
            <p className="font-medium">사용 방법</p>
            <ol className="list-decimal pl-5 text-muted-foreground">
              <li>아래 빈 양식을 내려받아 첫 행(헤더)은 그대로 둡니다.</li>
              <li>둘째 행부터 고객 한 명씩 입력합니다.</li>
              <li>
                <strong>이름·연락처</strong>는 필수입니다. 연락처가 이미 있는
                고객은 자동으로 건너뜁니다.
              </li>
              <li>
                성별·유입경로·방문목적·빈도·매출 라벨은 목록 화면에 보이는 한글
                그대로 적습니다. 여러 개는 쉼표로 구분합니다.
              </li>
            </ol>
          </div>

          <Button
            variant="outline"
            className="self-start"
            render={<a href={TEMPLATE_HREF}>빈 양식 내려받기</a>}
          />

          <p className="text-xs text-muted-foreground">
            양식 열 순서: {IMPORT_HEADERS.join(" · ")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <ImportForm />
        </CardContent>
      </Card>
    </main>
  );
}
