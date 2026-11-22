import { describe, expect, test } from "vitest";
import { simulateMulti, type MultiStrategy } from "./debt";
import { overviewOf } from "./overview";
import {
  activeDebts,
  compareStrategies,
  defaultBudget,
  minimumsTotal,
  monthDate,
  monthlyRows,
  parseBudget,
  parsePlan,
  toCard,
  type StrategyDebt,
} from "./strategy";
import type { DebtRow } from "./supabase/database.types";

const ts = { created_at: "", updated_at: "" };
const row = (over: Partial<DebtRow> = {}): DebtRow => ({
  id: "d1", user_id: "u", name: "Card A", kind: "credit_card", start_balance: 30000, start_date: "2026-11-01", apr: 16,
  min_pct: 5, min_amount: 500, due_day: 20, currency: "THB", status: "active", ...ts, ...over,
});
const sd = (over: Partial<StrategyDebt> = {}): StrategyDebt => ({ id: "a", name: "A", balance: 10000, apr: 20, minPct: 3, minAmount: 300, ...over });

// Small deterministic random generator, so the property tests are repeatable.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("activeDebts", () => {
  test("keeps active debts that still have a balance, with their current (ledger) balance", () => {
    const items = [
      overviewOf(row({ id: "a", name: "A" }), [], null, "2026-11-22"),
      overviewOf(row({ id: "b", name: "B", status: "archived" }), [], null, "2026-11-22"),
      overviewOf(row({ id: "c", name: "C", status: "paid_off" }), [], null, "2026-11-22"),
      overviewOf(row({ id: "d", name: "D", start_balance: 1000 }), [{ id: "p", user_id: "u", debt_id: "d", paid_on: "2026-11-05", amount: 1000, note: null, ...ts }], null, "2026-11-22"),
    ];
    const out = activeDebts(items);
    expect(out.map((d) => d.id)).toEqual(["a"]);
    expect(out[0]).toEqual({ id: "a", name: "A", balance: items[0].ledger.balance, apr: 16, minPct: 5, minAmount: 500 });
  });
});

describe("toCard", () => {
  test("turns the minimum percent into a fraction and the minimum amount into the floor", () => {
    expect(toCard(sd({ minPct: 5, minAmount: 500 }))).toEqual({ name: "A", balance: 10000, apr: 20, m: 0.05, floor: 500 });
  });
  test("a debt with no minimum percent uses the minimum amount only", () => {
    expect(toCard(sd({ minPct: null, minAmount: 800 }))).toEqual({ name: "A", balance: 10000, apr: 20, m: 0, floor: 800 });
  });
});

describe("minimumsTotal and defaultBudget", () => {
  test("adds month-one minimums with the same rule simulateMulti uses", () => {
    const debts = [sd({ balance: 10000, minPct: 5, minAmount: 300 }), sd({ id: "b", balance: 2000, minPct: 5, minAmount: 300 })];
    expect(minimumsTotal(debts)).toBeCloseTo(800, 9);
    const sim = simulateMulti({ cards: debts.map(toCard), budget: 0, strategy: "minonly" });
    expect(minimumsTotal(debts)).toBeCloseTo(sim.totals[0].payment, 9);
  });
  test("a minimum never exceeds what is owed this month", () => {
    expect(minimumsTotal([sd({ balance: 100, apr: 0, minPct: null, minAmount: 500 })])).toBe(100);
  });
  test("default budget rounds the minimums up to the next 100", () => {
    expect(defaultBudget([sd({ balance: 10000, minPct: 5, minAmount: 0 }), sd({ id: "b", balance: 2010, minPct: 5, minAmount: 0 })])).toBe(700); // 600.5
    expect(defaultBudget([sd({ balance: 10000, minPct: 5, minAmount: 0 })])).toBe(500); // exactly 500 stays 500
    expect(defaultBudget([])).toBe(0);
  });
});

