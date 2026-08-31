import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTradeRecordById } from "@/lib/trades/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { TradeForm } from "@/app/customers/[id]/trades/trade-form";
import { updateTradeRecord } from "@/app/transactions/actions";
import { DeleteTradeButton } from "@/app/transactions/[id]/delete-trade-button";

export const metadata: Metadata = {
  title: "거래 상세",
};

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const result = await getTradeRecordById(id);

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

  const t = result.data;
  const action = updateTradeRecord.bind(null, t.id, t.customer_id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">거래 상세</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/customers/${t.customer_id}`} className="hover:underline">
              {t.customer_name}
            </Link>{" "}
            · {t.customer_phone}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/transactions" />}>
            목록으로
          </Button>
          <DeleteTradeButton tradeId={t.id} customerId={t.customer_id} />
        </div>
      </div>

      <TradeForm
        action={action}
        cancelHref="/transactions"
        submitLabel="거래 수정"
        defaults={{
          trade_date: t.trade_date,
          trade_type: t.trade_type,
          item_type: t.item_type,
          item_detail: t.item_detail,
          unit_price: t.unit_price,
          weight: t.weight,
          amount: t.amount,
          status: t.status,
          memo: t.memo,
        }}
      />
    </main>
  );
}
