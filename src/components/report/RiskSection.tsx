"use client";
import { useMemo } from "react";
import { useCalc } from "@/components/calculator/CalcContext";
import { Stat } from "@/components/calculator/Stat";
import { NumberField } from "@/components/ui/NumberField";
import { formatBaht, monthsToText } from "@/lib/format";
import { binomialPmf, expectedMisses, missAtLeastOnce, missBuckets, simulateMisses } from "@/lib/risk";
import type { SingleRaw } from "@/lib/state";
import { BinomialBars, pct1 } from "./BinomialBars";

const trim = (x: number, d: number) => String(Number(x.toFixed(d)));

// Section 6 (Ch 7): exact odds of missing payments, and a seeded simulation of what misses cost on plan B.
export function RiskSection() {
  const { t, state, errors, setSingle, single } = useCalc();
  const R = t.risk;
  const { v } = single;
  const q = v.q / 100;

  const sim = useMemo(() => simulateMisses({ balance: v.bal, apr: v.apr, p: v.p, q, fee: v.fee }), [v.bal, v.apr, v.p, q, v.fee]);

  const field = (k: keyof SingleRaw, label: string) => (
    <NumberField label={label} value={state.single[k]} onChange={(x) => setSingle(k, x)} error={errors[k] ? t.errors[k] : null} errorPrefix={t.errors.prefix} />
  );
  const baht = (x: number) => t.unit.baht(formatBaht(Math.abs(x) < 0.005 ? 0 : x));
  const months = (m: number | null) => (m === null ? R.never : monthsToText(m));

  return (
    <div className="grid gap-6 min-w-0">
      <p className="text-muted max-w-[70ch]">{R.intro}</p>
      <div className="grid gap-5 sm:grid-cols-2 max-w-[720px]">
        {field("q", R.q)}
        {field("fee", R.fee)}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="inset-card p-5 sm:p-7 min-w-0">
          <h3 className="text-xl font-display font-medium mb-3">{R.exactTitle}</h3>
          <div className="grid grid-cols-2 gap-x-4">
            <Stat label={R.atLeastOnce} big>{pct1(missAtLeastOnce(q))}</Stat>
            <Stat label={R.expected} big>{trim(expectedMisses(q), 2)}</Stat>
          </div>
          <Stat label={R.formula}>{R.formulaText(trim(q, 4), missAtLeastOnce(q).toFixed(3))}</Stat>
          <p className="mt-4 text-sm text-muted">{R.barsTitle}</p>
          <div className="mt-2 bg-bg border border-hair p-3">
            <BinomialBars buckets={missBuckets(q)} />
          </div>
          <p className="num mt-3 text-sm">{R.worked(trim(q, 4), trim(1 - q, 4), ((1 - q) ** 11).toFixed(4), binomialPmf(12, 1, q).toFixed(3))}</p>
        </div>

        <div className="inset-card p-5 sm:p-7 min-w-0">
          <h3 className="text-xl font-display font-medium mb-3">{R.simTitle}</h3>
          {sim === null ? (
            <p className="text-bad font-semibold">{R.noSim}</p>
          ) : (
            <>
              <Stat label={R.median} big>{months(sim.medianMonths)}</Stat>
              {sim.medianMonths !== null && <p className="text-sm text-muted -mt-1">{R.later(sim.medianMonths - sim.baselineMonths)}</p>}
              <div className="grid sm:grid-cols-2 gap-x-4 mt-2">
                <Stat label={R.p90}>{months(sim.p90Months)}</Stat>
                <Stat label={R.extra}>{sim.avgExtraCost === null ? t.unit.none : baht(sim.avgExtraCost)}</Stat>
                <Stat label={R.defaultShare}>{pct1(sim.defaultShare)}</Stat>
                <Stat label={R.unpaid}>{pct1(sim.unpaidShare)}</Stat>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-muted max-w-[75ch]">{R.model}</p>
    </div>
  );
}
