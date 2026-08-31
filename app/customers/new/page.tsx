import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EMPTY_FILTERS } from "@/lib/customers/filters";
import { searchCustomers } from "@/lib/customers/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { createCustomer } from "@/app/customers/actions";
import { CustomerForm } from "@/app/customers/customer-form";

export const metadata: Metadata = {
  title: "신규 고객 등록",
};

// 인증 사용자별 데이터이므로 정적 캐시에 저장하지 않는다.
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requireUser();

  const customersResult = await searchCustomers(EMPTY_FILTERS);
  const referrerCandidates = customersResult.ok
    ? customersResult.data.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
    : [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">신규 고객 등록</h1>
      <Card>
        <CardHeader>
          <CardTitle>고객 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            action={createCustomer}
            submitLabel="등록"
            cancelHref="/customers"
            referrerCandidates={referrerCandidates}
          />
        </CardContent>
      </Card>
    </main>
  );
}
