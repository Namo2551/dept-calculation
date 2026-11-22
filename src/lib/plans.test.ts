import { describe, expect, test } from "vitest";
import { simulate } from "./debt";
import { paymentForInterestLimit, simulateWithBonus } from "./plans";

const base = { balance: 30000, apr: 16, p: 1500 };

describe("simulateWithBonus", () => {
  test("a zero bonus matches the plain plan", () => {
    const r = simulateWithBonus({ ...base, amount: 0, month: 6 });
    expect(r.months).toBe(24);
    expect(r.totalInterest!).toBeCloseTo(5126.95, 2);
    expect(r.afterPayoff).toBe(false);
  });

  test("a bonus makes it shorter and cheaper", () => {
    const r = simulateWithBonus({ ...base, amount: 10000, month: 6 });
    expect(r.months!).toBeLessThan(24);
    expect(r.totalInterest!).toBeLessThan(5126.95);
  });

  test("a bonus bigger than what is left clears the debt that month", () => {
    const r = simulateWithBonus({ ...base, amount: 100000, month: 3 });
    expect(r.months).toBe(3);
    expect(r.totalInterest!).toBeGreaterThan(0);
  });

  test("a bonus after the plan already ended changes nothing", () => {
    const r = simulateWithBonus({ ...base, amount: 5000, month: 30 });
    expect(r.afterPayoff).toBe(true);
    expect(r.months).toBe(24);
  });

  test("a big bonus can end a plan that never ends on its own", () => {
    const r = simulateWithBonus({ ...base, p: 400, amount: 30000, month: 1 });
    expect(r.months).not.toBeNull();
  });
});

describe("paymentForInterestLimit (binary search)", () => {
  test("finds the smallest whole-baht payment under the limit", () => {
    const r = paymentForInterestLimit(30000, 16, 3000);
    expect(r.payment).toBe(2431);
    expect(r.reachable).toBe(true);
    expect(r.interest).toBeLessThanOrEqual(3000);
    expect(r.months).toBe(14);
    expect(simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 2430 }).totalInterest!).toBeGreaterThan(3000);
    expect(r.steps.length).toBeGreaterThanOrEqual(1);
    expect(r.steps.length).toBeLessThanOrEqual(20);
  });

  test("an impossible limit says so and returns the pay-it-all amount", () => {
    const r = paymentForInterestLimit(30000, 16, 0);
    expect(r.reachable).toBe(false);
    expect(r.payment).toBe(30400);
    expect(r.interest).toBeCloseTo(400, 6);
  });

  test("every step halves the range and the guesses agree with the answer", () => {
    const { steps, payment } = paymentForInterestLimit(30000, 16, 3000);
    for (const s of steps) {
      expect(s.guess).toBeGreaterThanOrEqual(s.low);
      expect(s.guess).toBeLessThanOrEqual(s.high);
      expect(s.ok).toBe(s.guess >= payment);
    }
  });
});
