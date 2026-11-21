import { describe, expect, test } from "vitest";
import { binomialPmf, expectedMisses, missAtLeastOnce, missBuckets, mulberry32, simulateMisses } from "./risk";

describe("missed payment odds (Ch 7)", () => {
  test("complement rule and expected value", () => {
    expect(missAtLeastOnce(0.05)).toBeCloseTo(0.4596399, 6);
    expect(expectedMisses(0.05)).toBeCloseTo(0.6, 10);
    expect(missAtLeastOnce(0)).toBe(0);
  });

  test("binomial distribution of missed months in a year", () => {
    expect(binomialPmf(12, 1, 0.05)).toBeCloseTo(0.3412801, 6);
    const b = missBuckets(0.05);
    const want = [0.5403601, 0.3412801, 0.0987916, 0.0173319, 0.0022364];
    b.forEach((x, i) => expect(x).toBeCloseTo(want[i], 6));
    expect(b.reduce((a, c) => a + c, 0)).toBeCloseTo(1, 12);
  });

  test("mulberry32 is repeatable for a seed and stays in [0, 1)", () => {
    const a = mulberry32(12345), b = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("simulateMisses", () => {
  const base = { balance: 30000, apr: 16, p: 1500, fee: 300 };

  test("with no misses every path matches the plan", () => {
    const r = simulateMisses({ ...base, q: 0 })!;
    expect(r.paths).toBe(1000);
    expect(r.baselineMonths).toBe(24);
    expect(r.medianMonths).toBe(24);
    expect(r.p90Months).toBe(24);
    expect(r.avgExtraCost).toBeCloseTo(0, 8);
    expect(r.defaultShare).toBe(0);
    expect(r.unpaidShare).toBe(0);
  });

  test("the same inputs give the same result (seeded)", () => {
    expect(simulateMisses({ ...base, q: 0.05 })).toEqual(simulateMisses({ ...base, q: 0.05 }));
  });

  test("missing payments makes it later and dearer", () => {
    const r = simulateMisses({ ...base, q: 0.05 })!;
    expect(r.medianMonths).toBeGreaterThanOrEqual(24);
    expect(r.avgExtraCost).toBeGreaterThan(0);
    expect(r.defaultShare).toBeGreaterThanOrEqual(0);
    expect(r.defaultShare).toBeLessThanOrEqual(1);
  });

  test("a payment that never reduces the debt has nothing to simulate", () => {
    expect(simulateMisses({ ...base, p: 400, q: 0.05 })).toBeNull();
  });

  test("a heavy case stays bounded and never returns NaN", { timeout: 2000 }, () => {
    const r = simulateMisses({ balance: 30000, apr: 16, p: 420, q: 0.5, fee: 300 })!;
    for (const v of [r.medianMonths, r.p90Months]) expect(v === null || Number.isFinite(v)).toBe(true);
    expect(Number.isFinite(r.avgExtraCost)).toBe(true);
    expect(r.unpaidShare).toBeGreaterThanOrEqual(0);
  });
});
