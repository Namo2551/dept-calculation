// Goal progress math: how far along a goal is, whether the current payments reach it in time, and the
// monthly payment a target date needs. Pure (no database, no React).
import { requiredPayment, simulate } from "./debt";
import { addMonths, parseDate, toISODate } from "./ledger";
import type { DebtOverview } from "./overview";
import type { FinancialGoalRow } from "./supabase/database.types";

const EPS = 0.005;

export const GOAL_KINDS = ["debt_free_by", "debt_paid_by", "reduce_total_pct", "reduce_total_to"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];
export type GoalLike = Pick<FinancialGoalRow, "kind" | "debt_id" | "target_date" | "target_pct" | "target_amount" | "achieved_at">;

export const isDateGoal = (kind: string) => kind === "debt_free_by" || kind === "debt_paid_by";

// The debts a goal is about: one debt for "pay off this debt", every non-archived debt otherwise.
export function goalScope(goal: Pick<GoalLike, "kind" | "debt_id">, items: DebtOverview[]): DebtOverview[] {
  if (goal.kind === "debt_paid_by") return items.filter((i) => i.debt.id === goal.debt_id);
  return items.filter((i) => i.debt.status !== "archived");
}

export function reduceByPctTarget(start: number, pct: number): number {
  return start * (1 - pct / 100);
}

// The balance the goal aims for: 0 for payoff goals, a share of the starting total, or a fixed amount.
export function goalTarget(goal: Pick<GoalLike, "kind" | "target_pct" | "target_amount">, start: number): number {
  if (goal.kind === "reduce_total_pct") return reduceByPctTarget(start, goal.target_pct ?? 0);
  if (goal.kind === "reduce_total_to") return goal.target_amount ?? 0;
  return 0;
}

// (start - current) / (start - target), clamped to 0..1. A target at or above the start counts as reached
// once the balance is at or below it.
export function goalProgress(start: number, current: number, target: number): number {
  if (start - target <= EPS) return current <= target + EPS ? 1 : 0;
  return Math.min(1, Math.max(0, (start - current) / (start - target)));
}

// Whole months from one date to another (negative when the target is in the past).
export function monthsUntil(fromISO: string, toISO: string): number {
  const f = parseDate(fromISO);
  const t = parseDate(toISO);
  const diff = (t.y - f.y) * 12 + (t.m - f.m);
  return t.d < f.d ? diff - 1 : diff;
}

export type Required = { months: number; total: number; perDebt: { id: string; name: string; amount: number }[] };

// Monthly payment that clears each unpaid debt in the months left before the target date (requiredPayment on
// today's balance and APR), summed. null when the target is less than one month away.
export function requiredForDate(scope: DebtOverview[], asOfISO: string, targetISO: string): Required | null {
  const months = monthsUntil(asOfISO, targetISO);
  if (months < 1) return null;
  const perDebt = scope
    .filter((i) => !i.ledger.paidOff)
    .map((i) => ({ id: i.debt.id, name: i.debt.name, amount: requiredPayment(i.ledger.balance, i.debt.apr, months).exact }));
  return { months, total: perDebt.reduce((s, d) => s + d.amount, 0), perDebt };
}

// The date the summed projected balance (each debt at its own monthly basis) first reaches the target.
// null if it never does within maxAhead months.
export function projectedReachISO(scope: DebtOverview[], target: number, asOfISO: string, maxAhead = 1200): string | null {
  const tol = EPS * Math.max(1, scope.length);
  const balances = scope.map((i) => i.ledger.balance);
  if (balances.reduce((s, v) => s + v, 0) <= target + tol) return asOfISO;
  const sims = scope.map((i) => (i.ledger.paidOff ? null : simulate({ balance: i.ledger.balance, apr: i.debt.apr, strategy: "fixed", p: i.monthlyBasis })));
  const start = parseDate(asOfISO);
  for (let k = 1; k <= maxAhead; k++) {
    let total = 0;
    let moving = false;
    sims.forEach((sim) => {
      if (!sim) return;
      if (k <= sim.rows.length) {
        total += sim.rows[k - 1].end;
        moving = true;
      } else if (sim.months === null) total += sim.rows[sim.rows.length - 1].end;
    });
    if (total <= target + tol) return toISODate(addMonths(start, k));
    if (!moving) return null;
  }
  return null;
}

export type GoalStatus = "achieved" | "on_track" | "behind" | "no_debts";

export type GoalEvaluation = {
  scope: DebtOverview[];
  start: number; // starting balances in scope
  current: number; // today's balances in scope
  target: number;
  progress: number; // 0..1
  status: GoalStatus;
  projectedISO: string | null; // when the current payments reach the target
  required: Required | null; // date goals with at least a month to go
  currentBasis: number; // the monthly payments the projection uses (unpaid debts in scope)
  overdue: boolean; // the target date has passed without reaching the goal
};

export function evaluateGoal(goal: GoalLike, items: DebtOverview[], asOfISO: string): GoalEvaluation {
  const scope = goalScope(goal, items);
  const start = scope.reduce((s, i) => s + i.debt.start_balance, 0);
  const current = scope.reduce((s, i) => s + i.ledger.balance, 0);
  const target = goalTarget(goal, start);
  const currentBasis = scope.filter((i) => !i.ledger.paidOff).reduce((s, i) => s + i.monthlyBasis, 0);
  const base = { scope, start, current, target, currentBasis };
  if (scope.length === 0) {
    return { ...base, progress: 0, status: "no_debts", projectedISO: null, required: null, overdue: false };
  }
  const progress = goalProgress(start, current, target);
  const reached = current <= target + EPS * scope.length;
  const projectedISO = reached ? asOfISO : projectedReachISO(scope, target, asOfISO);
  const required = isDateGoal(goal.kind) && goal.target_date && !reached ? requiredForDate(scope, asOfISO, goal.target_date) : null;
  const overdue = !reached && !!goal.target_date && goal.target_date < asOfISO;
  const status: GoalStatus = reached
    ? "achieved"
    : projectedISO !== null && (!goal.target_date || projectedISO <= goal.target_date)
      ? "on_track"
      : "behind";
  return { ...base, progress: reached ? 1 : progress, status, projectedISO, required, overdue };
}

// The new achieved_at value: set when first reached, cleared when no longer reached, undefined = no change.
export function achievedAtChange(achievedAt: string | null, achieved: boolean, nowISO: string): string | null | undefined {
  if (achieved && !achievedAt) return nowISO;
  if (!achieved && achievedAt) return null;
  return undefined;
}
