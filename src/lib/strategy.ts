// Repayment strategy comparison on the user's real debts. Pure: no DOM, no React, no database.
// [Ch 3 Algorithms] Avalanche and snowball are greedy rules: each month, after every minimum, the money left
// goes to one debt chosen by a simple priority (highest APR, or smallest balance).
// [Ch 8 Recurrence relations] Each debt still follows B(k) = B(k-1)·(1 + r) - payment(k), r = APR / 12.
// The totals come from simulateMulti in debt.ts; monthlyRows repeats its month step only to show the
// payment to each debt (debt.ts reports totals), and the tests check both agree month by month.
import { simulateMulti, type Card, type MultiResult, type MultiStrategy } from "./debt";
import { addMonths, parseDate, toISODate } from "./ledger";
import type { DebtOverview } from "./overview";

const EPS_PAID = 0.005; // same as debt.ts: half a satang or less counts as paid off
const MAX_MONTHS = 1200; // same as debt.ts
export const MAX_BUDGET = 1e9;
const MAX_INPUT = 20;

export const PLANS: MultiStrategy[] = ["avalanche", "snowball", "minonly"];

export type StrategyDebt = { id: string; name: string; balance: number; apr: number; minPct: number | null; minAmount: number };

// Active debts (not archived, not paid off) with today's balance from the payment ledger.
export function activeDebts(items: DebtOverview[]): StrategyDebt[] {
  return items
    .filter((i) => i.debt.status === "active" && !i.ledger.paidOff && i.ledger.balance > EPS_PAID)
    .map((i) => ({ id: i.debt.id, name: i.debt.name, balance: i.ledger.balance, apr: i.debt.apr, minPct: i.debt.min_pct, minAmount: i.debt.min_amount }));
}

// debt.ts Card: m is the minimum percent as a fraction, floor the minimum amount. No percent = amount only.
export function toCard(d: StrategyDebt): Card {
  return { name: d.name, balance: d.balance, apr: d.apr, m: (d.minPct ?? 0) / 100, floor: d.minAmount };
}

function minimumOf(c: Card, balance: number): number {
  const due = balance * (1 + c.apr / 100 / 12);
  return Math.min(Math.max(c.m * balance, c.floor || 0), due);
}

// Sum of this month's minimums, with the rule simulateMulti uses (never more than what is owed).
export function minimumsTotal(debts: StrategyDebt[]): number {
  return debts.map(toCard).reduce((a, c) => a + minimumOf(c, c.balance), 0);
}

// The suggested budget: the minimums rounded up to the next 100 baht.
export function defaultBudget(debts: StrategyDebt[]): number {
  return Math.max(0, Math.ceil(minimumsTotal(debts) / 100 - 1e-9) * 100);
}

export type BudgetError = "invalid" | "negative" | "tooBig";
export type BudgetInput = { budget: number; input: string; error: BudgetError | null };

// ?budget= from the URL. Blank uses the fallback; a bad value is reported and the fallback is used for results.
export function parseBudget(raw: string | string[] | undefined, fallback: number): BudgetInput {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const input = (first ?? "").trim().slice(0, MAX_INPUT);
  if (input === "") return { budget: fallback, input: String(fallback), error: null };
  const clean = input.replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(clean) && !/^-?\d+(\.\d+)?e\d+$/i.test(clean)) return { budget: fallback, input, error: "invalid" };
  const v = Number(clean);
  if (!Number.isFinite(v)) return { budget: fallback, input, error: "invalid" };
  if (v < 0) return { budget: fallback, input, error: "negative" };
  if (v > MAX_BUDGET) return { budget: fallback, input, error: "tooBig" };
  return { budget: v, input, error: null };
}

export function parsePlan(raw: string | string[] | undefined, fallback: MultiStrategy): MultiStrategy {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return PLANS.includes(v as MultiStrategy) ? (v as MultiStrategy) : fallback;
}

// 'YYYY-MM-DD' n months after today (month 1 is next month's payment).
export function monthDate(todayISO: string, n: number): string {
  return toISODate(addMonths(parseDate(todayISO), n));
}

export type MonthRow = { month: number; payments: number[]; balances: number[] };

// The month-by-month detail behind simulateMulti: the payment to each debt and each balance after it.
export function monthlyRows(cards: Card[], budget: number, strategy: MultiStrategy): MonthRow[] {
  const n = cards.length;
  const bal = cards.map((c) => c.balance);
  const done = cards.map(() => false);
  const rows: MonthRow[] = [];
  for (let k = 1; k <= MAX_MONTHS && done.some((d) => !d); k++) {
    const active: number[] = [];
    const due: number[] = [];
    const minPay: number[] = [];
    const pay: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      due[i] = bal[i] * (1 + cards[i].apr / 100 / 12);
      minPay[i] = minimumOf(cards[i], bal[i]);
      active.push(i);
    }
    if (strategy === "minonly") {
      active.forEach((i) => (pay[i] = minPay[i]));
    } else {
      const order = active.slice().sort((x, y) => {
        const d = strategy === "avalanche" ? cards[y].apr - cards[x].apr : bal[x] - bal[y];
        return d !== 0 ? d : x - y;
      });
      let left = budget;
      order.forEach((i) => {
        const t = Math.min(minPay[i], left);
        pay[i] = t;
        left -= t;
      });
      order.forEach((i) => {
        const t = Math.min(due[i] - pay[i], left);
        pay[i] += t;
        left -= t;
      });
    }
    active.forEach((i) => {
      const end = due[i] - pay[i];
      if (end <= EPS_PAID) {
        done[i] = true;
        bal[i] = 0;
      } else bal[i] = end;
    });
    rows.push({ month: k, payments: pay, balances: bal.slice() });
  }
  return rows;
}

