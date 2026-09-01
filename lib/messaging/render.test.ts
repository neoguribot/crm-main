import { describe, expect, it } from "vitest";

import {
  buildCustomerVars,
  renderTemplate,
  templateTokens,
} from "./render";

describe("templateTokens", () => {
  it("본문의 변수 토큰을 중복 없이 뽑는다", () => {
    expect(templateTokens("{이름}님 {매장명} {이름}")).toEqual([
      "이름",
      "매장명",
    ]);
  });
});

describe("renderTemplate", () => {
  it("정의된 키를 치환한다", () => {
    expect(renderTemplate("{이름}님 안녕하세요", { 이름: "김순금" })).toBe(
      "김순금님 안녕하세요",
    );
  });

  it("빈 값이면 토큰만 사라진다", () => {
    expect(renderTemplate("최근시세 {현재시세}", { 현재시세: "" })).toBe(
      "최근시세 ",
    );
  });

  it("정의되지 않은 토큰은 원문을 유지한다(오타 노출)", () => {
    expect(renderTemplate("{이르음}님", { 이름: "김순금" })).toBe("{이르음}님");
  });
});

describe("buildCustomerVars", () => {
  const base = {
    customer: {
      name: "이단골",
      phone: "010-1234-5678",
      last_contact_date: "2026-06-01",
      birth_date: "1980-03-15",
    },
    storeName: "제일금거래소",
    latestPricePerDon: "588000",
  };

  it("고객·매장·시세 값을 채운다", () => {
    const vars = buildCustomerVars(base);
    expect(vars["이름"]).toBe("이단골");
    expect(vars["매장명"]).toBe("제일금거래소");
    expect(vars["현재시세"]).toBe("588,000원/돈");
    expect(vars["마지막연락일"]).toBe("2026. 6. 1.");
    expect(vars["생일"]).toBe("1980. 3. 15.");
    expect(vars["목표가"]).toBe("");
  });

  it("다음 일정은 날짜 + 종류 라벨로", () => {
    const vars = buildCustomerVars({
      ...base,
      nextEvent: { event_date: "2026-07-10", event_type: 4 },
    });
    expect(vars["다음일정"]).toBe("2026. 7. 10. 재방문");
  });

  it("알 수 없는 일정 코드는 날짜만", () => {
    const vars = buildCustomerVars({
      ...base,
      nextEvent: { event_date: "2026-07-10", event_type: 99 },
    });
    expect(vars["다음일정"]).toBe("2026. 7. 10.");
  });

  it("템플릿 전체 렌더", () => {
    const vars = buildCustomerVars({
      ...base,
      targetPricePerDon: "560000",
    });
    const out = renderTemplate(
      "{이름}님, 오늘 금 시세는 {현재시세}입니다. 희망가 {목표가} 도달 시 연락드릴게요. - {매장명}",
      vars,
    );
    expect(out).toBe(
      "이단골님, 오늘 금 시세는 588,000원/돈입니다. 희망가 560,000원/돈 도달 시 연락드릴게요. - 제일금거래소",
    );
  });
});
