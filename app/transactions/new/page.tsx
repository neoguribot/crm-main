import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPTY_FILTERS } from "@/lib/customers/filters";
import { searchCustomers } from "@/lib/customers/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { NewTransactionForm } from "@/app/transactions/new/new-transaction-form";

export const metadata: Metadata = {
  title: "신규 거래 등록",
};

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  await requireUser();

  const result = await searchCustomers(EMPTY_FILTERS);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">신규 거래 등록</h1>
      <Card>
        <CardHeader>
          <CardTitle>거래 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {!result.ok ? (
            <p className="py-6 text-center text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              먼저 고객을 등록해 주세요.
            </p>
          ) : (
            <NewTransactionForm
              customers={result.data.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
