"use client";
import { LineChart } from "@/components/charts/LineChart";
import { strategyCopy as C } from "@/copy/strategy";
import type { MultiStrategy } from "@/lib/debt";

// Each strategy keeps its own line style (same as /multi), so the chart never relies on color alone.
export const LOOK: Record<MultiStrategy, { color: string; dash?: string }> = {
  minonly: { color: "var(--muted)", dash: "2 5" },
  avalanche: { color: "var(--series-a)" },
  snowball: { color: "var(--series-b)", dash: "9 6" },
};

export function LineSample({ s }: { s: MultiStrategy }) {
  return (
    <svg width="34" height="10" aria-hidden="true" className="shrink-0">
      <line x1="0" x2="34" y1="5" y2="5" stroke={LOOK[s].color} strokeWidth="3" strokeDasharray={LOOK[s].dash} strokeLinecap="round" />
    </svg>
  );
}

const ORDER: MultiStrategy[] = ["minonly", "avalanche", "snowball"];

// Total balance of all debts by month for the three plans. `balances` start at month 0 (today).
export function StrategyChart({ lines }: { lines: Record<MultiStrategy, { balances: number[]; months: number | null }> }) {
  const len = Math.max(12, Math.min(480, Math.max(...ORDER.map((s) => lines[s].months ?? lines[s].balances.length - 1))));
  const series = ORDER.map((s, i) => {
    const { balances, months } = lines[s];
    const data = balances.slice(0, len + 1);
    while (data.length <= len && months !== null) data.push(0);
    const end = months ?? len;
    return { data, ...LOOK[s], label: C.plans.short[s], at: [len * 0.45, end * 0.25, end * 0.6][i], dy: [-10, 22, -12][i] };
  });
  const said = (s: MultiStrategy) => (lines[s].months === null ? C.chart.neverEnds : C.chart.ends(lines[s].months!));
  return (
    <>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.93rem] mb-2">
        {ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <LineSample s={s} />
            {C.plans.legend[s]}
          </span>
        ))}
      </div>
      <div className="inset-card p-3 sm:p-4">
        <LineChart len={len} ymax={Math.max(...series.map((s) => Math.max(...s.data)))} series={series} aria={C.chart.aria(said("avalanche"), said("snowball"), said("minonly"))} />
      </div>
    </>
  );
}
