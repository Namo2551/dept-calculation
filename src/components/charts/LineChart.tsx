"use client";
import { useRef } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { Lang } from "@/i18n/types";
import { niceMax, shortBaht, xTickLabel, xTickStep } from "@/lib/chart";

export type Series = { data: number[]; color: string; dash?: string; label: string; at: number; dy: number };
export type Scale = { x: (k: number) => number; y: (b: number) => number; W: number; H: number };

// Labels on top of lines get a halo in the page color so they stay readable where they cross a line.
export const halo = { stroke: "var(--bg)", strokeWidth: 4, paintOrder: "stroke" as const };

// Balance-over-months line chart shared by the single-card and multi-card sections.
export function LineChart({
  len,
  ymax: rawMax,
  series,
  aria,
  lang,
  extra,
}: {
  len: number;
  ymax: number;
  series: Series[];
  aria: string;
  lang: Lang;
  extra?: (s: Scale) => React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const W = Math.max(300, Math.min(940, useElementWidth(box)));
  const H = W < 480 ? 280 : 330;
  const L = 52, R = 14, T = 14, Bm = 40;
  const ymax = niceMax(rawMax);
  const x = (k: number) => L + ((W - L - R) * k) / Math.max(1, len);
  const y = (b: number) => T + (H - T - Bm) * (1 - Math.max(0, b) / ymax);
  const step = xTickStep(len);
  const xTicks: number[] = [];
  for (let k = 0; k <= len; k += step) xTicks.push(k);

  return (
    <div ref={box} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} className="block w-full h-auto">
        {[0, 1, 2, 3, 4].map((i) => {
          const yv = (ymax * i) / 4;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(yv)} y2={y(yv)} stroke="var(--grid)" />
              <text x={L - 6} y={y(yv) + 5} textAnchor="end" fontSize="13" fill="var(--muted)">
                {shortBaht(yv)}
              </text>
            </g>
          );
        })}
        {xTicks.map((k) => (
          <text key={k} x={x(k)} y={H - Bm + 20} textAnchor="middle" fontSize="13" fill="var(--muted)">
            {xTickLabel(k, step, lang)}
          </text>
        ))}
        {series.map((s, i) =>
          s.data.length < 2 ? null : (
            <path
              key={i}
              d={s.data.map((b, k) => (k ? "L" : "M") + x(k).toFixed(1) + " " + y(b).toFixed(1)).join("")}
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={s.dash || undefined}
            />
          ),
        )}
        {series.map((s, i) => {
          const k = Math.min(s.data.length - 1, Math.max(1, Math.round(s.at)));
          if (!(k >= 1)) return null;
          return (
            <text key={"l" + i} x={x(k) + 4} y={y(s.data[k]) + s.dy} fontSize="14" fontWeight="700" fill={s.color} {...halo}>
              {s.label}
            </text>
          );
        })}
        {extra?.({ x, y, W, H })}
      </svg>
    </div>
  );
}
