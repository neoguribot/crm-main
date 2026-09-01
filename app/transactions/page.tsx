import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDateField } from "@/components/ui/calendar-date-field";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatKoreanDate } from "@/lib/date";
import { formatWon, trimTrailingZeros } from "@/lib/number";
import {
  ITEM_TYPE_LABELS,
  TRADE_STATUS_LABELS,
  TRADE_TYPE_LABELS,
} from "@/lib/labels";
import { TRADE_STATUSES, TRADE_TYPES } from "@/lib/types/database";
import { searchTradeRecords } from "@/lib/trades/queries";
import {
  buildTradeSearchParams,
  parseTradeSearchParams,
} from "@/lib/trades/search-params";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata: Metadata = {
  title: "거래 관리",
};

export const dynamic = "force-dynamic";

const ALL = "ALL";

const ROW_GRID =
  "sm:grid-cols-[88px_60px_64px_minmax(0,1fr)_84px_140px_110px_minmax(0,1fr)_56px]";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const filters = parseTradeSearchParams(sp);
  const { q, tradeType, status, dateFrom, dateTo } = filters;

  const result = await searchTradeRecords(filters);

  const exportQuery = buildTradeSearchParams(filters).toString();
  const exportHref = exportQuery
    ? `/transactions/export?${exportQuery}`
    : "/transactions/export";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">거래 관리</h1>
          <p className="text-sm text-muted-foreground">전체 거래 검색·조회</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            render={<a href={exportHref}>Excel 내보내기</a>}
          />
          <Button render={<Link href="/transactions/new" />}>신규 거래 등록</Button>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-sm text-muted-foreground">
            고객 이름/전화번호
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="검색어" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">거래구분</label>
          <Select name="trade_type" items={TRADE_TYPE_LABELS} defaultValue={tradeType ?? ALL}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {TRADE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TRADE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">완료 여부</label>
          <Select name="status" items={TRADE_STATUS_LABELS} defaultValue={status ?? ALL}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {TRADE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TRADE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date_from" className="text-sm text-muted-foreground">
            거래일 시작
          </label>
          <CalendarDateField id="date_from" name="date_from" defaultValue={dateFrom} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date_to" className="text-sm text-muted-foreground">
            거래일 종료
          </label>
          <CalendarDateField id="date_to" name="date_to" defaultValue={dateTo} />
        </div>
        <Button type="submit">검색</Button>
        {q || tradeType || status || dateFrom || dateTo ? (
          <Button type="button" variant="outline" render={<Link href="/transactions" />}>
            초기화
          </Button>
        ) : null}
      </form>

      {!result.ok ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            조건에 맞는 거래가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className={`hidden px-4 text-xs text-muted-foreground sm:grid ${ROW_GRID}`}
          >
            <span>날짜</span>
            <span>구분</span>
            <span>완료</span>
            <span>이름</span>
            <span>품목</span>
            <span>단가 · 중량</span>
            <span>총 금액</span>
            <span>비고</span>
            <span />
          </div>
          <ul className="flex flex-col gap-2">
            {result.data.map((t) => (
              <li key={t.id}>
                <Card>
                  <CardContent
                    className={`grid grid-cols-1 gap-2 py-3 text-sm sm:items-center sm:gap-x-3 sm:gap-y-0 ${ROW_GRID}`}
                  >
                    <span className="tabular-nums text-muted-foreground">
                      {formatKoreanDate(t.trade_date)}
                    </span>
                    <Badge
                      variant={t.trade_type === "SALE" ? "secondary" : "outline"}
                      className="w-fit"
                    >
                      {TRADE_TYPE_LABELS[t.trade_type]}
                    </Badge>
                    <Badge variant="outline" className="w-fit">
                      {TRADE_STATUS_LABELS[t.status]}
                    </Badge>
                    <span className="min-w-0 truncate font-medium">{t.customer_name}</span>
                    <span className="min-w-0 truncate text-muted-foreground">
                      {ITEM_TYPE_LABELS[t.item_type]}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.unit_price ? `${formatWon(t.unit_price)} • ` : ""}
                      {trimTrailingZeros(t.weight)}g
                    </span>
                    <span className="tabular-nums font-medium">{formatWon(t.amount)}</span>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {t.memo ?? ""}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit"
                      render={<Link href={`/transactions/${t.id}`} />}
                    >
                      수정
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
