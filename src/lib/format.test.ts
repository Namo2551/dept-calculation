import { describe, expect, test } from "vitest";
import { simulate, type SingleOptions } from "./debt";
import { compareSentence, durationText, explainFirstMonths, formatBaht, monthsToText, toCsv } from "./format";

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
  const th: Record<number, string> = { 0: "0 เดือน", 5: "5 เดือน", 12: "1 ปี", 17: "1 ปี 5 เดือน", 24: "2 ปี", 51: "4 ปี 3 เดือน",
    53: "4 ปี 5 เดือน", 124: "10 ปี 4 เดือน", 173: "14 ปี 5 เดือน", 418: "34 ปี 10 เดือน" };
  test.each(Object.entries(th))("th %s", (k, v) => expect(monthsToText(+k)).toBe(v));
  const en: Record<number, string> = { 0: "0 months", 1: "1 month", 5: "5 months", 12: "1 year", 13: "1 year 1 month",
    17: "1 year 5 months", 24: "2 years", 418: "34 years 10 months" };
  test.each(Object.entries(en))("en %s", (k, v) => expect(monthsToText(+k, "en")).toBe(v));
});

describe("explainFirstMonths", () => {
  test("th, ported", () => {
    const ex = explainFirstMonths(B(1500), 3);
    expect(ex[0]).toBe("เดือนที่ 1: ยอดเดิม 30,000.00 + ดอกเบี้ย 400.00 แล้วจ่าย 1,500.00 เหลือ 28,900.00");
    expect(ex[1]).toBe("เดือนที่ 2: ยอดเดิม 28,900.00 + ดอกเบี้ย 385.33 แล้วจ่าย 1,500.00 เหลือ 27,785.33");
  });
  test("en", () => {
    expect(explainFirstMonths(B(1500), 1, "en")[0]).toBe("Month 1: balance 30,000.00 + interest 400.00, pay 1,500.00, left 28,900.00");
  });
});

describe("toCsv", () => {
  test("th, ported", () => {
    const lines = toCsv(b1500.rows).split("\n");
    expect(lines[0]).toBe("เดือน,ยอดต้นเดือน,ดอกเบี้ย,เงินที่จ่าย,ยอดปลายเดือน");
    expect(lines.length - 1).toBe(b1500.rows.length);
  });
  test("en header", () => {
    expect(toCsv(b1500.rows, "en").split("\n")[0]).toBe("Month,Start balance,Interest,Payment,End balance");
  });
});

describe("compareSentence", () => {
  test("th, ported", () => {
    expect(compareSentence(a5, b1500, { m: 0.05, p: 1500 })).toBe(
      "จ่ายขั้นต่ำ 5% ใช้เวลา 34 ปี 10 เดือน (ดอกเบี้ย 10,909.08 บาท) ส่วนจ่ายคงที่ 1,500.00 บาทใช้เวลา 2 ปี (ดอกเบี้ย 5,126.95 บาท) ต่างกัน 5,782.13 บาท");
    const never = compareSentence(a5, b400, { m: 0.05, p: 400 });
    expect(never).toContain("ไม่หมดหนี้ภายใน 100 ปี");
    expect(never).not.toContain("ต่างกัน");
    expect(compareSentence(a5, b1500, { m: 0.075, p: 1500 }).indexOf("จ่ายขั้นต่ำ 7.5% ")).toBe(0);
  });
  test("en", () => {
    expect(compareSentence(a5, b1500, { m: 0.05, p: 1500 }, "en")).toBe(
      "Paying the 5% minimum takes 34 years 10 months (interest 10,909.08 baht), while paying a fixed 1,500.00 baht takes 2 years (interest 5,126.95 baht). Difference: 5,782.13 baht");
    const never = compareSentence(a5, b400, { m: 0.05, p: 400 }, "en");
    expect(never).toBe("Paying the 5% minimum takes 34 years 10 months (interest 10,909.08 baht), while paying a fixed 400.00 baht is not paid off within 100 years");
    expect(never).not.toContain("Difference");
  });
});

describe("durationText", () => {
  test("paid off, never, over 100 years", () => {
    expect(durationText(b1500, "th")).toBe("2 ปี");
    expect(durationText(b400, "th")).toBe("ไม่หมด");
    expect(durationText(b400, "en")).toBe("Never");
    const slow = simulate(A(0.001, 0)); // shrinks too slowly to finish within 100 years
    expect(slow.months).toBeNull();
    expect(durationText(slow, "th")).toBe("เกิน 100 ปี");
    expect(durationText(slow, "en")).toBe("Over 100 years");
  });
});
