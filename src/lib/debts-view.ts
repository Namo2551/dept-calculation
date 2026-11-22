// Pure helpers for the debts pages: plan badges, the automatic paid-off status, the planned-vs-actual chart
// series and the payment history rows. No database, no React.
import { monthIndex, plannedRows, type Ledger, type Payment, type PlanComparison, type PlanTerms } from "./ledger";

export type Badge = "ahead" | "on_track" | "behind" | "none";

export function planBadge(comparison: PlanComparison | null): Badge {
  return comparison ? comparison.status : "none";
}

// The status a debt should move to after its payments change, or null for no change. Archived debts are the
// user's choice and stay archived.
export function nextStatus(status: string, paidOff: boolean): "active" | "paid_off" | null {
  if (status === "active" && paidOff) return "paid_off";
  if (status === "paid_off" && !paidOff) return "active";
  return null;
}

const MAX_LEN = 480; // 40 years on the chart at most

// Balances by month since the plan's start: planned month ends, and the actual month ends from the ledger
// (aligned to the ledger month the plan starts in) followed by today's balance.
export function planVsActualSeries(ledger: Ledger, startBalance: number, plan: PlanTerms) {
  const offset = monthIndex(ledger.startDate, plan.start_date) - 1;
  const rows = ledger.rows;
  const first = offset === 0 ? startBalance : offset <= rows.length ? rows[offset - 1].end : ledger.balance;
  const actual = [first, ...rows.slice(offset).map((r) => r.end)];
  if (offset < ledger.currentMonth) actual.push(ledger.balance);
  const planRows = plannedRows(plan);
  const len = Math.max(12, Math.min(MAX_LEN, Math.max(planRows.length, actual.length - 1)));
  const planned = [plan.balance, ...planRows.slice(0, len).map((r) => r.end)];
  const planPaysOff = planRows.length > 0 && planRows[planRows.length - 1].end <= 0.005;
  return { planned, actual, len, todayIndex: actual.length - 1, planPaysOff };
}

export type HistoryRow = { id: string; paid_on: string; amount: number; note: string | null; balanceAfter: number | null };

// Every payment in date order with the balance right after it; payments dated after the ledger's date
// (allowed up to a day ahead) have no balance yet.
export function historyRows(payments: (Payment & { id: string })[], ledger: Ledger): HistoryRow[] {
  const after = new Map(ledger.history.map((h) => [h.id, h.balanceAfter]));
  return payments
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.paid_on < b.p.paid_on ? -1 : a.p.paid_on > b.p.paid_on ? 1 : a.i - b.i))
    .map(({ p }) => ({ id: p.id, paid_on: p.paid_on, amount: p.amount, note: p.note ?? null, balanceAfter: after.get(p.id) ?? null }));
}

const ORDER: Record<string, number> = { active: 0, paid_off: 1, archived: 2 };

export function sortDebts<T extends { debt: { status: string } }>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (ORDER[a.item.debt.status] ?? 0) - (ORDER[b.item.debt.status] ?? 0) || a.i - b.i)
    .map(({ item }) => item);
}