describe("parseBudget", () => {
  test("uses the fallback when nothing is given", () => {
    expect(parseBudget(undefined, 700)).toEqual({ budget: 700, input: "700", error: null });
    expect(parseBudget("", 700)).toEqual({ budget: 700, input: "700", error: null });
  });
  test("accepts plain numbers, commas and spaces", () => {
    expect(parseBudget("1,250.50", 700)).toEqual({ budget: 1250.5, input: "1,250.50", error: null });
    expect(parseBudget(" 0 ", 700)).toEqual({ budget: 0, input: "0", error: null });
    expect(parseBudget(["900", "1"], 700).budget).toBe(900);
  });
  test("rejects text, negatives and absurd amounts, and falls back for the results", () => {
    expect(parseBudget("abc", 700)).toEqual({ budget: 700, input: "abc", error: "invalid" });
    expect(parseBudget("12abc", 700).error).toBe("invalid");
    expect(parseBudget("-5", 700)).toEqual({ budget: 700, input: "-5", error: "negative" });
    expect(parseBudget("1e12", 700).error).toBe("tooBig");
    expect(parseBudget("x".repeat(40), 700).input.length).toBeLessThanOrEqual(20);
  });
});

describe("parsePlan", () => {
  test("accepts the three strategies and otherwise returns the fallback", () => {
    expect(parsePlan("snowball", "avalanche")).toBe("snowball");
    expect(parsePlan("minonly", "avalanche")).toBe("minonly");
    expect(parsePlan("bogus", "avalanche")).toBe("avalanche");
    expect(parsePlan(undefined, "snowball")).toBe("snowball");
  });
});

describe("monthDate", () => {
  test("month n is n months after today, clamped to short months", () => {
    expect(monthDate("2026-11-22", 1)).toBe("2026-12-22");
    expect(monthDate("2026-01-31", 1)).toBe("2026-02-28");
    expect(monthDate("2026-11-22", 14)).toBe("2028-01-22");
  });
});

describe("monthlyRows matches simulateMulti exactly", () => {
  const cases: { cards: StrategyDebt[]; budget: number }[] = [
    { cards: [sd({ id: "a", balance: 30000, apr: 16, minPct: 5, minAmount: 500 }), sd({ id: "b", balance: 8000, apr: 24, minPct: 3, minAmount: 300 })], budget: 3000 },
    { cards: [sd({ id: "a", balance: 5000, apr: 0, minPct: null, minAmount: 200 }), sd({ id: "b", balance: 9000, apr: 18, minPct: 2, minAmount: 0 }), sd({ id: "c", balance: 300, apr: 28, minPct: 10, minAmount: 1000 })], budget: 1500 },
    { cards: [sd({ id: "a", balance: 20000, apr: 22, minPct: 5, minAmount: 500 })], budget: 100 }, // budget too low
  ];
  const strategies: MultiStrategy[] = ["avalanche", "snowball", "minonly"];
  cases.forEach((c, ci) =>
    strategies.forEach((strategy) =>
      test(`case ${ci + 1}, ${strategy}`, () => {
        const cards = c.cards.map(toCard);
        const sim = simulateMulti({ cards, budget: c.budget, strategy });
        const rows = monthlyRows(cards, c.budget, strategy);
        expect(rows.length).toBe(sim.totals.length);
        rows.forEach((r, k) => {
          expect(r.month).toBe(k + 1);
          expect(r.payments.reduce((a, b) => a + b, 0)).toBeCloseTo(sim.totals[k].payment, 6);
          expect(r.balances.reduce((a, b) => a + b, 0)).toBeCloseTo(sim.totals[k].balance, 6);
        });
      }),
    ),
  );
});

