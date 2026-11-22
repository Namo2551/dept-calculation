// "What if" plans built on the same month-by-month rule as debt.ts (Ch 8), plus a binary search (Ch 3).
// Pure: no DOM, no React.
import { simulate } from "./debt";

const EPS_PAID = 0.005; // same "paid off" threshold as debt.ts
const MAX_MONTHS = 1200;

// Method B with one extra payment of `amount` in month `month`, on top of the normal payment.
export function simulateWithBonus(o: { balance: number; apr: number; p: number; amount: number; month: number }): {
  months: number | null;
  totalInterest: number | null;
  afterPayoff: boolean;
} {
  const { balance: B0, p, amount, month } = o;
  const r = o.apr / 100 / 12;
  const plain = simulate({ balance: B0, apr: o.apr, strategy: "fixed", p });
  if (plain.months !== null && plain.months < month) {
    return { months: plain.months, totalInterest: plain.totalInterest, afterPayoff: true };
  }
  let bal = B0;
  let paid = 0;
  for (let k = 1; k <= MAX_MONTHS; k++) {
    const due = bal + bal * r;
    let pay = Math.min(p, due);
    if (k === month) pay += Math.min(amount, due - pay);
    paid += pay;
    bal = due - pay;
    if (bal <= EPS_PAID) return { months: k, totalInterest: paid - B0, afterPayoff: false };
    // after the bonus, a payment that no longer beats the interest means it never ends
    if (k >= month && p <= r * bal) break;
  }
  return { months: null, totalInterest: null, afterPayoff: false };
}

export type SearchStep = { low: number; high: number; guess: number; interest: number | null; ok: boolean };

// [Ch 3 Algorithms] Binary search for the smallest whole-baht fixed payment whose total interest is at
// most `limit`. More money a month always means less interest, so the answer splits the range in two.
export function paymentForInterestLimit(balance: number, apr: number, limit: number): {
  payment: number;
  months: number;
  interest: number;
  reachable: boolean;
  steps: SearchStep[];
} {
  const r = apr / 100 / 12;
  const interestOf = (p: number) => simulate({ balance, apr, strategy: "fixed", p }).totalInterest;
  let low = r === 0 ? 1 : Math.floor(r * balance) + 1; // anything lower never reduces the debt
  let high = Math.ceil(balance * (1 + r) - 1e-9); // pays everything next month: the least interest possible
  const best = simulate({ balance, apr, strategy: "fixed", p: high });
  if (best.totalInterest! > limit) {
    return { payment: high, months: best.months!, interest: best.totalInterest!, reachable: false, steps: [] };
  }
  const steps: SearchStep[] = [];
  while (low < high) {
    const guess = Math.floor((low + high) / 2);
    const interest = interestOf(guess);
    const ok = interest !== null && interest <= limit;
    steps.push({ low, high, guess, interest, ok });
    if (ok) high = guess;
    else low = guess + 1;
  }
  const sim = simulate({ balance, apr, strategy: "fixed", p: low });
  return { payment: low, months: sim.months!, interest: sim.totalInterest!, reachable: true, steps };
}
