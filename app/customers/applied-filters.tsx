import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FREQUENCY_LABEL_LABELS,
  INFLOW_CHANNEL_LABELS,
  PURCHASE_PURPOSE_LABELS,
  REVENUE_LABEL_LABELS,
} from "@/lib/labels";
import {
  buildCustomerSearchParams,
  hasActiveFilters,
  type CustomerFilters,
} from "@/lib/customers/filters";

/** 적용 중인 필터를 Badge 로 보여준다. 각 Badge 의 x 는 해당 조건만 해제한다. */
export function AppliedFilters({ filters }: { filters: CustomerFilters }) {
  if (!hasActiveFilters(filters)) return null;

  const chips: { key: string; label: string; next: CustomerFilters }[] = [];

  if (filters.q) {
    chips.push({
      key: "q",
      label: `검색: "${filters.q}"`,
      next: { ...filters, q: "" },
    });
  }
  for (const p of filters.purposes) {
    chips.push({
      key: `purpose-${p}`,
      label: `방문 목적: ${PURCHASE_PURPOSE_LABELS[p]}`,
      next: { ...filters, purposes: filters.purposes.filter((x) => x !== p) },
    });
  }
  for (const c of filters.channels) {
    chips.push({
      key: `channel-${c}`,
      label: `유입 경로: ${INFLOW_CHANNEL_LABELS[c]}`,
      next: { ...filters, channels: filters.channels.filter((x) => x !== c) },
    });
  }
  for (const f of filters.frequencyLabels) {
    chips.push({
      key: `frequencyLabel-${f}`,
      label: `빈도 라벨: ${FREQUENCY_LABEL_LABELS[f]}`,
      next: {
        ...filters,
        frequencyLabels: filters.frequencyLabels.filter((x) => x !== f),
      },
    });
  }
  for (const r of filters.revenueLabels) {
    chips.push({
      key: `revenueLabel-${r}`,
      label: `매출 라벨: ${REVENUE_LABEL_LABELS[r]}`,
      next: {
        ...filters,
        revenueLabels: filters.revenueLabels.filter((x) => x !== r),
      },
    });
  }
  if (filters.visitFrom || filters.visitTo) {
    const range = `${filters.visitFrom ?? "처음"} ~ ${filters.visitTo ?? "오늘"}`;
    chips.push({
      key: "visit",
      label: `방문일: ${range}`,
      next: { ...filters, visitFrom: null, visitTo: null },
    });
  }
  if (filters.hasPriceTarget) {
    chips.push({
      key: "hasPriceTarget",
      label: "목표가격 설정 고객만",
      next: { ...filters, hasPriceTarget: false },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">적용된 조건:</span>
      {chips.map((chip) => {
        const qs = buildCustomerSearchParams(chip.next).toString();
        return (
          <Badge key={chip.key} variant="secondary" className="gap-1">
            {chip.label}
            <Link
              href={qs ? `/customers?${qs}` : "/customers"}
              scroll={false}
              aria-label={`${chip.label} 조건 해제`}
              className="ml-0.5 rounded px-0.5 hover:bg-foreground/10"
            >
              ×
            </Link>
          </Badge>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/customers" scroll={false} />}
      >
        모두 지우기
      </Button>
    </div>
  );
}
