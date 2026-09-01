import { describe, expect, it } from "vitest";

import {
  CUSTOMER_EXCEL_COLUMNS,
  IMPORT_COLUMNS_BY_HEADER,
  cellText,
  emptyImportDraft,
  invertLabelMap,
} from "./excel-columns";
import type { CustomerExportRow } from "./excel-columns";
import { todayInSeoul } from "@/lib/date";
import type { Customer } from "@/lib/types/database";

function draftFrom(cells: Record<string, unknown>) {
  const draft = emptyImportDraft();
  for (const [header, value] of Object.entries(cells)) {
    IMPORT_COLUMNS_BY_HEADER.get(header)?.fromCell?.(value, draft);
  }
  return draft;
}

describe("invertLabelMap", () => {
  it("라벨과 코드 양쪽으로 조회할 수 있다", () => {
    const inv = invertLabelMap({ MALE: "남성", FEMALE: "여성" });
    expect(inv["남성"]).toBe("MALE");
    expect(inv["MALE"]).toBe("MALE");
  });
});

describe("cellText", () => {
  it("문자열·숫자·null·리치텍스트·수식결과를 문자열로 정규화한다", () => {
    expect(cellText("  홍길동 ")).toBe("홍길동");
    expect(cellText(42)).toBe("42");
    expect(cellText(null)).toBe("");
    expect(cellText({ text: " 메모 " })).toBe("메모");
    expect(cellText({ result: 7 })).toBe("7");
    expect(
      cellText({ richText: [{ text: "가" }, { text: "나" }] }),
    ).toBe("가나");
  });
});

describe("fromCell (불러오기 파싱)", () => {
  it("성별 라벨을 코드로, 알 수 없으면 UNKNOWN", () => {
    expect(draftFrom({ 성별: "여성" }).gender).toBe("FEMALE");
    expect(draftFrom({ 성별: "MALE" }).gender).toBe("MALE");
    expect(draftFrom({ 성별: "?" }).gender).toBe("UNKNOWN");
  });

  it("유입경로·방문목적 다중값을 쉼표/가운뎃점으로 분리하고 코드로", () => {
    expect(draftFrom({ 유입경로: "워크인, 네이버 플레이스" }).inflow_channels).toEqual([
      "WALK_IN",
      "NAVER_PLACE",
    ]);
    expect(
      draftFrom({ 방문목적: "매입 · 골드바 · 없는값" }).purchase_purposes,
    ).toEqual(["PURCHASE", "GOLD_BAR"]);
  });

  it("날짜는 YYYY-MM-DD / YYYY. M. D. 모두 받아들인다", () => {
    expect(draftFrom({ 생년월일: "1990-03-05" }).birth_date).toBe("1990-03-05");
    expect(draftFrom({ 생년월일: "1990. 3. 5." }).birth_date).toBe("1990-03-05");
    expect(draftFrom({ 생년월일: "" }).birth_date).toBe("");
  });

  it("등록일 열이 있고 값이 비면 오늘로 채운다", () => {
    expect(draftFrom({ 등록일: "" }).registered_on).toBe(todayInSeoul());
    expect(draftFrom({ 등록일: "2026-01-02" }).registered_on).toBe("2026-01-02");
  });

  it("숫자로 저장돼 선행 0 이 사라진 휴대폰 번호를 복원한다", () => {
    expect(draftFrom({ 연락처: 1012345678 }).phone).toBe("01012345678");
    expect(draftFrom({ 연락처: "010-1234-5678" }).phone).toBe("010-1234-5678");
  });

  it("빈도·매출 라벨은 유효값만, 아니면 기본값", () => {
    expect(draftFrom({ 빈도라벨: "단골" }).frequency_label).toBe("단골");
    expect(draftFrom({ 빈도라벨: "??" }).frequency_label).toBe("신규");
    expect(draftFrom({ 매출라벨: "VIP" }).revenue_label).toBe("VIP");
    expect(draftFrom({ 매출라벨: "" }).revenue_label).toBe("일반");
  });
});

describe("toCell (내보내기) 왕복", () => {
  const baseCustomer: Customer = {
    id: "c1",
    owner_id: "o1",
    name: "김순금",
    phone: "010-1111-2222",
    email: "a@b.com",
    birth_date: "1980-06-15",
    gender: "FEMALE",
    address: "대전 유성구",
    inflow_channels: ["WALK_IN", "REFERRAL"],
    inflow_channel_detail: null,
    purchase_purposes: ["PURCHASE", "GOLD_BAR"],
    purchase_purpose_detail: null,
    frequency_label: "단골",
    revenue_label: "VIP",
    referred_by_customer_id: null,
    registered_on: "2026-01-10",
    first_trade_date: "2026-02-01",
    last_contact_date: "2026-03-01",
    memo: "메모",
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
  };

  const row: CustomerExportRow = {
    customer: baseCustomer,
    referrerName: "이추천",
    lastVisitDate: "2026-03-01",
    tradeCount: 3,
    totalAmount: "1500000",
  };

  it("내보낸 셀을 다시 불러오면 핵심 필드가 보존된다", () => {
    const cells: Record<string, unknown> = {};
    for (const col of CUSTOMER_EXCEL_COLUMNS) {
      cells[col.header] = col.toCell(row);
    }
    const draft = draftFrom(cells);

    expect(draft.name).toBe("김순금");
    expect(draft.gender).toBe("FEMALE");
    expect(draft.inflow_channels).toEqual(["WALK_IN", "REFERRAL"]);
    expect(draft.purchase_purposes).toEqual(["PURCHASE", "GOLD_BAR"]);
    expect(draft.frequency_label).toBe("단골");
    expect(draft.revenue_label).toBe("VIP");
    expect(draft.birth_date).toBe("1980-06-15");
    expect(draft.registered_on).toBe("2026-01-10");
    expect(draft.first_trade_date).toBe("2026-02-01");
  });

  it("파생값 컬럼(최근방문일·거래건수·누적거래액)은 내보내기 전용", () => {
    for (const header of ["최근방문일", "거래건수", "누적거래액"]) {
      expect(IMPORT_COLUMNS_BY_HEADER.has(header)).toBe(false);
    }
  });
});
