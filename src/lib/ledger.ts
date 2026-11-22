// [Ch 8 Recurrence relations] Actual balances from real payments, using the same monthly rule as the
// calculator: each month, B(k) = B(k-1) + interest − payments made that month, with interest = B(k-1)·r.
// Months are counted from the debt's start date (month 1 = start date up to one month later).
// Pure: no DOM, no React, no database. Dates are 'YYYY-MM-DD' strings, handled without time zones.
import { simulate } from "./debt";

const EPS = 0.005; // half a satang: at or below this the debt counts as paid off (same as debt.ts)

export type YMD = { y: number; m: number; d: number }; // m is 1-12

export function parseDate(iso: string): YMD {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toISODate(x: YMD): string {
  return `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Same day n months later, clamped to the end of shorter months (Jan 31 + 1 month = Feb 28/29).
export function addMonths(x: YMD, n: number): YMD {
  const total = x.y * 12 + (x.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(x.d, daysInMonth(y, m)) };
}

// Which month of the debt a date falls in (1-based). Dates before the start count as month 1.
export function monthIndex(startISO: string, dateISO: string): number {
  const s = parseDate(startISO);
  const t = parseDate(dateISO);
  let diff = (t.y - s.y) * 12 + (t.m - s.m);
  const anniversary = Math.min(s.d, daysInMonth(t.y, t.m));
  if (t.d < anniversary) diff -= 1;
  return Math.max(1, diff + 1);
}

export type DebtTerms = { start_balance: number; apr: number; start_date: string };
export type Payment = { id?: string; paid_on: string; amount: number; note?: string | null };

export type LedgerRow = { month: number; endsOn: string; start: number; interest: number; paid: number; end: number };
export type HistoryItem = Payment & { month: number; balanceAfter: number };

export type Ledger = {
  asOf: string;
  startDate: string;
  rows: LedgerRow[]; // completed months only
  history: HistoryItem[]; // every payment up to asOf, in date order, with the balance right after it
  balance: number; // today: last completed month's end minus payments so far this month
  currentMonth: number;
  currentMonthPaid: number;
  totalPaid: number;
  interestCharged: number;
  payoffAmount: number; // what still clears the debt this month: balance plus this month's interest
  paidOff: boolean; // true only when this month's interest is covered too
};

export function buildLedger(debt: DebtTerms, payments: Payment[], asOfISO: string): Ledger {
  const r = debt.apr / 100 / 12;
  const currentMonth = monthIndex(debt.start_date, asOfISO);
  const done = currentMonth - 1;
  const start = parseDate(debt.start_date);

  const sorted = payments
    .filter((p) => p.paid_on <= asOfISO)
    .map((p, i) => ({ ...p, i, month: monthIndex(debt.start_date, p.paid_on) }))
    .sort((a, b) => (a.paid_on < b.paid_on ? -1 : a.paid_on > b.paid_on ? 1 : a.i - b.i));

  const rows: LedgerRow[] = [];
  const history: HistoryItem[] = [];
  let bal = debt.start_balance;
  let idx = 0;
  let interestCharged = 0;
  let currentStart = debt.start_balance;

  for (let k = 1; k <= currentMonth; k++) {
    const monthStart = bal;
    let paidSoFar = 0;
    while (idx < sorted.length && sorted[idx].month === k) {
      const p = sorted[idx++];
      paidSoFar += p.amount;
      history.push({ id: p.id, paid_on: p.paid_on, amount: p.amount, note: p.note, month: k, balanceAfter: Math.max(0, monthStart - paidSoFar) });
    }
    if (k <= done) {
      const interest = monthStart * r;
      const end = Math.max(0, monthStart + interest - paidSoFar);
      rows.push({ month: k, endsOn: toISODate(addMonths(start, k)), start: monthStart, interest, paid: paidSoFar, end });
      interestCharged += interest;
      bal = end;
    } else {
      currentStart = monthStart;
      bal = Math.max(0, monthStart - paidSoFar);
    }
  }

  const totalPaid = sorted.reduce((a, p) => a + p.amount, 0);
  const currentMonthPaid = sorted.filter((p) => p.month === currentMonth).reduce((a, p) => a + p.amount, 0);
  // Interest for the current month is charged at its end on the month's starting balance, so paying only the
  // visible balance mid-month still leaves that interest owed.
  const owed = currentStart * (1 + r) - currentMonthPaid;
  const payoff = owed <= EPS ? 0 : owed;
  return {
    asOf: asOfISO,
    startDate: debt.start_date,
    rows,
    history,
    balance: bal,
    currentMonth,
    currentMonthPaid,
    totalPaid,
    interestCharged,
    payoffAmount: payoff,
    paidOff: payoff <= EPS,
  };
}

export type PlanTerms = { balance: number; apr: number; monthly_payment: number; start_date: string };
export type PlanComparison = {
  status: "ahead" | "on_track" | "behind";
  monthsCompared: number;
  plannedBalance: number;
  actualBalance: number;
  difference: number; // actual − planned: negative means ahead
};

// Planned balance after the same number of completed months as the ledger, versus the actual balance.
export function compareToPlan(ledger: Ledger, plan: PlanTerms, tolerance = 1): PlanComparison {
  const months = Math.max(0, monthIndex(plan.start_date, ledger.asOf) - 1);
  const sim = simulate({ balance: plan.balance, apr: plan.apr, strategy: "fixed", p: plan.monthly_payment });
  const plannedBalance = months === 0 ? plan.balance : months <= sim.rows.length ? sim.rows[months - 1].end : 0;
  const actualBalance = ledger.rows.length === 0 ? ledger.balance : ledger.rows[ledger.rows.length - 1].end;
  const difference = actualBalance - plannedBalance;
  const status = difference < -tolerance ? "ahead" : difference > tolerance ? "behind" : "on_track";
  return { status, monthsCompared: months, plannedBalance, actualBalance, difference };
}

// Where today's balance goes if the same monthly payment continues. null if it never pays off.
export function projectFrom(
  balance: number,
  apr: number,
  monthlyPayment: number,
  fromISO: string,
): { months: number; remainingInterest: number; debtFreeISO: string } | null {
  if (balance <= EPS) return { months: 0, remainingInterest: 0, debtFreeISO: fromISO };
  const sim = simulate({ balance, apr, strategy: "fixed", p: monthlyPayment });
  if (sim.months === null) return null;
  return { months: sim.months, remainingInterest: sim.totalInterest!, debtFreeISO: toISODate(addMonths(parseDate(fromISO), sim.months)) };
}

// The planned month-by-month balances of a repayment schedule (for planned-vs-actual charts).
export function plannedRows(plan: PlanTerms): LedgerRow[] {
  const sim = simulate({ balance: plan.balance, apr: plan.apr, strategy: "fixed", p: plan.monthly_payment });
  const start = parseDate(plan.start_date);
  return sim.rows.map((row) => ({
    month: row.month,
    endsOn: toISODate(addMonths(start, row.month)),
    start: row.start,
    interest: row.interest,
    paid: row.payment,
    end: row.end,
  }));
}

// Today's date where the user lives (Thailand by default), not the server's clock: Netlify runs in UTC, which
// is 7 hours behind Bangkok, so a payment made in the morning would otherwise land on "tomorrow".
export const APP_TIME_ZONE = "Asia/Bangkok";

export function todayISO(now = new Date(), timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return toISODate({ y: get("year"), m: get("month"), d: get("day") });
}
