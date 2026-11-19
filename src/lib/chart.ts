// Pure chart geometry shared by the balance, yearly and multi-card charts.
import type { Lang } from "@/i18n/types";
import type { SimResult, YearSplit } from "./debt";

// Round an axis maximum up to 1, 2, 2.5, 5 or 10 times a power of ten. Non-positive or non-finite input gives 1.
export function niceMax(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

export function shortBaht(x: number): string {
  if (x >= 1e6) return +(x / 1e6).toFixed(2) + "M";
  if (x >= 1000) return +(x / 1000).toFixed(1) + "k";
  return String(Math.round(x));
}

// End-of-month balances for months 0..len (0 once paid off; stops where a never-ending simulation stops).
export function balanceSeries(sim: SimResult, B0: number, len: number): number[] {
  const a = [B0];
  for (let k = 1; k <= len; k++) {
    if (k <= sim.rows.length) a.push(sim.rows[k - 1].end);
    else if (sim.months !== null) a.push(0);
    else break;
  }
  return a;
}

export function chartLength(A: SimResult, B: SimResult, range: "all" | "60" | "120"): number {
  if (range !== "all") return Number(range);
  const mA = A.months || A.rows.length;
  const mB = B.months || B.rows.length;
  return Math.max(12, Math.min(480, Math.max(mA, mB)));
}

export function xTickStep(len: number): number {
  return len <= 24 ? 6 : len <= 60 ? 12 : len <= 120 ? 24 : len <= 240 ? 60 : 120;
}

export function xTickLabel(k: number, step: number, lang: Lang): string {
  if (step < 12) return k + (lang === "en" ? " mo" : " ด.");
  return k / 12 + (lang === "en" ? " yr" : " ปี");
}

// More than 15 years: combine into 5-year bars ("1-5", ..., last group ends at the real last year).
export function groupYears(years: YearSplit[]): { label: string; interest: number; principal: number }[] {
  if (years.length <= 15) return years.map((y) => ({ label: String(y.year), interest: y.interest, principal: y.principal }));
  const groups: { label: string; interest: number; principal: number }[] = [];
  years.forEach((y) => {
    const gi = Math.floor((y.year - 1) / 5);
    if (!groups[gi]) groups[gi] = { label: "", interest: 0, principal: 0 };
    groups[gi].interest += y.interest;
    groups[gi].principal += y.principal;
    groups[gi].label = gi * 5 + 1 + "-" + y.year;
  });
  return groups;
}

export function playStep(len: number, speed: 1 | 2 | 4): number {
  return Math.max(1, Math.round(len / 120)) * speed;
}
