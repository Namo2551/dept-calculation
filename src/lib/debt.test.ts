// Ported 1:1 from test.js: same inputs, expected values and tolerances.
// Text/format checks (formatBaht, monthsToText, explain, CSV, compare sentence) live in format.test.ts.
import { describe, expect, test } from "vitest";
import {
  closedFormFixed,
  closedFormPct,
  decodeState,
  encodeState,
  inductionStepDemo,
  requiredPayment,
  simulate,
  simulateMulti,
  splitByYear,
  verifyClosedForm,
  type Card,
  type MultiResult,
  type MultiStrategy,
  type SimResult,
  type SingleOptions,
} from "./debt";

function near(a: number | null, b: number, tol = 0.01) {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(tol);
}

const B0 = 30000;
const APR = 16;
const r = APR / 100 / 12;
const A = (m: number, floor: number): SingleOptions => ({ balance: B0, apr: APR, strategy: "pct", m, floor });
const B = (p: number): SingleOptions => ({ balance: B0, apr: APR, strategy: "fixed", p });
const endAt = (s: SimResult, k: number) => s.rows[k - 1].end;

describe("r และดอกเบี้ยเดือนแรก", () => {
  test("monthly rate and first-month interest", () => {
    near(r, 0.0133333, 1e-6);
    near(simulate(B(1500)).rows[0].interest, 400);
  });
});

describe("วิธี A 5% floor 0", () => {
  const a5 = simulate(A(0.05, 0));
  test("months and interest", () => {
    expect(a5.monthsTo1pct).toBe(124);
    expect(a5.months).toBe(418);
    near(a5.totalInterest, 10909.08);
  });
  test("balances and payments", () => {
    near(endAt(a5, 12), 19161.98);
    near(endAt(a5, 24), 12239.38);
    near(endAt(a5, 60), 3189.46);
    near(a5.rows[0].payment, 1500);
    near(a5.rows[1].payment, 1445);
    near(a5.rows[11].payment, 994.57);
  });
});

describe("วิธี A 10% floor 0", () => {
  const a10 = simulate(A(0.1, 0));
  test("months, interest and balances", () => {
    expect(a10.monthsTo1pct).toBe(51);
    expect(a10.months).toBe(173);
    near(a10.totalInterest, 4615.38);
    near(endAt(a10, 12), 10108.18);
    near(endAt(a10, 24), 3405.84);
    near(endAt(a10, 60), 130.28);
  });
});

describe("วิธี A 5% floor 500", () => {
  test("pays off with a baht floor", () => {
    const a5f = simulate(A(0.05, 500));
    expect(a5f.months).toBe(53);
    near(a5f.totalInterest, 8980.6);
    near(a5f.lastPayment, 410.33);
  });
});

describe("วิธี B", () => {
  test("p = 1500", () => {
    const b1500 = simulate(B(1500));
    expect(b1500.months).toBe(24);
    expect(b1500.monthsTo1pct).toBe(24);
    near(b1500.totalPaid, 35126.95);
    near(b1500.totalInterest, 5126.95);
    near(endAt(b1500, 12), 15787.66);
    near(b1500.lastPayment, 626.95);
  });
  test("p = 2000", () => {
    const b2000 = simulate(B(2000));
    expect(b2000.months).toBe(17);
    near(b2000.totalInterest, 3695.9);
    near(b2000.lastPayment, 1695.9);
  });
  test("p = 1000", () => {
    const b1000 = simulate(B(1000));
    expect(b1000.months).toBe(39);
    near(b1000.totalInterest, 8568.4);
    near(b1000.lastPayment, 568.4);
  });
  test("p = 400 never decreases", () => {
    const b400 = simulate(B(400));
    expect(b400.neverDecreases).toBe(true);
    expect(b400.months).toBeNull();
    near(endAt(b400, 12), 30000);
    near(endAt(b400, 24), 30000);
  });
  test("p = 300 grows", () => {
    const b300 = simulate(B(300));
    expect(b300.neverDecreases).toBe(true);
    near(endAt(b300, 1), 30100);
    near(endAt(b300, 12), 31292.03);
    near(endAt(b300, 24), 32806.64);
  });
});

describe("requiredPayment", () => {
  const req: Record<number, [number, number, number]> = {
    12: [2721.9257, 2722, 2663.04],
    24: [1468.8933, 1469, 5253.01],
    36: [1054.711, 1055, 7966.76],
    60: [729.5417, 730, 13758.28],
  };
  test.each(Object.keys(req).map(Number))("n = %i", (n) => {
    const rp = requiredPayment(B0, APR, n);
    near(rp.exact, req[n][0], 0.001);
    expect(rp.roundedUp).toBe(req[n][1]);
    const s = simulate(B(rp.roundedUp));
    expect(s.months).toBe(n);
    near(s.totalInterest, req[n][2]);
  });
});

describe("สูตรปิด (Recurrence relations) และการตรวจกับตาราง", () => {
  test("closed forms match the table", () => {
    near(closedFormFixed(B0, r, 1500, 12), 15787.659144, 1e-6);
    expect(verifyClosedForm(B(1500), 24)).toBeLessThan(1e-6);
    near(closedFormPct(B0, r, 0.05, 12), 19161.98);
    expect(verifyClosedForm(A(0.05, 0), 124)).toBeLessThan(1e-6);
  });
});

