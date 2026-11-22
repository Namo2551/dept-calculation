import { formatBaht } from "./format";

// One place to format money for the app pages. THB is the only currency today; others can be added here
// (and in the profile/debt currency columns) without touching the pages.
const SUFFIX: Record<string, string> = { THB: "baht" };

export function formatMoney(value: number, currency = "THB"): string {
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return `${formatBaht(v)} ${SUFFIX[currency] ?? currency}`;
}

// Whole units for compact places (cards, chart labels): "30,000 baht".
export function formatMoneyShort(value: number, currency = "THB"): string {
  return formatMoney(value, currency).replace(/\.00 /, " ");
}

// "January 2028" from 'YYYY-MM-DD'.
export function monthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

// "15 Jan 2026" from 'YYYY-MM-DD'.
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
