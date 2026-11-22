// Turn validated raw inputs into simulation results. Pure: callers pass only inputs that passed validation.
import { simulate, simulateMulti, type Card, type MultiResult, type MultiStrategy, type SimResult, type SingleOptions } from "./debt";
import { validate, type AppState, type RuleKey, type SingleRaw } from "./state";

export type SingleCalc = {
  v: { bal: number; apr: number; m: number; floor: number; p: number; n: number }; // m in percent
  pA: SingleOptions; // m as a fraction
  pB: SingleOptions;
  A: SimResult;
  B: SimResult;
};

export type MultiCalc = {
  cards: Card[];
  budget: number;
  results: Record<MultiStrategy, MultiResult>;
  best: MultiStrategy | null;
  minSum: number; // sum of every card's minimum in month 1
};

export const STRATEGIES: MultiStrategy[] = ["minonly", "avalanche", "snowball"];
const CORE_KEYS: (keyof SingleRaw)[] = ["bal", "apr", "m", "floor", "p", "n"];
const CARD_RULES: ("balance" | "apr" | "m" | "floor")[] = ["balance", "apr", "m", "floor"];

const num = (key: RuleKey, raw: string) => validate(key, raw) as number;

export function singleIsValid(s: SingleRaw): boolean {
  return CORE_KEYS.every((k) => validate(k, s[k]) !== null);
}

// The new inputs when they are all valid, otherwise the last valid ones.
export function keepValid(prev: SingleRaw, raw: SingleRaw): SingleRaw {
  return singleIsValid(raw) ? raw : prev;
}

export function multiIsValid(m: AppState["multi"]): boolean {
  return validate("budget", m.budget) !== null && m.cards.every((c) => CARD_RULES.every((k) => validate(k, c[k]) !== null));
}

export function computeSingle(s: SingleRaw): SingleCalc {
  const v = { bal: num("bal", s.bal), apr: num("apr", s.apr), m: num("m", s.m), floor: num("floor", s.floor), p: num("p", s.p), n: num("n", s.n) };
  const pA: SingleOptions = { balance: v.bal, apr: v.apr, strategy: "pct", m: v.m / 100, floor: v.floor };
  const pB: SingleOptions = { balance: v.bal, apr: v.apr, strategy: "fixed", p: v.p };
  return { v, pA, pB, A: simulate(pA), B: simulate(pB) };
}

export function computeMulti(m: AppState["multi"], unnamed: string): MultiCalc {
  const cards: Card[] = m.cards.map((c) => ({
    name: c.name.trim() || unnamed,
    balance: num("balance", c.balance),
    apr: num("apr", c.apr),
    m: num("m", c.m) / 100,
    floor: num("floor", c.floor),
  }));
  const budget = num("budget", m.budget);
  const results = Object.fromEntries(STRATEGIES.map((strategy) => [strategy, simulateMulti({ cards, budget, strategy })])) as Record<MultiStrategy, MultiResult>;
  // least total interest wins; a near-tie (under half a satang) keeps the earlier strategy
  let best: MultiStrategy | null = null;
  STRATEGIES.forEach((s) => {
    const t = results[s].totalInterest;
    if (t !== null && (best === null || t < results[best].totalInterest! - 0.005)) best = s;
  });
  return { cards, budget, results, best, minSum: results.minonly.totals[0].payment };
}
