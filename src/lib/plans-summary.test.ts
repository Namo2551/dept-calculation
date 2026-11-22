import { describe, expect, test } from "vitest";
import { simulate } from "./debt";
import { simulateWithBonus } from "./plans";
import { balanceCurve, comparePlans, monthsLabel, payoffISO, summarizePlan, type PlanInputs } from "./plans-summary";

const base: PlanInputs = {
  balance: 30000,
  apr: 16,
  min_pct: 5,
  min_floor: 0,
  fixed_payment: 1500,
  target_months: 24,
  interest_limit: 3000,
  bonus_amount: null,
  bonus_month: null,
  start_date: "2026-01-31",
};

describe("payoffISO", () => {
  test("month k ends k months after the start, clamped to short months", () => {
    expect(payoffISO("2026-01-31", 1)).toBe("2026-02-28");
    expect(payoffISO("2026-11-22", 24)).toBe("2028-11-22");
    expect(payoffISO("2026-11-22", null)).toBeNull();
  });
});

describe("summarizePlan", () => {
  test("method A and B match simulate", () => {
    const s = summarizePlan(base);
    const B = simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 1500 });
    const A = simulate({ balance: 30000, apr: 16, strategy: "pct", m: 0.05, floor: 0 });
    expect(s.B.months).toBe(B.months);
    expect(s.B.totalInterest).toBeCloseTo(B.totalInterest!, 8);
    expect(s.A.months).toBe(A.months);
    expect(s.payoffB).toBe(payoffISO(base.start_date, B.months));
    expect(s.bonus).toBeNull();
  });
  test("a bonus is simulated on top of method B", () => {
    const s = summarizePlan({ ...base, bonus_amount: 5000, bonus_month: 3 });
    const expected = simulateWithBonus({ balance: 30000, apr: 16, p: 1500, amount: 5000, month: 3 });
    expect(s.bonus).not.toBeNull();
    expect(s.bonus!.months).toBe(expected.months);
    expect(s.bonus!.payoff).toBe(payoffISO(base.start_date, expected.months));
  });
  test("a payment below the interest never ends", () => {
    const s = summarizePlan({ ...base, fixed_payment: 300 });
    expect(s.B.months).toBeNull();
    expect(s.B.neverDecreases).toBe(true);
    expect(s.payoffB).toBeNull();
  });
});

describe("balanceCurve", () => {
  test("starts at the balance and follows each month's end balance", () => {
    const B = simulate({ balance: 1000, apr: 12, strategy: "fixed", p: 600 });
    expect(balanceCurve(1000, B)).toEqual([1000, B.rows[0].end, B.rows[1].end]);
  });
});

describe("comparePlans", () => {
  test("names the cheaper and faster plan with the differences", () => {
    const a = summarizePlan(base);
    const b = summarizePlan({ ...base, fixed_payment: 2000 });
    const c = comparePlans(a, b);
    expect(c.cheaper).toBe("b");
    expect(c.interestDiff).toBeCloseTo(a.B.totalInterest! - b.B.totalInterest!, 8);
    expect(c.faster).toBe("b");
    expect(c.monthsDiff).toBe(a.B.months! - b.B.months!);
  });
  test("equal plans are the same", () => {
    const a = summarizePlan(base);
    const c = comparePlans(a, a);
    expect(c.cheaper).toBe("same");
    expect(c.faster).toBe("same");
    expect(c.interestDiff).toBe(0);
  });
  test("cannot compare when one never ends", () => {
    const c = comparePlans(summarizePlan(base), summarizePlan({ ...base, fixed_payment: 100 }));
    expect(c.cheaper).toBeNull();
    expect(c.faster).toBeNull();
  });
});

describe("monthsLabel", () => {
  test("months as text, or never / over 100 years", () => {
    expect(monthsLabel(simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 1500 }))).toBe("2 years");
    expect(monthsLabel(simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 100 }))).toBe("Never");
  });
});
