"use client";

import { CustomerCombobox } from "@/components/customer-combobox";
import { Label } from "@/components/ui/label";
import { TradeForm } from "@/app/customers/[id]/trades/trade-form";
import { createTradeRecordStandalone } from "@/app/transactions/actions";

export function NewTransactionForm({
  customers,
}: {
  customers: { id: string; name: string; phone: string }[];
}) {
  return (
    <TradeForm
      action={createTradeRecordStandalone}
      cancelHref="/transactions"
      submitLabel="거래 등록"
      beforeFields={
        <div className="flex flex-col gap-1.5">
          <Label>
            고객 <span className="text-destructive">*</span>
          </Label>
          <CustomerCombobox
            name="customer_id"
            candidates={customers}
            required
            placeholder="이름 또는 전화번호로 검색"
          />
        </div>
      }
    />
  );
}
