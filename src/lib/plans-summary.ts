// Results for a saved plan: method A and B (debt.ts), an optional bonus (plans.ts) and calendar payoff dates
// counted from the plan's start date (ledger.ts). Pure: no DOM, no React, no database.
import { plansCopy } from "@/copy/plans";
import { simulate, type SimResult } from "./debt";
import { monthsToText } from "./format";
import { addMonths, parseDate, toISODate } from "./ledger";
import { simulateWithBonus } from "./plans";
import type { DebtPlanRow } from "./supabase/database.types";

export type PlanInputs = Pick<
  DebtPlanRow,
  "balance" | "apr" | "min_pct" | "min_floor" | "fixed_payment" | "target_months" | "interest_limit" | "bonus_amount" | "bonus_month" | "start_date"
>;

export type PlanSummary = {
  A: SimResult;
  B: SimResult;
  payoffA: string | null; // 'YYYY-MM-DD' the last month ends, or null when it never ends
  payoffB: string | null;
  bonus: { amount: number; month: number; months: number | null; totalInterest: number | null; afterPayoff: boolean; payoff: string | null } | null;
};

// Month k of a plan ends k months after its start date.
export function payoffISO(startISO: string, months: number | null): string | null {
  return months === null ? null : toISODate(addMonths(parseDate(startISO), months));
}

export function summarizePlan(p: PlanInputs): PlanSummary {
  const A = simulate({ balance: p.balance, apr: p.apr, strategy: "pct", m: p.min_pct / 100, floor: p.min_floor });
  const B = simulate({ balance: p.balance, apr: p.apr, strategy: "fixed", p: p.fixed_payment });
  let bonus: PlanSummary["bonus"] = null;
  if (p.bonus_amount !== null && p.bonus_month !== null) {
    const r = simulateWithBonus({ balance: p.balance, apr: p.apr, p: p.fixed_payment, amount: p.bonus_amount, month: p.bonus_month });
    bonus = { amount: p.bonus_amount, month: p.bonus_month, ...r, payoff: payoffISO(p.start_date, r.months) };
  }
  return { A, B, payoffA: payoffISO(p.start_date, A.months), payoffB: payoffISO(p.start_date, B.months), bonus };
}

// Balance at the start (month 0) and at the end of every simulated month, for the line chart.
export function balanceCurve(balance: number, sim: SimResult): number[] {
  return [balance, ...sim.rows.map((r) => r.end)];
}

export type PlanComparison = {
  cheaper: "a" | "b" | "same" | null; // null: one of the plans never ends
  interestDiff: number; // absolute difference in total interest (method B)
  faster: "a" | "b" | "same" | null;
  monthsDiff: number; // absolute difference in months (method B)
};

const HALF_SATANG = 0.005;

export function comparePlans(a: PlanSummary, b: PlanSummary): PlanComparison {
  const ia = a.B.totalInterest;
  const ib = b.B.totalInterest;
  const ma = a.B.months;
  const mb = b.B.months;
  if (ia === null || ib === null || ma === null || mb === null) return { cheaper: null, interestDiff: 0, faster: null, monthsDiff: 0 };
  const di = Math.abs(ia - ib);
  return {
    cheaper: di < HALF_SATANG ? "same" : ia < ib ? "a" : "b",
    interestDiff: di < HALF_SATANG ? 0 : di,
    faster: ma === mb ? "same" : ma < mb ? "a" : "b",
    monthsDiff: Math.abs(ma - mb),
  };
}

// "2 years", or "Never" / "Over 100 years" when the simulation does not end.
export function monthsLabel(sim: SimResult): string {
  if (sim.months !== null) return monthsToText(sim.months);
  return sim.neverDecreases ? plansCopy.months.never : plansCopy.months.over;
}
