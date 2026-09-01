import "server-only";

import ExcelJS from "exceljs";

import {
  CUSTOMER_EXCEL_COLUMNS,
  type CustomerExportRow,
} from "@/lib/customers/excel-columns";

/**
 * 고객 목록을 .xlsx 버퍼로 만든다. 서버 전용(라우트 핸들러에서 호출).
 * 행이 없으면 헤더만 있는 빈 양식이 되어 불러오기 템플릿으로도 쓴다.
 */
export async function buildCustomerWorkbook(rows: CustomerExportRow[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "금거래소 CRM";
  wb.created = new Date();

  const ws = wb.addWorksheet("고객");

  ws.columns = CUSTOMER_EXCEL_COLUMNS.map((col) => ({
    header: col.header,
    key: col.header,
    width: col.width,
  }));

  // 헤더 굵게 + 고정
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // 날짜·전화·번호형 텍스트 컬럼은 Excel 자동 변환을 막기 위해 텍스트 서식.
  const TEXT_HEADERS = new Set([
    "연락처",
    "생년월일",
    "등록일",
    "첫거래일",
    "마지막연락일",
    "최근방문일",
  ]);
  CUSTOMER_EXCEL_COLUMNS.forEach((col, i) => {
    if (TEXT_HEADERS.has(col.header)) ws.getColumn(i + 1).numFmt = "@";
  });

  for (const row of rows) {
    ws.addRow(
      Object.fromEntries(
        CUSTOMER_EXCEL_COLUMNS.map((col) => [col.header, col.toCell(row)]),
      ),
    );
  }

  return wb.xlsx.writeBuffer();
}
