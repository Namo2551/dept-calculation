"use client";
import { useRef } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { niceMax, shortBaht } from "@/lib/chart";

export type Bar = { label: string; title?: string; value: number; marker?: number };

// Monthly bars with an optional planned-value marker (a short dark line across each bar).
// On narrow screens only every other label is shown so they never overlap.
export function BarChart({ bars, aria }: { bars: Bar[]; aria: string }) {
  const box = useRef<HTMLDivElement>(null);
  const W = Math.max(300, Math.min(940, useElementWidth(box)));
  const H = W < 480 ? 240 : 280;
  const L = 52, R = 10, T = 14, Bm = 36;
  const ymax = niceMax(Math.max(0, ...bars.map((b) => Math.max(b.value, b.marker ?? 0))));
  const slot = (W - L - R) / Math.max(1, bars.length);
  const bw = Math.max(4, slot * 0.62);
  const y = (v: number) => T + (H - T - Bm) * (1 - Math.max(0, v) / ymax);
  const every = slot < 30 ? 3 : slot < 40 ? 2 : 1;
  return (
    <div ref={box} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} className="block w-full h-auto">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (ymax * i) / 4;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
              <text x={L - 6} y={y(v) + 5} textAnchor="end" fontSize="13" fill="var(--muted)">
                {shortBaht(v)}
              </text>
            </g>
          );
        })}
        {bars.map((b, i) => {
          const cx = L + slot * i + slot / 2;
          return (
            <g key={i}>
              {b.title && <title>{b.title}</title>}
              <rect data-bar x={(cx - bw / 2).toFixed(1)} y={y(b.value).toFixed(1)} width={bw.toFixed(1)} height={(y(0) - y(b.value)).toFixed(1)} fill="var(--series-b)" />
              {b.marker !== undefined && b.marker > 0 && (
                <line data-marker x1={(cx - slot * 0.45).toFixed(1)} x2={(cx + slot * 0.45).toFixed(1)} y1={y(b.marker).toFixed(1)} y2={y(b.marker).toFixed(1)} stroke="var(--series-a)" strokeWidth="3" />
              )}
              {i % every === (bars.length - 1) % every && (
                <text x={cx} y={H - Bm + 20} textAnchor="middle" fontSize="12" fill="var(--muted)">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
