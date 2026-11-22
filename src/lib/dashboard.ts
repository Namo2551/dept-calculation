// Dashboard aggregation: turns per-debt overviews into calendar-month series for the charts.
// Pure (no database, no React). Months are 'YYYY-MM' strings; dates are 'YYYY-MM-DD'.
import { simulate } from "./debt";
import { plannedRows } from "./ledger";
import { minimumDue, type DebtOverview } from "./overview";

const EPS = 0.005;

export function ymOf(iso: string): string {
  return iso.slice(0, 7);
}

export function addYM(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

// b - a in months.
export function ymDiff(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

// Every month from `from` to `to`, both included. Empty if `from` is after `to`.
export function ymRange(from: string, to: string): string[] {
  const n = ymDiff(from, to);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addYM(from, i));
}

// Values for each month: the last known point at or before that month, or `before` until the first point.
export function denseSeries(points: Map<string, number>, months: string[], before = 0): number[] {
  let last: number | null = null;
  return months.map((ym) => {
    const v = points.get(ym);
    if (v !== undefined) last = v;
    return last ?? before;
  });
}

const active = (items: DebtOverview[]) => items.filter((i) => i.debt.status !== "archived");

// Actual balance at the end of each calendar month: the start balance in the start month, each completed
// ledger month at the month it ends in, and today's balance in the current month.
export function actualMonthEnds(o: DebtOverview): Map<string, number> {
  const m = new Map<string, number>();
  m.set(ymOf(o.debt.start_date), o.debt.start_balance);
  o.ledger.rows.forEach((r) => m.set(ymOf(r.endsOn), r.end));
  m.set(ymOf(o.ledger.asOf), o.ledger.balance);
  return m;
}

// Balances from today forward at the debt's projection basis: index 0 is today, index k is k months later.
// After payoff the balance stays 0; a debt that never pays off keeps its last simulated balance.
function projectedBalances(o: DebtOverview, length: number): number[] {
  const out = [o.ledger.balance];
  if (o.ledger.balance <= EPS) return Array.from({ length: length + 1 }, () => 0);
  const sim = simulate({ balance: o.ledger.balance, apr: o.debt.apr, strategy: "fixed", p: o.monthlyBasis });
  for (let k = 1; k <= length; k++) {
    if (k <= sim.rows.length) out.push(sim.rows[k - 1].end);
    else out.push(sim.months !== null ? 0 : out[k - 1]);
  }
  return out;
}

export type DebtSeries = {
  months: string[]; // calendar months, first debt start to the end of the projection
  actual: number[]; // total actual balance per month, months[0]..months[todayIndex]
  projected: number[]; // total projected balance, months[todayIndex]..the end
  todayIndex: number;
  complete: boolean; // false when a debt never pays off (the projection is cut off)
};

// Total debt over time: actual month-end balances summed by calendar month, then the projection from today.
export function totalDebtSeries(items: DebtOverview[], asOfISO: string, maxAhead = 120): DebtSeries {
  const list = active(items);
  if (list.length === 0) return { months: [], actual: [], projected: [], todayIndex: 0, complete: true };
  const today = ymOf(asOfISO);
  const first = list.map((i) => ymOf(i.debt.start_date)).sort()[0];
  const startYM = first < today ? first : today;
  const past = ymRange(startYM, today);
  const complete = list.every((i) => i.ledger.paidOff || i.projection !== null);
  const ahead = complete ? Math.max(0, ...list.map((i) => (i.ledger.paidOff ? 0 : i.projection!.months))) : maxAhead;
  const length = Math.min(maxAhead, ahead);

  const actual = past.map(() => 0);
  const projected = Array.from({ length: length + 1 }, () => 0);
  list.forEach((o) => {
    denseSeries(actualMonthEnds(o), past, 0).forEach((v, k) => (actual[k] += v));
    projectedBalances(o, length).forEach((v, k) => (projected[k] += v));
  });
  return { months: [...past, ...ymRange(addYM(today, 1), addYM(today, length))], actual, projected, todayIndex: past.length - 1, complete };
}

export type PlanSeries = { months: string[]; planned: number[]; actual: number[]; todayIndex: number };

// Planned (from each active repayment schedule) versus actual total balance, for debts with a plan only.
export function plannedVsActualSeries(items: DebtOverview[], asOfISO: string): PlanSeries | null {
  const list = active(items).filter((i) => i.schedule);
  if (list.length === 0) return null;
  const today = ymOf(asOfISO);
  const plans = list.map((o) => {
    const s = o.schedule!;
    const rows = plannedRows({ balance: s.balance, apr: s.apr, monthly_payment: s.monthly_payment, start_date: s.start_date });
    const points = new Map<string, number>([[ymOf(s.start_date), s.balance]]);
    rows.forEach((r) => points.set(ymOf(r.endsOn), r.end));
    return { o, points, startYM: ymOf(s.start_date), endYM: rows.length ? ymOf(rows[rows.length - 1].endsOn) : ymOf(s.start_date) };
  });
  const startYM = plans.map((p) => p.startYM).sort()[0];
  const endYM = [today, ...plans.map((p) => p.endYM)].sort().at(-1)!;
  const months = ymRange(startYM < today ? startYM : today, endYM);
  const todayIndex = months.indexOf(today);
  const past = months.slice(0, todayIndex + 1);

  const planned = months.map(() => 0);
  const actual = past.map(() => 0);
  plans.forEach(({ o, points, startYM: planStart }) => {
    const act = denseSeries(actualMonthEnds(o), months, 0);
    const plan = denseSeries(points, months, 0);
    months.forEach((ym, k) => (planned[k] += ym < planStart ? act[k] : plan[k]));
    past.forEach((_, k) => (actual[k] += act[k]));
  });
  return { months, planned, actual, todayIndex };
}

export type MonthPayments = { ym: string; paid: number; planned: number };

// Balance when the billing month that starts in calendar month `ym` begins (ledger month k starts k-1 months
// after the debt's start date).
function balanceAtBillingStart(o: DebtOverview, ym: string): number {
  const k = ymDiff(ymOf(o.debt.start_date), ym) + 1;
  if (k <= 1) return o.debt.start_balance;
  return k - 1 <= o.ledger.rows.length ? o.ledger.rows[k - 2].end : o.ledger.balance;
}

// Payments per calendar month for the last `count` months (ending with the current month), against the planned
// payment: the schedule's payment once it has started, else the minimum due.
export function monthlyPayments(items: DebtOverview[], asOfISO: string, count = 12): MonthPayments[] {
  const list = active(items);
  const today = ymOf(asOfISO);
  return ymRange(addYM(today, -(count - 1)), today).map((ym) => {
    let paid = 0;
    let planned = 0;
    list.forEach((o) => {
      o.payments.forEach((p) => {
        if (p.paid_on <= asOfISO && ymOf(p.paid_on) === ym) paid += p.amount;
      });
      if (ym < ymOf(o.debt.start_date)) return;
      const bal = balanceAtBillingStart(o, ym);
      if (bal <= EPS) return;
      const s = o.schedule;
      planned += s && ym >= ymOf(s.start_date) ? Math.min(s.monthly_payment, bal * (1 + o.debt.apr / 1200)) : minimumDue(o.debt, bal);
    });
    return { ym, paid, planned };
  });
}

export type DebtStatus = "paid_off" | "ahead" | "on_track" | "behind" | "no_plan";

export function debtStatus(o: DebtOverview): DebtStatus {
  if (o.ledger.paidOff) return "paid_off";
  return o.comparison?.status ?? "no_plan";
}

export type Headline =
  | { kind: "empty" }
  | { kind: "paid_off" }
  | { kind: "never"; names: string[] }
  | { kind: "date"; months: number; iso: string };

// The dashboard's one-line answer: when will all active debts be paid off?
export function headline(items: DebtOverview[]): Headline {
  const list = active(items);
  if (list.length === 0) return { kind: "empty" };
  const unpaid = list.filter((i) => !i.ledger.paidOff);
  if (unpaid.length === 0) return { kind: "paid_off" };
  const never = unpaid.filter((i) => i.projection === null);
  if (never.length > 0) return { kind: "never", names: never.map((i) => i.debt.name) };
  const last = unpaid.reduce((a, b) => (b.projection!.months > a.projection!.months ? b : a));
  return { kind: "date", months: last.projection!.months, iso: last.projection!.debtFreeISO };
}
