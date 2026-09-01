/**
 * 거래 내역 Excel 내보내기 컬럼 정의 (순수 모듈). 내보내기 전용 — 불러오기 없음.
 */

import { formatKoreanDate } from "@/lib/date";
import { trimTrailingZeros } from "@/lib/number";
import {
  ITEM_TYPE_LABELS,
  TRADE_STATUS_LABELS,
  TRADE_TYPE_LABELS,
} from "@/lib/labels";
import type { TradeRecordSearchItem } from "@/lib/trades/queries";

type TradeExcelColumn = {
  header: string;
  width: number;
  text?: boolean;
  toCell: (t: TradeRecordSearchItem) => string | number;
};

export const TRADE_EXCEL_COLUMNS: TradeExcelColumn[] = [
  { header: "거래일", width: 12, text: true, toCell: (t) => t.trade_date },
  {
    header: "구분",
    width: 8,
    toCell: (t) => TRADE_TYPE_LABELS[t.trade_type],
  },
  {
    header: "완료여부",
    width: 10,
    toCell: (t) => TRADE_STATUS_LABELS[t.status],
  },
  { header: "고객명", width: 12, toCell: (t) => t.customer_name },
  { header: "연락처", width: 16, text: true, toCell: (t) => t.customer_phone },
  { header: "품목", width: 16, toCell: (t) => ITEM_TYPE_LABELS[t.item_type] },
  { header: "품목상세", width: 16, toCell: (t) => t.item_detail ?? "" },
  {
    header: "단가(원)",
    width: 14,
    toCell: (t) => (t.unit_price ? Number(t.unit_price) : ""),
  },
  {
    header: "중량(g)",
    width: 12,
    toCell: (t) => Number(trimTrailingZeros(t.weight)),
  },
  { header: "총금액(원)", width: 16, toCell: (t) => Number(t.amount) },
  {
    header: "거래일(표시)",
    width: 14,
    text: true,
    toCell: (t) => formatKoreanDate(t.trade_date),
  },
  { header: "비고", width: 30, toCell: (t) => t.memo ?? "" },
];
