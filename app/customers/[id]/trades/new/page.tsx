import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCustomerById } from "@/lib/customers/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { createTradeRecord } from "@/app/customers/[id]/trades/actions";
import { TradeForm } from "@/app/customers/[id]/trades/trade-form";

export const metadata: Metadata = {
  title: "거래 등록",
};

// 인증 사용자별 데이터이므로 정적 캐시에 저장하지 않는다.
export const dynamic = "force-dynamic";

export default async function NewTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  // 없는 ID 또는 다른 사용자의 고객 → 404 와 동일
  const result = await getCustomerById(id);
  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      </main>
    );
  }
  if (!result.data) {
    notFound();
  }

  const createWithId = createTradeRecord.bind(null, id);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">거래 등록</h1>
      <Card>
        <CardHeader>
          <CardTitle>{result.data.name} 고객</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeForm action={createWithId} cancelHref={`/customers/${id}`} />
        </CardContent>
      </Card>
    </main>
  );
}