describe("compareStrategies", () => {
  const debts = [
    sd({ id: "big", name: "Big card", balance: 30000, apr: 24, minPct: 5, minAmount: 500 }),
    sd({ id: "small", name: "Small loan", balance: 5000, apr: 12, minPct: 5, minAmount: 300 }),
  ];
  const cmp = compareStrategies(debts, 4000, "2026-11-22");

  test("orders debts by payoff month with calendar dates", () => {
    const av = cmp.plans.avalanche;
    const sn = cmp.plans.snowball;
    expect(av.order[0].id).toBe("big");
    expect(sn.order[0].id).toBe("small");
    av.order.forEach((s) => expect(s.dateISO).toBe(monthDate("2026-11-22", s.month!)));
    expect(av.debtFreeISO).toBe(monthDate("2026-11-22", av.months!));
    const sim = simulateMulti({ cards: debts.map(toCard), budget: 4000, strategy: "avalanche" });
    expect(av.months).toBe(sim.months);
    expect(av.totalInterest).toBeCloseTo(sim.totalInterest!, 9);
    expect(av.totalPaid).toBeCloseTo(sim.totalPaid, 9);
  });

  test("interest saved is measured against minimum payments only", () => {
    const min = cmp.plans.minonly.totalInterest!;
    expect(cmp.plans.avalanche.interestSaved).toBeCloseTo(min - cmp.plans.avalanche.totalInterest!, 9);
    expect(cmp.plans.snowball.interestSaved).toBeCloseTo(min - cmp.plans.snowball.totalInterest!, 9);
    expect(cmp.plans.minonly.interestSaved).toBe(0);
  });

  test("recommends avalanche here, says by how much it is cheaper, and that snowball clears a debt first", () => {
    expect(cmp.recommended).toBe("avalanche");
    expect(cmp.cheaper?.strategy).toBe("avalanche");
    expect(cmp.cheaper?.by).toBeCloseTo(cmp.plans.snowball.totalInterest! - cmp.plans.avalanche.totalInterest!, 9);
    expect(cmp.cheaper!.by).toBeGreaterThan(0);
    expect(cmp.firstSooner?.strategy).toBe("snowball");
    expect(cmp.firstSooner?.months).toBe(cmp.plans.avalanche.firstPayoffMonth! - cmp.plans.snowball.firstPayoffMonth!);
    expect(cmp.same).toBe(false);
  });

  test("chart series start at today's total and end at zero", () => {
    expect(cmp.plans.avalanche.balances[0]).toBe(35000);
    expect(cmp.plans.avalanche.balances.at(-1)).toBe(0);
    expect(cmp.plans.avalanche.balances.length).toBe(cmp.plans.avalanche.months! + 1);
  });

  test("one debt: both strategies are the same", () => {
    const one = compareStrategies([debts[0]], 3000, "2026-11-22");
    expect(one.single).toBe(true);
    expect(one.same).toBe(true);
    expect(one.cheaper).toBeNull();
    expect(one.firstSooner).toBeNull();
    expect(one.recommended).toBe("avalanche");
  });

  test("when the highest rate is also the smallest balance, both orders match", () => {
    const same = compareStrategies([sd({ id: "x", balance: 2000, apr: 30 }), sd({ id: "y", balance: 9000, apr: 10 })], 2000, "2026-11-22");
    expect(same.same).toBe(true);
    expect(same.single).toBe(false);
  });

  test("tie on interest goes to fewer months", () => {
    // zero interest everywhere: interest ties at 0, the order cannot change the months either; recommended stays avalanche
    const zero = compareStrategies([sd({ id: "x", balance: 2000, apr: 0 }), sd({ id: "y", balance: 9000, apr: 0 })], 1000, "2026-11-22");
    expect(zero.recommended).toBe("avalanche");
    expect(zero.cheaper).toBeNull();
  });

  test("budget below the minimums is reported", () => {
    const low = compareStrategies(debts, 500, "2026-11-22");
    expect(low.budgetTooLow).toBe(true);
    expect(low.minSum).toBeCloseTo(1800, 9);
    expect(cmp.budgetTooLow).toBe(false);
  });

  test("a minimum-only plan that never ends has no interest saved figure", () => {
    const never = compareStrategies([sd({ balance: 10000, apr: 20, minPct: null, minAmount: 100 })], 1000, "2026-11-22");
    expect(never.plans.minonly.months).toBeNull();
    expect(never.plans.minonly.totalInterest).toBeNull();
    expect(never.plans.avalanche.interestSaved).toBeNull();
    expect(never.plans.avalanche.months).not.toBeNull();
  });

  test("no plan finishes when the budget is zero", () => {
    const none = compareStrategies(debts, 0, "2026-11-22");
    expect(none.plans.avalanche.months).toBeNull();
    expect(none.recommended).toBeNull();
    expect(none.plans.avalanche.debtFreeISO).toBeNull();
  });
});

