"use client";
import { halo, LineChart } from "@/components/charts/LineChart";
import { debtsCopy } from "@/copy/debts";
import { formatMoneyShort } from "@/lib/money";

const C = debtsCopy.plan;

// Planned vs actual balance by month since the baseline started, with a dot for today's balance.
export function PlanVsActual({ planned, actual, len, todayIndex, currency }: { planned: number[]; actual: number[]; len: number; todayIndex: number; currency: string }) {
  const ymax = Math.max(...planned, ...actual);
  const plannedNow = planned[Math.min(todayIndex, planned.length - 1)] ?? 0;
  const today = actual[todayIndex] ?? 0;
  const series = [
    { data: planned, color: "var(--series-a)", dash: "9 6", label: C.planned, at: Math.max(1, Math.round(len * 0.6)), dy: -10 },
    { data: actual, color: "var(--series-b)", label: C.actual, at: Math.max(1, todayIndex - 1), dy: 22 },
  ];
  return (
    <LineChart
      len={len}
      ymax={ymax}
      series={series}
      aria={C.chartAria(formatMoneyShort(plannedNow, currency), formatMoneyShort(today, currency))}
      extra={({ x, y }) => (
        <g>
          <circle cx={x(todayIndex)} cy={y(today)} r={6} fill="var(--series-b)" stroke="var(--bg)" strokeWidth={2} />
          <text x={x(todayIndex) + 9} y={y(today) - 9} fontSize="13" fontWeight="700" fill="var(--series-b)" {...halo}>
            {C.today}
          </text>
        </g>
      )}
    />
  );
}
