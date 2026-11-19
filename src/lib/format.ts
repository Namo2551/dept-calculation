// Display text built from numbers (English).
import { simulate, type Row, type SimResult, type SingleOptions } from "./debt";

// Baht with 2 decimals and thousands separators (does not depend on toLocaleString).
export function formatBaht(n: number): string {
  const cents = Math.round(Math.abs(n) * 100);
  const neg = n < 0 && cents !== 0;
  const intPart = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = String(cents % 100).padStart(2, "0");
  return (neg ? "-" : "") + intPart + "." + dec;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// 418 -> "34 years 10 months"
export function monthsToText(n: number): string {
  const y = Math.floor(n / 12);
  const m = n % 12;
  if (y === 0) return plural(m, "month");
  return m === 0 ? plural(y, "year") : `${plural(y, "year")} ${plural(m, "month")}`;
}

// 0.05 -> "5", 0.075 -> "7.5" (trailing zeros dropped)
export function pctText(m: number): string {
  return String(Math.round(m * 100 * 1e6) / 1e6);
}

export function durationText(sim: SimResult): string {
  if (sim.months !== null) return monthsToText(sim.months);
  return sim.neverDecreases ? "Never" : "Over 100 years";
}

// Sentence comparing method A with method B (params = { m: fraction, p: baht }).
export function compareSentence(a: SimResult, b: SimResult, params: { m: number; p: number }): string {
  const bothDone = a.months !== null && b.months !== null;
  // difference of the displayed (satang-rounded) numbers, so a reader subtracting them gets the same result
  const diff = bothDone ? Math.abs(Math.round(a.totalInterest! * 100) - Math.round(b.totalInterest! * 100)) / 100 : 0;
  const clause = (s: SimResult) =>
    s.months === null ? "is not paid off within 100 years" : `takes ${monthsToText(s.months)} (interest ${formatBaht(s.totalInterest!)} baht)`;
  let s = `Paying the ${pctText(params.m)}% minimum ${clause(a)}, while paying a fixed ${formatBaht(params.p)} baht ${clause(b)}`;
  if (bothDone) s += `. Difference: ${formatBaht(diff)} baht`;
  return s;
}

// Text for the first months, showing the sequence being applied step by step.
export function explainFirstMonths(o: SingleOptions, count: number): string[] {
  return simulate(o)
    .rows.slice(0, count)
    .map((w) => `Month ${w.month}: balance ${formatBaht(w.start)} + interest ${formatBaht(w.interest)}, pay ${formatBaht(w.payment)}, left ${formatBaht(w.end)}`);
}

const CSV_HEADER = "Month,Start balance,Interest,Payment,End balance";

export function toCsv(rows: Row[]): string {
  const lines = [CSV_HEADER];
  rows.forEach((w) => lines.push([w.month, w.start.toFixed(2), w.interest.toFixed(2), w.payment.toFixed(2), w.end.toFixed(2)].join(",")));
  return lines.join("\n");
}

// Baht without a trailing ".00" (1469 -> "1,469"), used for amounts written into input fields and titles.
export function formatBahtShort(x: number): string {
  return formatBaht(x).replace(/\.00$/, "");
}