describe("ข้อ 2 (induction): ยอดหนี้วิธี A ไม่เป็นศูนย์", () => {
  test.each([0.01, 0.05, 0.1, 0.5])("m = %f stays positive for n = 0..100", (m) => {
    for (let n = 0; n <= 100; n++) expect(closedFormPct(B0, r, m, n)).toBeGreaterThan(0);
  });
});

describe("ข้อ 3 (induction): จ่ายไม่เกินดอกเบี้ยเดือนแรก หนี้ไม่ลด", () => {
  test.each([400, 300, 100])("p = %i", (p) => {
    const s = simulate(B(p));
    expect(s.neverDecreases).toBe(true);
    expect(s.rows.length).toBe(120);
    expect(s.rows.every((w) => w.end >= 30000 - 1e-9)).toBe(true);
  });
  test("p = 1500 decreases", () => {
    expect(simulate(B(1500)).neverDecreases).toBe(false);
  });
});

const sum = <T,>(a: T[], key: keyof T) => a.reduce((s, x) => s + (x[key] as unknown as number), 0);

describe("splitByYear", () => {
  test("method B", () => {
    const yb = splitByYear(simulate(B(1500)).rows);
    expect(yb.length).toBe(2);
    near(yb[0].interest, 3787.66);
    near(yb[0].principal, 14212.34);
    near(yb[1].interest, 1339.29);
    near(yb[1].principal, 15787.66);
    near(sum(yb, "interest"), 5126.95);
    near(sum(yb, "principal"), 30000);
  });
  test("method A", () => {
    const ya = splitByYear(simulate(A(0.05, 0)).rows);
    expect(ya.length).toBe(35);
    near(ya[0].interest, 3941.1);
    near(ya[0].principal, 10838.02);
    near(ya[1].interest, 2517.31);
    near(ya[1].principal, 6922.6);
  });
});

describe("inductionStepDemo (Mathematical reasoning)", () => {
  test("recurrence equals closed form for k = 0..60", () => {
    for (let k = 0; k <= 60; k++) expect(inductionStepDemo({ balance: B0, apr: APR, p: 1500, k }).diff).toBeLessThan(1e-6);
    near(inductionStepDemo({ balance: B0, apr: APR, p: 1500, k: 11 }).nextByClosedForm, 15787.659144, 1e-6);
  });
});

describe("simulateMulti", () => {
  const cards: Card[] = [
    { name: "บัตร A", balance: 20000, apr: 24, m: 0.05, floor: 200 },
    { name: "บัตร B", balance: 8000, apr: 18, m: 0.05, floor: 200 },
    { name: "บัตร C", balance: 3000, apr: 12, m: 0.05, floor: 200 },
  ];
  const multi = (strategy: MultiStrategy, budget: number) => simulateMulti({ cards, budget, strategy });
  type Expect = { months: number | null; paid?: number[]; interest: number; totalPaid?: number; ends?: number[]; last?: number; low?: boolean };
  function checkMulti(res: MultiResult, x: Expect) {
    expect(res.months).toBe(x.months);
    if (x.paid) expect(res.paidOffMonth).toEqual(x.paid);
    near(res.totalInterest, x.interest);
    if (x.totalPaid) near(res.totalPaid, x.totalPaid);
    x.ends?.forEach((v, i) => near(res.totals[i].balance, v));
    if (x.last) near(res.totals[res.totals.length - 1].payment, x.last);
    if (x.low !== undefined) expect(res.budgetTooLow).toBe(x.low);
  }
  test("avalanche 3000", () =>
    checkMulti(multi("avalanche", 3000), { months: 12, paid: [10, 12, 12], interest: 3390.91, totalPaid: 34390.91, ends: [28550, 26054.1, 23511.35], last: 1390.91, low: false }));
  test("snowball 3000", () =>
    checkMulti(multi("snowball", 3000), { months: 12, paid: [12, 6, 2], interest: 3827.52, totalPaid: 34827.52, ends: [28550, 26068.1, 23553.21], last: 1827.52 }));
  test("minonly", () =>
    checkMulti(multi("minonly", 3000), { months: 79, paid: [79, 44, 17], interest: 14598.37, totalPaid: 45598.37, ends: [29950, 28926.1, 27927.4] }));
  test("avalanche 2000", () => checkMulti(multi("avalanche", 2000), { months: 19, interest: 5474.99 }));
  test("snowball 2000", () => checkMulti(multi("snowball", 2000), { months: 19, interest: 5965.28 }));
  test("avalanche 1000", () => checkMulti(multi("avalanche", 1000), { months: 45, interest: 13731.21, low: true }));
  test("first-month combined balance 31000 + 550 - 3000", () => near(31000 + 550 - 3000, multi("avalanche", 3000).totals[0].balance));
});

describe("encodeState / decodeState", () => {
  test("round trip", () => {
    const st = { single: { bal: "30,000", apr: 16.5, m: 7.5 }, cards: [{ name: "บัตรเงินสด ใบที่ ๑", balance: 1234.56, apr: 18.25 }], budget: 3000 };
    expect(JSON.stringify(decodeState(encodeState(st)))).toBe(JSON.stringify(st));
  });
  test("invalid input gives null", () => {
    expect(decodeState("%%%")).toBeNull();
  });
});