export type PayoffStep = { id: string; name: string; month: number | null; dateISO: string | null };

export type PlanSummary = {
  strategy: MultiStrategy;
  months: number | null; // null: not cleared within 100 years
  debtFreeISO: string | null;
  totalInterest: number | null;
  totalPaid: number;
  interestSaved: number | null; // vs minimum payments only; null when that never ends (or this plan never ends)
  order: PayoffStep[]; // by payoff month, debts that never clear last
  firstPayoffMonth: number | null;
  balances: number[]; // total balance for months 0..months (chart)
  result: MultiResult;
};

export type Comparison = {
  budget: number;
  minSum: number;
  budgetTooLow: boolean;
  plans: Record<MultiStrategy, PlanSummary>;
  recommended: "avalanche" | "snowball" | null; // least interest, then fewer months; null if neither ends
  single: boolean; // one debt: the two methods are identical
  same: boolean; // avalanche and snowball give the same result
  cheaper: { strategy: "avalanche" | "snowball"; by: number } | null; // null when equal (or one never ends)
  firstSooner: { strategy: "avalanche" | "snowball"; months: number } | null; // which clears its first debt sooner
};

const NEAR = 0.005;

export function compareStrategies(debts: StrategyDebt[], budget: number, todayISO: string): Comparison {
  const cards = debts.map(toCard);
  const B0 = cards.reduce((a, c) => a + c.balance, 0);
  const results = Object.fromEntries(PLANS.map((s) => [s, simulateMulti({ cards, budget, strategy: s })])) as Record<MultiStrategy, MultiResult>;
  const minInterest = results.minonly.totalInterest;

  const summary = (s: MultiStrategy): PlanSummary => {
    const r = results[s];
    const order = debts
      .map((d, i) => ({ id: d.id, name: d.name, month: r.paidOffMonth[i], dateISO: r.paidOffMonth[i] === null ? null : monthDate(todayISO, r.paidOffMonth[i]!) }))
      .map((x, i) => ({ ...x, i }))
      .sort((a, b) => (a.month ?? Infinity) - (b.month ?? Infinity) || a.i - b.i)
      .map(({ i: _i, ...x }) => x);
    const cleared = r.paidOffMonth.filter((m): m is number => m !== null);
    return {
      strategy: s,
      months: r.months,
      debtFreeISO: r.months === null ? null : monthDate(todayISO, r.months),
      totalInterest: r.totalInterest,
      totalPaid: r.totalPaid,
      interestSaved: s === "minonly" ? (minInterest === null ? null : 0) : minInterest === null || r.totalInterest === null ? null : minInterest - r.totalInterest,
      order,
      firstPayoffMonth: cleared.length ? Math.min(...cleared) : null,
      balances: [B0, ...r.totals.map((t) => t.balance)],
      result: r,
    };
  };
  const plans = Object.fromEntries(PLANS.map((s) => [s, summary(s)])) as Record<MultiStrategy, PlanSummary>;
  const av = plans.avalanche;
  const sn = plans.snowball;

  let recommended: Comparison["recommended"] = null;
  if (av.totalInterest !== null && sn.totalInterest !== null) {
    const d = sn.totalInterest - av.totalInterest;
    recommended = d < -NEAR ? "snowball" : d > NEAR ? "avalanche" : sn.months! < av.months! ? "snowball" : "avalanche";
  } else if (av.totalInterest !== null) recommended = "avalanche";
  else if (sn.totalInterest !== null) recommended = "snowball";

  let cheaper: Comparison["cheaper"] = null;
  if (av.totalInterest !== null && sn.totalInterest !== null) {
    const d = sn.totalInterest - av.totalInterest;
    if (Math.abs(d) >= NEAR) cheaper = d > 0 ? { strategy: "avalanche", by: d } : { strategy: "snowball", by: -d };
  }

  let firstSooner: Comparison["firstSooner"] = null;
  if (av.firstPayoffMonth !== null && sn.firstPayoffMonth !== null && av.firstPayoffMonth !== sn.firstPayoffMonth) {
    firstSooner = sn.firstPayoffMonth < av.firstPayoffMonth ? { strategy: "snowball", months: av.firstPayoffMonth - sn.firstPayoffMonth } : { strategy: "avalanche", months: sn.firstPayoffMonth - av.firstPayoffMonth };
  }

  const single = debts.length === 1;
  const same = single || (cheaper === null && av.months === sn.months && av.order.every((s, i) => s.id === sn.order[i].id && s.month === sn.order[i].month));

  return {
    budget,
    minSum: minimumsTotal(debts),
    budgetTooLow: results.avalanche.budgetTooLow,
    plans,
    recommended,
    single,
    same,
    cheaper: single ? null : cheaper,
    firstSooner: single ? null : firstSooner,
  };
}
