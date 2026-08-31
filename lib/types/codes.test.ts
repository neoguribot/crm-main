import { describe, expect, it } from "vitest";
import {
  codeToEventType,
  codeToGender,
  codeToItemType,
  codeToTradeStatus,
  codeToTradeType,
  eventTypeToCode,
  genderToCode,
  itemTypeToCode,
  tradeStatusToCode,
  tradeTypeToCode,
} from "./codes";
import { EVENT_TYPES, GENDERS, ITEM_TYPES, TRADE_STATUSES, TRADE_TYPES } from "./database";

describe("gender codes", () => {
  it("round-trips every gender", () => {
    for (const g of GENDERS) {
      expect(codeToGender(genderToCode(g))).toBe(g);
    }
  });
  it("maps UNKNOWN to 0, MALE to 1, FEMALE to 2", () => {
    expect(genderToCode("UNKNOWN")).toBe(0);
    expect(genderToCode("MALE")).toBe(1);
    expect(genderToCode("FEMALE")).toBe(2);
  });
});

describe("trade type codes", () => {
  it("round-trips every trade type", () => {
    for (const t of TRADE_TYPES) {
      expect(codeToTradeType(tradeTypeToCode(t))).toBe(t);
    }
  });
  it("maps SALE to 1, PURCHASE to 2", () => {
    expect(tradeTypeToCode("SALE")).toBe(1);
    expect(tradeTypeToCode("PURCHASE")).toBe(2);
  });
  it("throws on unknown code", () => {
    expect(() => codeToTradeType(9)).toThrow();
  });
});

describe("item type codes", () => {
  it("round-trips every item type", () => {
    for (const i of ITEM_TYPES) {
      expect(codeToItemType(itemTypeToCode(i))).toBe(i);
    }
  });
  it("maps OTHER to 99", () => {
    expect(itemTypeToCode("OTHER")).toBe(99);
  });
  it("throws on unknown code", () => {
    expect(() => codeToItemType(50)).toThrow();
  });
});

describe("trade status codes", () => {
  it("round-trips every status", () => {
    for (const s of TRADE_STATUSES) {
      expect(codeToTradeStatus(tradeStatusToCode(s))).toBe(s);
    }
  });
  it("maps DONE to 1, IN_PROGRESS to 2", () => {
    expect(tradeStatusToCode("DONE")).toBe(1);
    expect(tradeStatusToCode("IN_PROGRESS")).toBe(2);
  });
});

describe("event type codes", () => {
  it("round-trips every event type", () => {
    for (const e of EVENT_TYPES) {
      expect(codeToEventType(eventTypeToCode(e))).toBe(e);
    }
  });
  it("throws on unknown code", () => {
    expect(() => codeToEventType(0)).toThrow();
  });
});
