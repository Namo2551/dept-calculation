// Pure debt math (no DOM, no React). A typed, line-for-line port of the original core.js.
// Values are never rounded during calculation; rounding happens only when formatting for display.

const EPS_PAID = 0.005; // a balance at or below half a satang counts as paid off
const MAX_MONTHS = 1200; // simulate at most 100 years
const STUCK_MONTHS = 120; // when the debt can never decrease, stop at 10 years

export type Row = { month: number; start: number; interest: number; payment: number; end: number };

export type SingleOptions = { balance: number; apr: number } & (
  | { strategy: "pct"; m: number; floor?: number }
  | { strategy: "fixed"; p: number }
);

export type SimResult = {
  rows: Row[];
  r: number;
  months: number | null;
  monthsTo1pct: number | null;
  totalPaid: number;
  totalInterest: number | null;
  firstPayment: number;
  lastPayment: number | null;
  neverDecreases: boolean;
};

export type YearSplit = { year: number; interest: number; principal: number; payment: number };

export type Card = { name?: string; balance: number; apr: number; m: number; floor?: number };
export type MultiStrategy = "avalanche" | "snowball" | "minonly";
export type MultiResult = {
  months: number | null;
  paidOffMonth: (number | null)[];
  totals: { month: number; balance: number; payment: number }[];
  totalPaid: number;
  totalInterest: number | null;
  budgetTooLow: boolean;
};

// Payment due this month for the chosen strategy.
function paymentFor(o: SingleOptions, start: number, due: number): number {
  if (o.strategy === "fixed") return Math.min(o.p, due);
  return Math.min(Math.max(o.m * start, o.floor || 0), due);
}

// [Recurrence relations] B(k) = B(k-1) + interest - payment,
// i.e. (1+r)·B(k-1) - p for fixed payments, or (1+r-m)·B(k-1) for a percentage with no floor.
export function simulate(o: SingleOptions): SimResult {
  const B0 = o.balance;
  const r = o.apr / 100 / 12;
  const neverDecreases = o.strategy === "fixed" && o.p <= r * B0;
  const limit = neverDecreases ? STUCK_MONTHS : MAX_MONTHS;
  const rows: Row[] = [];
  let bal = B0;
  let totalPaid = 0;
  let months: number | null = null;
  let monthsTo1pct: number | null = null;
  for (let k = 1; k <= limit; k++) {
    const start = bal;
    const interest = start * r;
    const due = start + interest;
    const payment = paymentFor(o, start, due);
    const end = due - payment;
    rows.push({ month: k, start, interest, payment, end });
    totalPaid += payment;
    if (monthsTo1pct === null && end <= 0.01 * B0) monthsTo1pct = k;
    if (end <= EPS_PAID) {
      months = k;
      break;
    }
    bal = end;
  }
  return {
    rows,
    r,
    months,
    monthsTo1pct,
    totalPaid,
    // total interest = everything paid - starting balance (the <= 0.5 satang left counts as paid)
    totalInterest: months === null ? null : totalPaid - B0,
    firstPayment: rows[0].payment,
    lastPayment: months === null ? null : rows[rows.length - 1].payment,
    neverDecreases,
  };
}

// [Recurrence relations -> closed form] Bn = (1+r)^n·B0 - p·((1+r)^n - 1)/r
export function closedFormFixed(B0: number, r: number, p: number, n: number): number {
  if (r === 0) return B0 - p * n;
  const g = Math.pow(1 + r, n);
  return g * B0 - (p * (g - 1)) / r;
}

// [Recurrence relations -> closed form] Bn = B0·(1+r-m)^n (percentage, floor = 0)
export function closedFormPct(B0: number, r: number, m: number, n: number): number {
  return B0 * Math.pow(1 + r - m, n);
}

// Set Bn = 0 in the closed form and solve for p: p = r·B0 / (1 - (1+r)^(-n))
export function requiredPayment(balance: number, apr: number, n: number): { exact: number; roundedUp: number } {
  const r = apr / 100 / 12;
  const exact = r === 0 ? balance / n : (r * balance) / (1 - Math.pow(1 + r, -n));
  return { exact, roundedUp: Math.ceil(exact - 1e-9) };
}

// [Mathematical reasoning] Largest gap (baht) between the closed form and the month-by-month table.
// Only months paid by the normal rule are checked (the final partial payment is outside the closed form).
export function verifyClosedForm(o: SingleOptions, maxMonths: number): number {
  const sim = simulate(o);
  const r = sim.r;
  let maxDiff = 0;
  for (let i = 0; i < sim.rows.length && i < maxMonths; i++) {
    const row = sim.rows[i];
    const n = row.month;
    let cf: number;
    if (o.strategy === "fixed") {
      if (row.payment !== o.p) break;
      cf = closedFormFixed(o.balance, r, o.p, n);
    } else {
      if (row.payment !== o.m * row.start) break;
      cf = closedFormPct(o.balance, r, o.m, n);
    }
    maxDiff = Math.max(maxDiff, Math.abs(cf - row.end));
  }
  return maxDiff;
}

