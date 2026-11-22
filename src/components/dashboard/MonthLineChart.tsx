"use client";
import { LineChart, halo, type Series } from "@/components/charts/LineChart";

type Line = { data: number[]; label: string };

// A calendar-month balance chart on top of the shared LineChart: a solid line from the first month, an optional
// dashed line that starts later (a projection or a plan), a "today" marker and an optional target line.
// The month names of the first month, today and the last month are printed under the chart.
export function MonthLineChart({
  months,
  solid,
  dashed,
  dashedFrom = 0,
  todayIndex,
  todayLabel,
  target,
  aria,
}: {
  months: string[]; // labels, one per month
  solid: Line;
  dashed?: Line;
  dashedFrom?: number; // month index where the dashed line starts
  todayIndex?: number;
  todayLabel?: string;
  target?: { value: number; label: string };
  aria: string;
}) {
  const len = Math.max(1, months.length - 1);
  const ymax = Math.max(1, ...solid.data, ...(dashed?.data ?? []), target?.value ?? 0);
  const series: Series[] = [{ data: solid.data, color: "var(--series-a)", label: solid.label, at: Math.max(1, Math.floor((solid.data.length - 1) / 2)), dy: -10 }];
  return (
    <div>
      <LineChart
        len={len}
        ymax={ymax}
        series={series}
        aria={aria}
        extra={({ x, y, W }) => (
          <>
            {dashed && dashed.data.length > 1 && (
              <>
                <path
                  d={dashed.data.map((b, k) => (k ? "L" : "M") + x(dashedFrom + k).toFixed(1) + " " + y(b).toFixed(1)).join("")}
                  fill="none"
                  stroke="var(--series-b)"
                  strokeWidth="3"
                  strokeDasharray="9 6"
                  strokeLinecap="round"
                />
                {(() => {
                  const k = Math.max(1, Math.floor((dashed.data.length - 1) / 2));
                  return (
                    <text x={x(dashedFrom + k) + 4} y={y(dashed.data[k]) + 22} fontSize="14" fontWeight="700" fill="var(--series-b)" {...halo}>
                      {dashed.label}
                    </text>
                  );
                })()}
              </>
            )}
            {todayIndex !== undefined && todayIndex > 0 && todayIndex < len && (
              <g>
                <line x1={x(todayIndex)} x2={x(todayIndex)} y1={y(ymax)} y2={y(0)} stroke="var(--muted)" strokeDasharray="2 4" />
                {todayLabel && (
                  <text x={x(todayIndex) + 4} y={y(0) - 6} fontSize="13" fill="var(--muted)" {...halo}>
                    {todayLabel}
                  </text>
                )}
              </g>
            )}
            {target && (
              <g>
                <line x1={x(0)} x2={W - 14} y1={y(target.value)} y2={y(target.value)} stroke="var(--good)" strokeWidth="2" strokeDasharray="4 4" />
                <text x={W - 18} y={y(target.value) - 6} textAnchor="end" fontSize="13" fontWeight="700" fill="var(--good)" {...halo}>
                  {target.label}
                </text>
              </g>
            )}
          </>
        )}
      />
      {months.length > 0 && (
        <p className="mt-1 flex justify-between gap-2 text-sm text-muted num" aria-hidden="true">
          <span>{months[0]}</span>
          {todayIndex !== undefined && todayIndex > 0 && todayIndex < months.length - 1 && <span>{months[todayIndex]}</span>}
          <span>{months[months.length - 1]}</span>
        </p>
      )}
    </div>
  );
}
