"use client";
import { useId, useMemo, useRef, useState } from "react";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { useElementWidth } from "@/hooks/useElementWidth";
import { groupYears, niceMax, shortBaht } from "@/lib/chart";
import { splitByYear } from "@/lib/debt";
import { formatBaht } from "@/lib/format";
import { useCalc } from "./CalcContext";

export function YearlyChart() {
  const { t, single } = useCalc();
  const [method, setMethod] = useState<"A" | "B">("A");
  const box = useRef<HTMLDivElement>(null);
  const hatch = "hatch" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const years = useMemo(() => splitByYear(single[method].rows), [single, method]);
  const groups = groupYears(years);
  const by5 = years.length > 15;

  const W = Math.max(300, Math.min(940, useElementWidth(box)));
  const H = W < 480 ? 250 : 290;
  const L = 52, R = 10, T = 22, Bm = 40;
  const col = method === "A" ? "var(--series-a)" : "var(--series-b)";
  const ymax = niceMax(Math.max(...groups.map((g) => Math.max(0, g.principal) + g.interest)));
  const y = (v: number) => T + (H - T - Bm) * (1 - v / ymax);
  const slot = (W - L - R) / groups.length;
  const bw = Math.min(56, slot * 0.7);
  const y1 = years[0];

  return (
    <Panel id="yearly-sec" className="no-print">
      <PanelTitle>{t.yearly.heading}</PanelTitle>
      <ToggleGroup<"A" | "B">
        label={t.yearly.methodLabel}
        value={method}
        onChange={setMethod}
        options={[{ value: "A", label: t.yearly.methodA }, { value: "B", label: t.yearly.methodB }]}
      />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.93rem] mt-5 mb-2">
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="14" aria-hidden="true"><rect width="18" height="14" fill={col} /></svg>
          {t.yearly.principal}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="14" aria-hidden="true"><rect width="18" height="14" fill={`url(#${hatch})`} stroke={col} /></svg>
          {t.yearly.interest}
        </span>
      </div>
      <div ref={box} className="bg-bg border border-hair p-3 sm:p-4">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.yearly.aria} className="block w-full h-auto">
          <defs>
            <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={col} strokeWidth="3" />
            </pattern>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => {
            const yv = (ymax * i) / 4;
            return (
              <g key={i}>
                <line x1={L} x2={W - R} y1={y(yv)} y2={y(yv)} stroke="var(--grid)" />
                <text x={L - 6} y={y(yv) + 5} textAnchor="end" fontSize="13" fill="var(--muted)">{shortBaht(yv)}</text>
              </g>
            );
          })}
          {groups.map((g, i) => {
            const cx = L + slot * (i + 0.5);
            const p = Math.max(0, g.principal);
            const yP = y(p), yI = y(p + g.interest);
            return (
              <g key={g.label}>
                <rect x={cx - bw / 2} y={yP} width={bw} height={y(0) - yP} fill={col}>
                  <title>{t.yearly.tipPrincipal(formatBaht(g.principal))}</title>
                </rect>
                <rect x={cx - bw / 2} y={yI} width={bw} height={yP - yI} fill={`url(#${hatch})`} stroke={col}>
                  <title>{t.yearly.tipInterest(formatBaht(g.interest))}</title>
                </rect>
                <text x={cx} y={H - Bm + 18} textAnchor="middle" fontSize="12" fill="var(--muted)">{g.label}</text>
                {bw >= 30 && (
                  <text x={cx} y={yI - 5} textAnchor="middle" fontSize="12" fill="var(--ink)">{shortBaht(p + g.interest)}</text>
                )}
              </g>
            );
          })}
          <text x={W - R} y={H - 4} textAnchor="end" fontSize="12" fill="var(--muted)">{by5 ? t.yearly.axis5 : t.yearly.axis}</text>
        </svg>
      </div>
      <p className="mt-4 text-sm text-muted">
        {t.yearly.note(formatBaht(y1.interest), formatBaht(y1.principal))}
        {years.some((yr) => yr.principal <= 0) ? t.yearly.noPrincipal : ""}
      </p>
    </Panel>
  );
}
