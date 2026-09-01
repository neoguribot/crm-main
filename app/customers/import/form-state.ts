import {
  CUSTOMER_EXCEL_COLUMNS,
  IMPORT_COLUMNS_BY_HEADER,
} from "@/lib/customers/excel-columns";

export type CustomerImportState = {
  status: "idle" | "done" | "error";
  message: string | null;
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export const initialImportState: CustomerImportState = {
  status: "idle",
  message: null,
  inserted: 0,
  skipped: 0,
  errors: [],
};

/** 불러오기 양식의 헤더 순서 (파생값 컬럼 제외). 페이지 안내에 쓴다. */
export const IMPORT_HEADERS = CUSTOMER_EXCEL_COLUMNS.filter((c) =>
  IMPORT_COLUMNS_BY_HEADER.has(c.header),
).map((c) => c.header);
