"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { CalendarDateField } from "@/components/ui/calendar-date-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FREQUENCY_LABEL_LABELS,
  INFLOW_CHANNEL_LABELS,
  PURCHASE_PURPOSE_LABELS,
  REVENUE_LABEL_LABELS,
} from "@/lib/labels";
import {
  FREQUENCY_LABELS,
  INFLOW_CHANNELS,
  PURCHASE_PURPOSES,
  REVENUE_LABELS,
} from "@/lib/types/database";
import {
  SEARCH_MAX_LENGTH,
  type CustomerFilters,
} from "@/lib/customers/filters";

function CheckboxFilterGroup({
  legend,
  name,
  options,
  labels,
  defaultValues,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  labels: Record<string, string>;
  defaultValues: readonly string[];
}) {
  const checked = new Set(defaultValues);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {options.map((code) => (
          <label key={code} className="flex items-center gap-1.5 text-sm">
            <Checkbox name={name} value={code} defaultChecked={checked.has(code)} />
            {labels[code]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CustomerFilterBar({ filters }: { filters: CustomerFilters }) {
  const router = useRouter();
  const qId = useId();
  const visitFromId = useId();
  const visitToId = useId();

  // 필터 입력 리셋 규칙:
  // - "필터 초기화"(cleared): 검색어는 두고 아래 필터 입력만 즉시 비운다.
  // - "전체 초기화" 등 내비게이션으로 URL 필터가 바뀌면(filtersSig 변화)
  //   해당 입력들을 새 값(=빈 값)으로 remount 한다. 검색어 입력은 filters.q 로 remount.
  const filtersSig = [
    ...filters.purposes,
    "|",
    ...filters.channels,
    "|",
    ...filters.frequencyLabels,
    "|",
    ...filters.revenueLabels,
    "|",
    filters.visitFrom ?? "",
    filters.visitTo ?? "",
    filters.hasPriceTarget ? "1" : "",
  ].join(",");
  const [cleared, setCleared] = useState(false);
  // URL(필터 파라미터)이 실제로 바뀌면 override 해제 — 렌더 중 상태 보정(React 권장).
  const [prevSig, setPrevSig] = useState(filtersSig);
  if (prevSig !== filtersSig) {
    setPrevSig(filtersSig);
    setCleared(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const q = String(form.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
    if (q) params.set("q", q);

    for (const p of form.getAll("purpose")) params.append("purpose", String(p));
    for (const c of form.getAll("channel")) params.append("channel", String(c));
    for (const f of form.getAll("frequencyLabel")) {
      params.append("frequencyLabel", String(f));
    }
    for (const r of form.getAll("revenueLabel")) {
      params.append("revenueLabel", String(r));
    }

    let visitFrom = String(form.get("visitFrom") ?? "").trim();
    let visitTo = String(form.get("visitTo") ?? "").trim();
    if (visitFrom && visitTo && visitFrom > visitTo) {
      [visitFrom, visitTo] = [visitTo, visitFrom];
    }
    if (visitFrom) params.set("visitFrom", visitFrom);
    if (visitTo) params.set("visitTo", visitTo);

    if (form.get("hasPriceTarget")) params.set("hasPriceTarget", "1");

    const qs = params.toString();
    router.push(qs ? `/customers?${qs}` : "/customers", { scroll: false });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={qId}>이름(정확히) 또는 연락처 검색</Label>
        <Input
          key={filters.q}
          id={qId}
          name="q"
          defaultValue={filters.q}
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="예: 홍길동 또는 010-1234"
        />
      </div>

      <div key={`${filtersSig}|${cleared}`} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxFilterGroup
            legend="방문 목적"
            name="purpose"
            options={PURCHASE_PURPOSES}
            labels={PURCHASE_PURPOSE_LABELS}
            defaultValues={cleared ? [] : filters.purposes}
          />
          <CheckboxFilterGroup
            legend="유입 경로"
            name="channel"
            options={INFLOW_CHANNELS}
            labels={INFLOW_CHANNEL_LABELS}
            defaultValues={cleared ? [] : filters.channels}
          />
          <CheckboxFilterGroup
            legend="빈도 라벨"
            name="frequencyLabel"
            options={FREQUENCY_LABELS}
            labels={FREQUENCY_LABEL_LABELS}
            defaultValues={cleared ? [] : filters.frequencyLabels}
          />
          <CheckboxFilterGroup
            legend="매출 라벨"
            name="revenueLabel"
            options={REVENUE_LABELS}
            labels={REVENUE_LABEL_LABELS}
            defaultValues={cleared ? [] : filters.revenueLabels}
          />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">방문일 (기간)</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={visitFromId}
                className="text-xs text-muted-foreground"
              >
                시작
              </Label>
              <CalendarDateField
                id={visitFromId}
                name="visitFrom"
                defaultValue={cleared ? "" : (filters.visitFrom ?? "")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={visitToId}
                className="text-xs text-muted-foreground"
              >
                종료
              </Label>
              <CalendarDateField
                id={visitToId}
                name="visitTo"
                defaultValue={cleared ? "" : (filters.visitTo ?? "")}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            고객 등록일 또는 거래일이 이 기간 안에 있는 고객을 찾습니다.
          </p>
        </fieldset>

        <label className="flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <Checkbox
            name="hasPriceTarget"
            value="1"
            defaultChecked={cleared ? false : filters.hasPriceTarget}
          />
          목표가격(매수 희망가)이 설정된 고객만 보기
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // 필터(체크박스·기간·목표가)만 지우고 검색어는 유지한다.
            setCleared(true);
            const params = new URLSearchParams();
            if (filters.q) params.set("q", filters.q);
            const qs = params.toString();
            router.push(qs ? `/customers?${qs}` : "/customers", {
              scroll: false,
            });
          }}
        >
          필터 초기화
        </Button>
        <Button type="submit">검색</Button>
      </div>
    </form>
  );
}
