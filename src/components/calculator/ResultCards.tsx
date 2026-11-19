"use client";
import { CountUp } from "@/components/ui/CountUp";
import { Panel } from "@/components/ui/Panel";
import type { SimResult } from "@/lib/debt";
import { durationText, formatBaht, formatBahtShort, monthsToText } from "@/lib/format";
import { useCalc } from "./CalcContext";
import { Note, Stat } from "./Stat";

function ResultCard({ id, title, sim, children }: { id: "A" | "B"; title: string; sim: SimResult; children?: React.ReactNode }) {
  const { t } = useCalc();
  const baht = (v: number) => t.unit.baht(formatBaht(v));
  return (
    <Panel testId={`result-${id}`}>
      <h2 className="flex items-center gap-3 text-lg sm:text-xl font-semibold tracking-tight mb-2">
        <svg width="34" height="10" aria-hidden="true" className="shrink-0">
          <line x1="0" x2="34" y1="5" y2="5" stroke={id === "A" ? "var(--series-a)" : "var(--series-b)"} strokeWidth="3" strokeDasharray={id === "B" ? "9 6" : undefined} />
        </svg>
        {title}
      </h2>
      <Stat label={t.results.paidIn} big>
        {sim.months !== null ? <CountUp value={sim.months} format={(v) => monthsToText(Math.round(v))} /> : durationText(sim)}
      </Stat>
      <div className="grid grid-cols-2 gap-x-4">
        <Stat label={t.results.totalInterest}>{sim.totalInterest === null ? t.unit.none : <CountUp value={sim.totalInterest} format={baht} />}</Stat>
        <Stat label={t.results.firstPay}>{baht(sim.firstPayment)}</Stat>
        <Stat label={t.results.lastPay}>{sim.lastPayment === null ? t.unit.none : baht(sim.lastPayment)}</Stat>
      </div>
      {children}
    </Panel>
  );
}

export function ResultCards() {
  const { t, single } = useCalc();
  const { A, B, v } = single;
  return (
    <div className="grid gap-7 md:grid-cols-2">
      <ResultCard id="A" title={t.results.titleA(String(v.m), v.floor ? formatBahtShort(v.floor) : null)} sim={A}>
        {v.floor === 0 && (
          <>
            {A.monthsTo1pct !== null && <Stat label={t.results.to1pct}>{t.results.to1pctValue(A.monthsTo1pct, monthsToText(A.monthsTo1pct))}</Stat>}
            <Note>{t.results.neverZero}</Note>
          </>
        )}
      </ResultCard>
      <ResultCard id="B" title={t.results.titleB(formatBahtShort(v.p))} sim={B}>
        {B.neverDecreases && (
          <Note tone="bad" strong>
            {t.results.neverDecreases(formatBaht(B.rows[0].interest))}
          </Note>
        )}
      </ResultCard>
    </div>
  );
}