// Payments per year split into interest and principal (principal = payment - interest).
export function splitByYear(rows: Row[]): YearSplit[] {
  const out: YearSplit[] = [];
  rows.forEach((w) => {
    const y = Math.floor((w.month - 1) / 12) + 1;
    if (!out[y - 1]) out[y - 1] = { year: y, interest: 0, principal: 0, payment: 0 };
    out[y - 1].interest += w.interest;
    out[y - 1].payment += w.payment;
  });
  out.forEach((o) => {
    o.principal = o.payment - o.interest;
  });
  return out;
}

// [Mathematical reasoning] One induction step with real numbers:
// apply the recurrence to Bk and compare with the closed form at k+1.
export function inductionStepDemo(o: { balance: number; apr: number; p: number; k: number }) {
  const r = o.apr / 100 / 12;
  const Bk = closedFormFixed(o.balance, r, o.p, o.k);
  const nextByRecurrence = (1 + r) * Bk - o.p;
  const nextByClosedForm = closedFormFixed(o.balance, r, o.p, o.k + 1);
  return { Bk, nextByRecurrence, nextByClosedForm, diff: Math.abs(nextByRecurrence - nextByClosedForm) };
}

// Several cards: each card still follows B(k) = (1+r)·B(k-1) - payment to that card. [Recurrence relations]
export function simulateMulti(o: { cards: Card[]; budget: number; strategy: MultiStrategy }): MultiResult {
  const { cards, strategy: strat } = o;
  const n = cards.length;
  const bal = cards.map((c) => c.balance);
  const paidOffMonth: (number | null)[] = cards.map(() => null);
  const totals: MultiResult["totals"] = [];
  let totalPaid = 0;
  let months: number | null = null;
  let budgetTooLow = false;
  const B0sum = bal.reduce((s, x) => s + x, 0);
  for (let k = 1; k <= MAX_MONTHS; k++) {
    const active: number[] = [];
    const due: number[] = [];
    const minPay: number[] = [];
    const pay: number[] = [];
    for (let i = 0; i < n; i++) {
      pay[i] = 0;
      if (paidOffMonth[i] !== null) continue;
      const start = bal[i];
      const c = cards[i];
      due[i] = start * (1 + c.apr / 100 / 12);
      minPay[i] = Math.min(Math.max(c.m * start, c.floor || 0), due[i]);
      active.push(i);
    }
    if (k === 1 && strat !== "minonly") {
      budgetTooLow = o.budget < active.reduce((s, i) => s + minPay[i], 0);
    }
    if (strat === "minonly") {
      active.forEach((i) => {
        pay[i] = minPay[i];
      });
    } else {
      // priority: avalanche = highest APR first, snowball = smallest balance first (ties keep input order)
      const order = active.slice().sort((x, y) => {
        const d = strat === "avalanche" ? cards[y].apr - cards[x].apr : bal[x] - bal[y];
        return d !== 0 ? d : x - y;
      });
      let left = o.budget;
      order.forEach((i) => {
        const t = Math.min(minPay[i], left);
        pay[i] = t;
        left -= t;
      }); // minimums first
      order.forEach((i) => {
        const t = Math.min(due[i] - pay[i], left);
        pay[i] += t;
        left -= t;
      }); // leftover goes to the priority card
    }
    let sumEnd = 0;
    let sumPay = 0;
    active.forEach((i) => {
      const end = due[i] - pay[i];
      sumPay += pay[i];
      if (end <= EPS_PAID) {
        paidOffMonth[i] = k;
        bal[i] = 0;
      } else {
        bal[i] = end;
        sumEnd += end;
      }
    });
    totalPaid += sumPay;
    totals.push({ month: k, balance: sumEnd, payment: sumPay });
    if (paidOffMonth.every((x) => x !== null)) {
      months = k;
      break;
    }
  }
  return { months, paidOffMonth, totals, totalPaid, totalInterest: months === null ? null : totalPaid - B0sum, budgetTooLow };
}

// State in the URL hash (encodeURIComponent, not btoa, so it also works in Node).
export function encodeState(obj: unknown): string {
  return encodeURIComponent(JSON.stringify(obj));
}
export function decodeState(str: string): unknown | null {
  try {
    return JSON.parse(decodeURIComponent(String(str).replace(/^#/, "")));
  } catch {
    return null;
  }
}
