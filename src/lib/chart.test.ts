import { describe, expect, test } from "vitest";
import { simulate, splitByYear, type SingleOptions } from "./debt";
import { balanceSeries, chartLength, groupYears, niceMax, playStep, shortBaht, xTickLabel, xTickStep } from "./chart";

const A = (m: number, floor: number): SingleOptions => ({ balance: 30000, apr: 16, strategy: "pct", m, floor });
const B = (p: number): SingleOptions => ({ balance: 30000, apr: 16, strategy: "fixed", p });

describe("niceMax", () => {
  test.each([[0, 1], [NaN, 1], [-5, 1], [Infinity, 1], [31000, 50000], [20000, 20000], [2400, 2500], [1e9, 1e9], [1, 1]])(
    "niceMax(%f) = %f", (x, out) => expect(niceMax(x)).toBe(out));
});

describe("shortBaht", () => {
  test("units", () => {
    expect(shortBaht(1250000)).toBe("1.25M");
    expect(shortBaht(20000)).toBe("20k");
    expect(shortBaht(950)).toBe("950");
  });
});

describe("balanceSeries", () => {
  test("paid-off series pads with zeros", () => {
    const s = balanceSeries(simulate(B(1500)), 30000, 30);
    expect(s.length).toBe(31);
    expect(s[0]).toBe(30000);
    expect(Math.abs(s[24])).toBeLessThan(1e-9);
    expect(s[30]).toBe(0);
  });
  test("never-ending series stops at simulated months", () => {
    expect(balanceSeries(simulate(B(400)), 30000, 200).length).toBe(121);
  });
});

describe("chartLength and ticks", () => {
  test("chartLength", () => {
    const a5 = simulate(A(0.05, 0));
    const b1500 = simulate(B(1500));
    expect(chartLength(a5, b1500, "all")).toBe(418);
    expect(chartLength(a5, b1500, "60")).toBe(60);
    expect(chartLength(simulate(B(30000)), simulate(B(30000)), "all")).toBe(12); // minimum 12 months
    expect(chartLength(simulate(A(0.001, 0)), b1500, "all")).toBe(480); // capped at 40 years
  });
  test("xTickStep thresholds", () => {
    expect([24, 25, 60, 61, 120, 121, 240, 241].map(xTickStep)).toEqual([6, 12, 12, 24, 24, 60, 60, 120]);
  });
  test("xTickLabel per language", () => {
    expect(xTickLabel(6, 6, "th")).toBe("6 ด.");
    expect(xTickLabel(6, 6, "en")).toBe("6 mo");
    expect(xTickLabel(24, 12, "th")).toBe("2 ปี");
    expect(xTickLabel(24, 12, "en")).toBe("2 yr");
  });
});

describe("groupYears", () => {
  test("35 years group into 5-year bars with hyphen labels", () => {
    const g = groupYears(splitByYear(simulate(A(0.05, 0)).rows));
    expect(g.length).toBe(7);
    expect(g[0].label).toBe("1-5");
    expect(g[6].label).toBe("31-35");
    expect(Math.abs(g.reduce((s, x) => s + x.interest, 0) - 10909.08)).toBeLessThanOrEqual(0.01);
  });
  test("15 years or fewer stay yearly", () => {
    const g = groupYears(splitByYear(simulate(B(1500)).rows));
    expect(g.map((x) => x.label)).toEqual(["1", "2"]);
  });
  test("last group ends at the real last year", () => {
    const g = groupYears(splitByYear(simulate(A(0.1, 0)).rows)); // 173 months = 15 years -> yearly
    expect(g.length).toBe(15);
    const longer = groupYears(splitByYear(simulate(A(0.05, 500)).rows)); // 53 months, 5 years
    expect(longer.length).toBe(5);
  });
});

describe("playStep", () => {
  test("scales with length and speed", () => {
    expect(playStep(418, 2)).toBe(6);
    expect(playStep(24, 1)).toBe(1);
    expect(playStep(480, 4)).toBe(16);
  });
});
