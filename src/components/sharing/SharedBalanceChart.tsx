"use client";
import { LineChart } from "@/components/charts/LineChart";

// Actual (solid) and planned (dashed) balance by month for one shared debt or plan.
export function SharedBalanceChart({ actual, planned, aria, actualLabel, plannedLabel }: { actual: number[]; planned: number[]; aria: string; actualLabel: string; plannedLabel: string }) {
  const len = Math.max(actual.length, planned.length) - 1;
  const ymax = Math.max(1, ...actual, ...planned);
  const series = [
    ...(planned.length > 1 ? [{ data: planned, color: "var(--series-b)", dash: "9 6", label: plannedLabel, at: Math.min(planned.length - 1, Math.max(1, len * 0.6)), dy: -10 }] : []),
    ...(actual.length > 1 ? [{ data: actual, color: "var(--series-a)", label: actualLabel, at: Math.max(1, actual.length - 1), dy: -10 }] : []),
  ];
  return <LineChart len={Math.max(1, len)} ymax={ymax} series={series} aria={aria} />;
}
