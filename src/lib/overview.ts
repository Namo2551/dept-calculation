// Turns a user's debts, payments and active plans into the numbers every app page shows. Pure (no database):
// the server pages load rows with RLS and pass them in, so tests can run this directly.
import { buildLedger, compareToPlan, projectFrom, type Ledger, type PlanComparison } from "./ledger";
import type { DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "./supabase/database.types";

export type DebtOverview = {
  debt: DebtRow;
  payments: PaymentRecordRow[];
  schedule: RepaymentScheduleRow | null;
  ledger: Ledger;
  comparison: PlanComparison | null; // only when a plan (schedule) is set
  monthlyBasis: number; // the monthly payment used for projections
  basisSource: "plan" | "recent" | "minimum";
  projection: { months: number; remainingInterest: number; debtFreeISO: string } | null;
};

// The minimum due this month on today's balance: max(min % of balance, minimum amount), never above the balance.
export function minimumDue(debt: Pick<DebtRow, "min_pct" | "min_amount">, balance: number): number {
  const pct = debt.min_pct ? (debt.min_pct / 100) * balance : 0;
  return Math.min(balance, Math.max(pct, debt.min_amount));
}

// Monthly payment for projections: the plan's payment, else the average of the last 3 completed months
// with payments, else the current minimum.
export function monthlyBasis(debt: DebtRow, ledger: Ledger, schedule: RepaymentScheduleRow | null): { amount: number; source: DebtOverview["basisSource"] } {
  if (schedule) return { amount: schedule.monthly_payment, source: "plan" };
  const recent = ledger.rows.filter((r) => r.paid > 0).slice(-3);
  if (recent.length > 0) return { amount: recent.reduce((a, r) => a + r.paid, 0) / recent.length, source: "recent" };
  return { amount: minimumDue(debt, ledger.balance), source: "minimum" };
}

export function overviewOf(debt: DebtRow, payments: PaymentRecordRow[], schedule: RepaymentScheduleRow | null, asOfISO: string): DebtOverview {
  const ledger = buildLedger(debt, payments, asOfISO);
  const comparison = schedule ? compareToPlan(ledger, schedule) : null;
  const basis = monthlyBasis(debt, ledger, schedule);
  const projection = projectFrom(ledger.balance, debt.apr, basis.amount, asOfISO);
  return { debt, payments, schedule, ledger, comparison, monthlyBasis: basis.amount, basisSource: basis.source, projection };
}

export type Totals = {
  outstanding: number;
  startTotal: number;
  paid: number;
  interestPaid: number; // interest charged so far
  remainingInterest: number | null; // null if any active debt never pays off at its basis
  debtFreeISO: string | null; // the latest projected payoff among active debts
  progress: number; // 0..1, share of the starting balances repaid (principal)
};

export function totalsOf(items: DebtOverview[]): Totals {
  const active = items.filter((i) => i.debt.status !== "archived");
  const outstanding = active.reduce((a, i) => a + i.ledger.balance, 0);
  const startTotal = active.reduce((a, i) => a + i.debt.start_balance, 0);
  const paid = active.reduce((a, i) => a + i.ledger.totalPaid, 0);
  const interestPaid = active.reduce((a, i) => a + i.ledger.interestCharged, 0);
  const unpaid = active.filter((i) => !i.ledger.paidOff);
  const neverEnds = unpaid.some((i) => i.projection === null);
  const remainingInterest = neverEnds ? null : unpaid.reduce((a, i) => a + (i.projection?.remainingInterest ?? 0), 0);
  const debtFreeISO = neverEnds || unpaid.length === 0 ? (unpaid.length === 0 && active.length > 0 ? active[0].ledger.asOf : null) : unpaid.map((i) => i.projection!.debtFreeISO).sort().at(-1)!;
  const progress = startTotal > 0 ? Math.min(1, Math.max(0, (startTotal - outstanding) / startTotal)) : 0;
  return { outstanding, startTotal, paid, interestPaid, remainingInterest, debtFreeISO, progress };
}