describe("mathematical checks", () => {
  test("two debts: avalanche never pays more interest than snowball when the higher-rate debt is not the smallest", () => {
    const next = rng(42);
    let checked = 0;
    for (let t = 0; t < 400; t++) {
      const hiBal = 2000 + next() * 80000;
      const loBal = 500 + next() * (hiBal - 600); // strictly smaller, so the high-rate debt is not the smallest
      const hiApr = 10 + next() * 26;
      const loApr = next() * (hiApr - 1);
      const hi = sd({ id: "hi", balance: hiBal, apr: hiApr, minPct: 1 + next() * 9, minAmount: Math.round(next() * 1000) });
      const lo = sd({ id: "lo", balance: loBal, apr: loApr, minPct: next() < 0.2 ? null : 1 + next() * 9, minAmount: Math.round(next() * 1000) });
      const debts = next() < 0.5 ? [hi, lo] : [lo, hi];
      const budget = minimumsTotal(debts) * (1 + next() * 2) + 1;
      const cmp = compareStrategies(debts, budget, "2026-11-22");
      const a = cmp.plans.avalanche.totalInterest;
      const s = cmp.plans.snowball.totalInterest;
      if (a === null || s === null) continue;
      checked++;
      expect(a).toBeLessThanOrEqual(s + 1e-6);
    }
    expect(checked).toBeGreaterThan(300);
  });

  test("each month's payments never exceed the budget and never exceed what is owed", () => {
    const next = rng(7);
    for (let t = 0; t < 150; t++) {
      const n = 1 + Math.floor(next() * 4);
      const debts = Array.from({ length: n }, (_, i) =>
        sd({ id: "d" + i, balance: 100 + next() * 50000, apr: next() * 36, minPct: next() < 0.3 ? null : next() * 10, minAmount: Math.round(next() * 800) }),
      );
      const budget = next() < 0.2 ? minimumsTotal(debts) * next() : minimumsTotal(debts) * (1 + next() * 2);
      const cards = debts.map(toCard);
      (["avalanche", "snowball"] as const).forEach((strategy) => {
        let prev = cards.map((c) => c.balance);
        monthlyRows(cards, budget, strategy).forEach((r) => {
          const sum = r.payments.reduce((a, b) => a + b, 0);
          expect(sum).toBeLessThanOrEqual(budget + 1e-9);
          r.payments.forEach((p, i) => {
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(prev[i] * (1 + cards[i].apr / 1200) + 1e-9);
          });
          prev = r.balances;
        });
      });
    }
  });

  test("each month follows the recurrence B(k) = B(k-1) + interest - payment", () => {
    const debts = [sd({ id: "a", balance: 30000, apr: 16 }), sd({ id: "b", balance: 8000, apr: 24 })];
    const cards = debts.map(toCard);
    let prev = cards.map((c) => c.balance);
    monthlyRows(cards, 3000, "snowball").forEach((r) => {
      r.balances.forEach((b, i) => {
        const expected = prev[i] * (1 + cards[i].apr / 1200) - r.payments[i];
        expect(b).toBeCloseTo(expected <= 0.005 ? 0 : expected, 9);
      });
      prev = r.balances;
    });
  });
});
