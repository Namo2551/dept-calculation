import { describe, expect, test } from "vitest";
import { encodeState } from "./debt";
import {
  EXAMPLES,
  STORAGE_KEY,
  defaultState,
  isValidState,
  loadState,
  newCard,
  parseNumber,
  saveState,
  shareUrl,
  validate,
  type RuleKey,
} from "./state";

describe("defaults and examples", () => {
  test("defaults match the current site", () => {
    const d = defaultState();
    expect(d.single).toEqual({ bal: "30,000", apr: "16", m: "5", floor: "0", p: "1,500", n: "24", q: "5", fee: "300" });
    expect(d.multi.budget).toBe("3,000");
    expect(d.multi.cards.map((c) => c.name)).toEqual(["Card A", "Card B", "Card C"]);
    expect(d.multi.cards[0]).toEqual({ name: "Card A", balance: "20,000", apr: "24", m: "5", floor: "200" });
    expect(STORAGE_KEY).toBe("debtcalc.v1");
  });
  test("examples and new cards", () => {
    expect(EXAMPLES.ex2.floor).toBe("500");
    expect(EXAMPLES.ex400.p).toBe("400");
    expect(newCard(3)).toEqual({ name: "Card D", balance: "5,000", apr: "16", m: "5", floor: "200" });
    expect(newCard(4).name).toBe("Card E");
  });
});

describe("parseNumber and validate", () => {
  test("parseNumber strips commas, spaces and baht sign", () => {
    expect(parseNumber(" ฿1,500 ")).toBe(1500);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
  });
  test.each([
    ["bal", "", null], ["bal", "30,0", 300], ["bal", "abc", null], ["bal", "1e3", 1000], ["bal", "0", null],
    ["apr", "0", 0], ["apr", "100.1", null], ["m", "0.05", null], ["m", "0.1", 0.1], ["n", "24.5", null],
    ["n", "1200", 1200], ["n", "0", null], ["p", " ฿1,500 ", 1500], ["floor", "-1", null], ["budget", "0", 0], ["balance", "5,000", 5000],
  ] as const)("validate(%s, %j) = %j", (k, raw, out) => expect(validate(k as RuleKey, raw)).toBe(out));
});

describe("isValidState", () => {
  test("rejects card counts outside 2..5 and bad shapes", () => {
    const one = defaultState();
    one.multi.cards = one.multi.cards.slice(0, 1);
    expect(isValidState(one)).toBe(false);
    const six = defaultState();
    six.multi.cards = [...six.multi.cards, ...six.multi.cards];
    expect(isValidState(six)).toBe(false);
    expect(isValidState(null)).toBe(false);
    expect(isValidState("tool")).toBe(false);
    expect(isValidState(defaultState())).toBe(true);
  });
});

describe("missed-payment inputs", () => {
  test("chance of missing is 0 to 50 percent, late fee 0 to 2,000 baht", () => {
    expect(validate("q", "50")).toBe(50);
    expect(validate("q", "0")).toBe(0);
    expect(validate("q", "60")).toBeNull();
    expect(validate("q", "")).toBeNull();
    expect(validate("fee", "2,000")).toBe(2000);
    expect(validate("fee", "-1")).toBeNull();
    expect(validate("fee", "abc")).toBeNull();
  });
});

describe("loadState", () => {
  test("old share link from the current site loads", () => {
    const old = {
      single: { bal: "45,000", apr: "18.5", m: "5", floor: "300", p: "2,000", n: "36" },
      multi: { budget: "3,000", cards: [
        { name: "บัตรเงินสด ใบที่ ๑", balance: "1,234.56", apr: "18.25", m: "5", floor: "200" },
        { name: "บัตร B", balance: "8,000", apr: "18", m: "5", floor: "200" },
      ] },
    };
    const r = loadState({ hash: "#" + encodeURIComponent(JSON.stringify(old)), storage: null });
    expect(r.source).toBe("link");
    // links made before the missed-payment section get its defaults and keep everything else
    expect(r.state).toEqual({ ...old, single: { ...old.single, q: "5", fee: "300" } });
  });
  test("anchor hash falls through to saved state", () => {
    const saved = defaultState();
    saved.single.bal = "12,345";
    const storage = { getItem: (k: string) => (k === "debtcalc.v1" ? JSON.stringify(saved) : null) };
    expect(loadState({ hash: "#tool", storage })).toEqual({ state: saved, source: "saved" });
  });
  test("storage that throws gives defaults, and saving never throws", () => {
    const storage = { getItem: () => { throw new Error("SecurityError"); } };
    expect(loadState({ hash: "", storage })).toEqual({ state: defaultState(), source: "default" });
    expect(() => saveState({ setItem: () => { throw new Error("QuotaExceeded"); } }, defaultState())).not.toThrow();
    expect(() => saveState(null, defaultState())).not.toThrow();
  });
  test("numeric values from old links are normalized to strings", () => {
    const st = { single: { bal: 30000, apr: 16, m: 5, floor: 0, p: 1500, n: 24 },
      multi: { budget: 3000, cards: [{ name: "a", balance: 1, apr: 2, m: 3, floor: 4 }, { name: "b", balance: 5, apr: 6, m: 7, floor: 8 }] } };
    const r = loadState({ hash: "#" + encodeState(st), storage: null });
    expect(r.source).toBe("link");
    expect(r.state.single.bal).toBe("30000");
    expect(r.state.multi.budget).toBe("3000");
    expect(r.state.multi.cards[1].floor).toBe("8");
  });
  test("saveState writes the same JSON the old site read", () => {
    let written: [string, string] | null = null;
    saveState({ setItem: (k, v) => { written = [k, v]; } }, defaultState());
    expect(written).toEqual(["debtcalc.v1", JSON.stringify(defaultState())]);
  });
});

describe("shareUrl", () => {
  test("replaces an existing hash", () => {
    expect(shareUrl("https://x.dev/#tool", defaultState())).toBe("https://x.dev/#" + encodeState(defaultState()));
    expect(shareUrl("https://x.dev/", defaultState())).toBe("https://x.dev/#" + encodeState(defaultState()));
  });
});
