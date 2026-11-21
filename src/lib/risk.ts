// [Ch 7 Discrete probability] The odds of missing payments, and a seeded simulation of what misses cost.
// Pure: no DOM, no React. The simulation uses a fixed seed so the page shows the same numbers every time.
import { simulate } from "./debt";
import { START, step, type AccountState } from "./fsm";

const EPS_PAID = 0.005; // same "paid off" threshold as debt.ts
const MAX_MONTHS = 1200;

// Complement rule: P(at least one miss) = 1 − P(no miss in any month).
export function missAtLeastOnce(q: number, months = 12): number {
  return 1 - (1 - q) ** months;
}

// Linearity of expectation: each month contributes q.
export function expectedMisses(q: number, months = 12): number {
  return months * q;
}

// [Ch 6 Counting] C(n, k)
function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Binomial: P(X = k) = C(n,k)·q^k·(1−q)^(n−k)
export function binomialPmf(n: number, k: number, q: number): number {
  return choose(n, k) * q ** k * (1 - q) ** (n - k);
}

// P(0), P(1), P(2), P(3), P(4 or more) missed months out of n.
export function missBuckets(q: number, n = 12): [number, number, number, number, number] {
  const first = [0, 1, 2, 3].map((k) => binomialPmf(n, k, q));
  const rest = Math.max(0, 1 - first.reduce((a, c) => a + c, 0));
  return [first[0], first[1], first[2], first[3], rest];
}

// Small, fast, seedable 32-bit generator.
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RiskSummary = {
  paths: number;
  medianMonths: number | null; // null when that path never pays off within 100 years
  p90Months: number | null;
  baselineMonths: number;
  avgExtraCost: number; // interest + fees beyond the no-miss plan, averaged over paths
  defaultShare: number; // share of paths whose account status ever reaches Default
  unpaidShare: number; // share of paths not paid off within 100 years
};

// Nearest-rank percentile of a sorted list; Infinity means "never paid off".
function percentile(sorted: number[], p: number): number | null {
  const v = sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  return Number.isFinite(v) ? v : null;
}

export function simulateMisses(o: { balance: number; apr: number; p: number; q: number; fee: number; paths?: number; seed?: number }): RiskSummary | null {
  const { balance: B0, p, q, fee } = o;
  const paths = o.paths ?? 1000;
  const r = o.apr / 100 / 12;
  if (p <= r * B0) return null; // the plan itself never reduces the debt

  const base = simulate({ balance: B0, apr: o.apr, strategy: "fixed", p });
  const baselineMonths = base.months ?? MAX_MONTHS;
  const baselineInterest = base.totalInterest ?? 0;
  const rand = mulberry32(o.seed ?? 12345);

  const months: number[] = [];
  let extraSum = 0;
  let defaults = 0;
  let unpaid = 0;
  for (let i = 0; i < paths; i++) {
    let bal = B0;
    let paid = 0;
    let state: AccountState = START;
    let reachedDefault = false;
    let doneAt = Infinity;
    for (let k = 1; k <= MAX_MONTHS; k++) {
      const due = bal * (1 + r);
      if (rand() < q) {
        bal = due + fee; // missed: nothing paid, interest still grows, the late fee is added
        state = step(state, "M");
      } else {
        const pay = Math.min(p, due);
        paid += pay;
        bal = due - pay;
        state = step(state, "P");
      }
      if (state === "default") reachedDefault = true;
      if (bal <= EPS_PAID) {
        doneAt = k;
        break;
      }
    }
    if (doneAt === Infinity) unpaid++;
    if (reachedDefault) defaults++;
    months.push(doneAt);
    // everything paid plus what is still owed, minus the starting balance = interest + fees
    const cost = paid + (doneAt === Infinity ? bal : 0) - B0;
    extraSum += cost - baselineInterest;
  }
  months.sort((a, b) => a - b);
  return {
    paths,
    medianMonths: percentile(months, 0.5),
    p90Months: percentile(months, 0.9),
    baselineMonths,
    avgExtraCost: extraSum / paths,
    defaultShare: defaults / paths,
    unpaidShare: unpaid / paths,
  };
}
