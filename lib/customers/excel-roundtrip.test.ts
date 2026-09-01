/**
 * exceljs 로 .xlsx 바이트를 실제로 쓰고 다시 읽어, 컬럼 정의와 맞물려
 * 값(특히 날짜 문자열)이 보존되는지 확인한다. 워크북 조립 로직은
 * `lib/customers/excel-workbook.ts`(server-only)와 동일하게 유지한다.
 */
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  CUSTOMER_EXCEL_COLUMNS,
  IMPORT_COLUMNS_BY_HEADER,
  cellText,
  emptyImportDraft,
  type CustomerExportRow,
} from "./excel-columns";
import type { Customer } from "@/lib/types/database";

const customer: Customer = {
  id: "c1",
  owner_id: "o1",
  name: "박순금",
  phone: "010-9876-5432",
  email: null,
  birth_date: "1975-11-30",
  gender: "FEMALE",
  address: "대전 서구 관저동",
  inflow_channels: ["NAVER_PLACE"],
  inflow_channel_detail: null,
  purchase_purposes: ["PURCHASE", "GOLD_BAR"],
  purchase_purpose_detail: null,
  frequency_label: "단골",
  revenue_label: "우수",
  referred_by_customer_id: null,
  registered_on: "2026-04-01",
  first_trade_date: "2026-04-10",
  last_contact_date: "2026-05-02",
  memo: "[DEMO] 왕복 테스트",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

const row: CustomerExportRow = {
  customer,
  referrerName: null,
  lastVisitDate: "2026-05-02",
  tradeCount: 4,
  totalAmount: "3750000",
};

async function writeThenRead(rows: CustomerExportRow[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("고객");
  ws.columns = CUSTOMER_EXCEL_COLUMNS.map((c) => ({
    header: c.header,
    key: c.header,
    width: c.width,
  }));
  const TEXT_HEADERS = new Set([
    "연락처",
    "생년월일",
    "등록일",
    "첫거래일",
    "마지막연락일",
    "최근방문일",
  ]);
  CUSTOMER_EXCEL_COLUMNS.forEach((c, i) => {
    if (TEXT_HEADERS.has(c.header)) ws.getColumn(i + 1).numFmt = "@";
  });
  for (const r of rows) {
    ws.addRow(
      Object.fromEntries(
        CUSTOMER_EXCEL_COLUMNS.map((c) => [c.header, c.toCell(r)]),
      ),
    );
  }
  const buffer = await wb.xlsx.writeBuffer();

  const back = new ExcelJS.Workbook();
  await back.xlsx.load(buffer as ArrayBuffer);
  return back.worksheets[0];
}

describe("Excel 내보내기→불러오기 왕복 (실제 xlsx 바이트)", () => {
  it("헤더 순서가 컬럼 정의와 일치한다", async () => {
    const ws = await writeThenRead([]);
    const headers: string[] = [];
    ws.getRow(1).eachCell((cell) => headers.push(cellText(cell.value)));
    expect(headers).toEqual(CUSTOMER_EXCEL_COLUMNS.map((c) => c.header));
  });

  it("데이터 행을 다시 파싱하면 값이 보존된다 (날짜 포함)", async () => {
    const ws = await writeThenRead([row]);

    const headerToCol = new Map<string, number>();
    ws.getRow(1).eachCell((cell, col) =>
      headerToCol.set(cellText(cell.value), col),
    );

    const draft = emptyImportDraft();
    const dataRow = ws.getRow(2);
    for (const [header, col] of headerToCol) {
      IMPORT_COLUMNS_BY_HEADER.get(header)?.fromCell?.(
        dataRow.getCell(col).value,
        draft,
      );
    }

    expect(draft.name).toBe("박순금");
    expect(draft.phone).toBe("010-9876-5432");
    expect(draft.birth_date).toBe("1975-11-30");
    expect(draft.registered_on).toBe("2026-04-01");
    expect(draft.first_trade_date).toBe("2026-04-10");
    expect(draft.last_contact_date).toBe("2026-05-02");
    expect(draft.gender).toBe("FEMALE");
    expect(draft.inflow_channels).toEqual(["NAVER_PLACE"]);
    expect(draft.purchase_purposes).toEqual(["PURCHASE", "GOLD_BAR"]);
    expect(draft.frequency_label).toBe("단골");
    expect(draft.revenue_label).toBe("우수");
  });
});
