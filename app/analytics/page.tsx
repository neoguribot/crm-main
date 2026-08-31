import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { getCustomerAnalytics } from "@/lib/analytics/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { AnalyticsView } from "@/app/analytics/analytics-view";

export const metadata: Metadata = {
  title: "종합 분석",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireUser();

  const result = await getCustomerAnalytics();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">종합 분석</h1>
        <p className="text-sm text-muted-foreground">
          {result.ok
            ? `전체 고객 ${result.data.customerCount.toLocaleString("ko-KR")}명 기준`
            : ""}
        </p>
      </div>

      {!result.ok ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : (
        <AnalyticsView data={result.data} />
      )}
    </main>
  );
}
