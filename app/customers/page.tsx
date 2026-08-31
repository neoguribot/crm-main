import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatKoreanDate } from "@/lib/date";
import { searchCustomers } from "@/lib/customers/queries";
import {
  hasActiveFilters,
  parseCustomerFilters,
} from "@/lib/customers/filters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FREQUENCY_LABEL_LABELS,
  PURCHASE_PURPOSE_LABELS,
  REVENUE_LABEL_BADGE_CLASS,
  REVENUE_LABEL_LABELS,
} from "@/lib/labels";
import { requireUser } from "@/lib/supabase/require-user";
import { AppliedFilters } from "@/app/customers/applied-filters";
import { CopyContactsButton } from "@/app/customers/copy-contacts-button";
import { CustomerFilterBar } from "@/app/customers/customer-filter-bar";
import { DeleteCustomerButton } from "@/app/customers/delete-customer-button";

export const metadata: Metadata = {
  title: "고객 목록",
};

// 인증 사용자별 데이터이므로 정적 캐시에 저장하지 않는다.
export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();

  const filters = parseCustomerFilters(await searchParams);
  const active = hasActiveFilters(filters);
  const result = await searchCustomers(filters);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">고객 목록</h1>
        <Button render={<Link href="/customers/new" />}>신규 고객 등록</Button>
      </div>

      <CustomerFilterBar filters={filters} />
      <AppliedFilters filters={filters} />

      {!result.ok ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            {active ? (
              <>
                <p className="text-sm text-muted-foreground">
                  조건에 맞는 고객이 없습니다.
                </p>
                <Button
                  variant="outline"
                  render={<Link href="/customers" />}
                >
                  필터 초기화
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  아직 등록된 고객이 없습니다.
                </p>
                <Button render={<Link href="/customers/new" />}>
                  첫 고객 등록하기
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              총 {result.data.length}명
            </p>
            <CopyContactsButton
              customers={result.data.map((c) => ({ name: c.name, phone: c.phone }))}
            />
          </div>
          <ul className="flex flex-col gap-2">
            {result.data.map((customer) => (
              <li key={customer.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="rounded font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {customer.name}
                      </Link>
                      <Badge variant="outline" className="font-normal">
                        {FREQUENCY_LABEL_LABELS[customer.frequency_label]}
                      </Badge>
                      <Badge
                        className={cn(
                          "font-normal",
                          REVENUE_LABEL_BADGE_CLASS[customer.revenue_label],
                        )}
                      >
                        {REVENUE_LABEL_LABELS[customer.revenue_label]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {customer.phone}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          render={<Link href={`/customers/${customer.id}`} />}
                        >
                          상세
                        </Button>
                        <DeleteCustomerButton
                          customerId={customer.id}
                          customerName={customer.name}
                          size="xs"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                      <span className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-muted-foreground">방문 목적</span>
                        {customer.purchase_purposes.length > 0
                          ? customer.purchase_purposes
                              .map((p) => PURCHASE_PURPOSE_LABELS[p])
                              .join(", ")
                          : "없음"}
                      </span>
                      <span className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-muted-foreground">마지막 연락</span>
                        {customer.last_contact_date
                          ? formatKoreanDate(customer.last_contact_date)
                          : "없음"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
