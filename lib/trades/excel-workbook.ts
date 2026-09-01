import "server-only";

import ExcelJS from "exceljs";

import { TRADE_EXCEL_COLUMNS } from "@/lib/trades/excel-columns";
import type { TradeRecordSearchItem } from "@/lib/trades/queries";

/** 거래 내역을 .xlsx 버퍼로. 서버 전용. */
export async function buildTradeWorkbook(rows: TradeRecordSearchItem[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "금거래소 CRM";
  wb.created = new Date();

  const ws = wb.addWorksheet("거래내역");
  ws.columns = TRADE_EXCEL_COLUMNS.map((c) => ({
    header: c.header,
    key: c.header,
    width: c.width,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  TRADE_EXCEL_COLUMNS.forEach((c, i) => {
    if (c.text) ws.getColumn(i + 1).numFmt = "@";
  });

  for (const row of rows) {
    ws.addRow(
      Object.fromEntries(
        TRADE_EXCEL_COLUMNS.map((c) => [c.header, c.toCell(row)]),
      ),
    );
  }

  return wb.xlsx.writeBuffer();
}
