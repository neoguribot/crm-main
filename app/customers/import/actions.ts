"use server";

import { revalidatePath } from "next/cache";

import ExcelJS from "exceljs";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { genderToCode } from "@/lib/types/codes";
import { digitsOnly } from "@/lib/customers/match";
import {
  IMPORT_COLUMNS_BY_HEADER,
  REFERRER_HEADER,
  cellText,
  emptyImportDraft,
} from "@/lib/customers/excel-columns";
import { customerInputSchema } from "@/lib/validation/customer";
import {
  initialImportState,
  type CustomerImportState,
} from "@/app/customers/import/form-state";

const MAX_ERRORS_SHOWN = 30;
const INSERT_CHUNK = 100;

function fail(message: string): CustomerImportState {
  return { ...initialImportState, status: "error", message };
}

export async function importCustomers(
  _prev: CustomerImportState,
  formData: FormData,
): Promise<CustomerImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Excel 파일을 선택해 주세요.");
  }
  if (file.size > 5 * 1024 * 1024) {
    return fail("파일이 너무 큽니다. 5MB 이하로 나눠서 올려 주세요.");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  // ── 워크북 파싱 ──
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    return fail("Excel 파일을 읽지 못했습니다. .xlsx 형식인지 확인해 주세요.");
  }
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) {
    return fail("데이터가 없습니다. 첫 행은 헤더, 둘째 행부터 고객 정보여야 합니다.");
  }

  const headerRow = ws.getRow(1);
  const headerToCol = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const name = cellText(cell.value);
    if (name) headerToCol.set(name, col);
  });
  if (!headerToCol.has("이름") || !headerToCol.has("연락처")) {
    return fail(
      "필수 헤더(이름, 연락처)를 찾지 못했습니다. 양식을 내려받아 사용해 주세요.",
    );
  }
  const referrerCol = headerToCol.get(REFERRER_HEADER) ?? null;

  // ── 기존 고객: 전화번호 중복 판정 + 추천인 이름→id ──
  const { data: existing, error: existingError } = await supabase
    .from("customers")
    .select("id, name, phone");
  if (existingError) {
    console.error("[customers] 불러오기 기존 조회 실패:", existingError.message);
    return fail("기존 고객을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const existingPhones = new Set(
    (existing ?? []).map((c) => digitsOnly(c.phone)).filter(Boolean),
  );
  const referrerIdByName = new Map<string, string | null>();
  for (const c of existing ?? []) {
    referrerIdByName.set(
      c.name.trim(),
      referrerIdByName.has(c.name.trim()) ? null : c.id,
    );
  }

  // ── 행 파싱·검증 ──
  type Pending = {
    row: number;
    payload: Record<string, unknown>;
    referrerName: string | null;
  };
  const pending: Pending[] = [];
  const errors: { row: number; message: string }[] = [];
  let skipped = 0;
  const seenInFile = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const excelRow = ws.getRow(r);
    const draft = emptyImportDraft();
    let hasAnyValue = false;

    for (const [header, col] of headerToCol) {
      const column = IMPORT_COLUMNS_BY_HEADER.get(header);
      if (!column?.fromCell) continue;
      const value = excelRow.getCell(col).value;
      if (cellText(value)) hasAnyValue = true;
      column.fromCell(value, draft);
    }
    if (!hasAnyValue) continue; // 빈 행 스킵

    const parsed = customerInputSchema.safeParse(draft);
    if (!parsed.success) {
      errors.push({
        row: r,
        message: parsed.error.issues[0]?.message ?? "입력값 오류",
      });
      continue;
    }

    const phoneDigits = digitsOnly(parsed.data.phone);
    if (
      phoneDigits &&
      (existingPhones.has(phoneDigits) || seenInFile.has(phoneDigits))
    ) {
      skipped++;
      continue;
    }
    if (phoneDigits) seenInFile.add(phoneDigits);

    pending.push({
      row: r,
      referrerName: referrerCol
        ? cellText(excelRow.getCell(referrerCol).value) || null
        : null,
      payload: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        birth_date: parsed.data.birth_date,
        gender: genderToCode(parsed.data.gender),
        address: parsed.data.address,
        inflow_channels: parsed.data.inflow_channels,
        inflow_channel_detail: parsed.data.inflow_channel_detail,
        purchase_purposes: parsed.data.purchase_purposes,
        purchase_purpose_detail: parsed.data.purchase_purpose_detail,
        frequency_label: parsed.data.frequency_label,
        revenue_label: parsed.data.revenue_label,
        referred_by_customer_id: parsed.data.referred_by_customer_id,
        registered_on: parsed.data.registered_on,
        first_trade_date: parsed.data.first_trade_date,
        last_contact_date: parsed.data.last_contact_date,
        memo: parsed.data.memo,
      },
    });
  }

  // 추천인 이름 → 기존 고객 id (모호하거나 없으면 무시)
  for (const p of pending) {
    if (!p.referrerName) continue;
    const id = referrerIdByName.get(p.referrerName.trim());
    if (id) p.payload.referred_by_customer_id = id;
  }

  if (pending.length === 0) {
    return {
      status: "done",
      message: "새로 등록할 고객이 없습니다.",
      inserted: 0,
      skipped,
      errors: errors.slice(0, MAX_ERRORS_SHOWN),
    };
  }

  // ── 삽입 (청크) ──
  let inserted = 0;
  for (let i = 0; i < pending.length; i += INSERT_CHUNK) {
    const chunk = pending.slice(i, i + INSERT_CHUNK);
    const { data, error } = await supabase
      .from("customers")
      .insert(chunk.map((p) => p.payload))
      .select("id");
    if (error) {
      console.error("[customers] 불러오기 삽입 실패:", error.message);
      errors.push({
        row: chunk[0].row,
        message: `저장 실패: ${error.message}`,
      });
      break;
    }
    inserted += data?.length ?? 0;
  }

  if (inserted > 0) revalidatePath("/customers");

  return {
    status: "done",
    message: `${inserted}건 등록, ${skipped}건 중복 건너뜀${
      errors.length > 0 ? `, ${errors.length}건 오류` : ""
    }.`,
    inserted,
    skipped,
    errors: errors.slice(0, MAX_ERRORS_SHOWN),
  };
}
