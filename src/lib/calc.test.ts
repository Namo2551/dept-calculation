import { describe, expect, test } from "vitest";
import { computeMulti, computeSingle, multiIsValid, singleIsValid } from "./calc";
import { formatBahtShort } from "./format";
import { defaultState } from "./state";

describe("singleIsValid / multiIsValid", () => {
  test("defaults are valid; one bad field makes it invalid", () => {
    const s = defaultState();
    expect(singleIsValid(s.single)).toBe(true);
    expect(singleIsValid({ ...s.single, bal: "abc" })).toBe(false);
    expect(multiIsValid(s.multi)).toBe(true);
    expect(multiIsValid({ ...s.multi, budget: "-1" })).toBe(false);
    const cards = s.multi.cards.map((c) => ({ ...c }));
    cards[1].apr = "200";
    expect(multiIsValid({ ...s.multi, cards })).toBe(false);
    cards[1].apr = "18";
    cards[1].name = "";
    expect(multiIsValid({ ...s.multi, cards })).toBe(true); // names are free text
  });
});

describe("computeSingle", () => {
  test("defaults", () => {
    const c = computeSingle(defaultState().single);
    expect(c.v).toEqual({ bal: 30000, apr: 16, m: 5, floor: 0, p: 1500, n: 24 });
    expect(c.pA).toEqual({ balance: 30000, apr: 16, strategy: "pct", m: 0.05, floor: 0 });
    expect(c.pB).toEqual({ balance: 30000, apr: 16, strategy: "fixed", p: 1500 });
    expect(c.A.months).toBe(418);
    expect(c.B.months).toBe(24);
  });
});

describe("computeMulti", () => {
  test("defaults pick avalanche as least interest", () => {
    const c = computeMulti(defaultState().multi, "Unnamed");
    expect(c.budget).toBe(3000);
    expect(c.results.avalanche.months).toBe(12);
    expect(c.best).toBe("avalanche");
    expect(c.minSum).toBeCloseTo(1600, 6); // 1000 + 400 + 200 (card C: 5% is 150, its floor is 200)
    expect(c.cards[0]).toEqual({ name: "Card A", balance: 20000, apr: 24, m: 0.05, floor: 200 });
  });
  test("blank names use the fallback", () => {
    const multi = defaultState().multi;
    multi.cards[0].name = "   ";
    expect(computeMulti(multi, "Unnamed").cards[0].name).toBe("Unnamed");
  });
  test("no best when every strategy runs past 100 years", () => {
    const multi = defaultState().multi;
    multi.budget = "0";
    multi.cards.forEach((c) => { c.m = "0.1"; c.floor = "0"; });
    expect(computeMulti(multi, "x").best).toBeNull();
  });
});

describe("formatBahtShort", () => {
  test("drops .00 only", () => {
    expect(formatBahtShort(1469)).toBe("1,469");
    expect(formatBahtShort(1469.5)).toBe("1,469.50");
  });
});
