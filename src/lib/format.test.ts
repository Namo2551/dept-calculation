import { describe, expect, test } from "vitest";
import { simulate, type SingleOptions } from "./debt";
import { compareSentence, durationText, explainFirstMonths, formatBaht, keepFigures, monthsToText, payoffDate, toCsv } from "./format";

const A = (m: number, floor: number): SingleOptions => ({ balance: 30000, apr: 16, strategy: "pct", m, floor });
const B = (p: number): SingleOptions => ({ balance: 30000, apr: 16, strategy: "fixed", p });
const a5 = simulate(A(0.05, 0));
const b1500 = simulate(B(1500));
const b400 = simulate(B(400));

describe("formatBaht", () => {
  test("ported from test.js", () => {
    expect(formatBaht(30000)).toBe("30,000.00");
    expect(formatBaht(1234567.891)).toBe("1,234,567.89");
    expect(formatBaht(0.5)).toBe("0.50");
  });
  test("result totals display", () => {
    expect(formatBaht(a5.totalInterest!)).toBe("10,909.08");
    expect(formatBaht(simulate(A(0.1, 0)).totalInterest!)).toBe("4,615.38");
  });
});

describe("monthsToText", () => {
  const en: Record<number, string> = { 0: "0 months", 1: "1 month", 5: "5 months", 12: "1 year", 13: "1 year 1 month",
    17: "1 year 5 months", 24: "2 years", 418: "34 years 10 months" };
  test.each(Object.entries(en))("%s", (k, v) => expect(monthsToText(+k)).toBe(v));
});

describe("explainFirstMonths", () => {
  test("first months show the recurrence step by step", () => {
    const ex = explainFirstMonths(B(1500), 3);
    expect(ex[0]).toBe("Month 1: balance 30,000.00 + interest 400.00, pay 1,500.00, left 28,900.00");
    expect(ex[1]).toBe("Month 2: balance 28,900.00 + interest 385.33, pay 1,500.00, left 27,785.33");
  });
});

describe("toCsv", () => {
  test("header and one line per row", () => {
    const lines = toCsv(b1500.rows).split("\n");
    expect(lines[0]).toBe("Month,Start balance,Interest,Payment,End balance");
    expect(lines.length - 1).toBe(b1500.rows.length);
  });
});

describe("compareSentence", () => {
  test("both paid off, and one that never finishes", () => {
    expect(compareSentence(a5, b1500, { m: 0.05, p: 1500 })).toBe(
      "Paying the 5% minimum takes 34 years 10 months (interest 10,909.08 baht), while paying a fixed 1,500.00 baht takes 2 years (interest 5,126.95 baht). Difference: 5,782.13 baht");
    const never = compareSentence(a5, b400, { m: 0.05, p: 400 });
    expect(never).toBe("Paying the 5% minimum takes 34 years 10 months (interest 10,909.08 baht), while paying a fixed 400.00 baht is not paid off within 100 years");
    expect(never).not.toContain("Difference");
    expect(compareSentence(a5, b1500, { m: 0.075, p: 1500 }).indexOf("Paying the 7.5% ")).toBe(0);
  });
});

describe("durationText", () => {
  test("paid off, never, over 100 years", () => {
    expect(durationText(b1500)).toBe("2 years");
    expect(durationText(b400)).toBe("Never");
    const slow = simulate(A(0.001, 0)); // shrinks too slowly to finish within 100 years
    expect(slow.months).toBeNull();
    expect(durationText(slow)).toBe("Over 100 years");
  });
});

describe("keepFigures", () => {
  test("joins each number to its unit and leaves group spaces breakable", () => {
    expect(keepFigures("34 years 10 months")).toBe("34\u00a0years 10\u00a0months");
  });
  test("joins an amount to baht", () => {
    expect(keepFigures("10,909.08 baht")).toBe("10,909.08\u00a0baht");
  });
  test("leaves text with no number and unit unchanged", () => {
    expect(keepFigures("Never")).toBe("Never");
    expect(keepFigures("Over 100 years")).toBe("Over 100\u00a0years");
  });
});

describe("payoffDate", () => {
  test("month 1 is the month after today", () => {
    expect(payoffDate(24, new Date(2026, 10, 22))).toBe("November 2028");
    expect(payoffDate(1, new Date(2026, 11, 5))).toBe("January 2027");
  });
});
