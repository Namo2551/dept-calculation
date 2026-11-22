"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { formatBaht, formatBahtShort, monthsToText, payoffDate } from "@/lib/format";
import { paymentForInterestLimit } from "@/lib/plans";
import { useCalc } from "./CalcContext";
import { Stat } from "./Stat";

// [Ch 3 Algorithms] The smallest monthly payment that keeps total interest under the user's limit,
// found by binary search; every guess is listed so the halving range is visible.
export function InterestLimit() {
  const { t, state, errors, setSingle, single, applyLimitPayment } = useCalc();
  const L = t.limit;
  const { bal, apr, lim } = single.v;
  const r = useMemo(() => paymentForInterestLimit(bal, apr, lim), [bal, apr, lim]);
  return (
    <Panel className="no-print" testId="limit-box">
      <PanelTitle as="h3">{L.heading}</PanelTitle>
      <NumberField label={L.label} value={state.single.lim} onChange={(v) => setSingle("lim", v)} error={errors.lim ? t.errors.lim : null} errorPrefix={t.errors.prefix} />
      <div className="mt-3">
        {!r.reachable && <p className="text-bad font-semibold mb-2">{L.unreachable(formatBaht(r.interest))}</p>}
        <Stat label={L.pay} big>
          {t.unit.baht(formatBaht(r.payment))}
        </Stat>
        <div className="grid grid-cols-2 gap-x-4">
          <Stat label={t.results.paidIn}>{monthsToText(r.months)}</Stat>
          <Stat label={t.results.totalInterest}>{t.unit.baht(formatBaht(r.interest))}</Stat>
        </div>
        <p className="text-sm text-muted">{t.results.onDate(payoffDate(r.months, new Date()))}</p>
      </div>
      {r.steps.length > 0 && (
        <>
          <p className="mt-4 text-sm text-muted">{L.note}</p>
          <ol aria-label={L.stepsLabel} className="num mt-2 grid gap-1 text-xs list-decimal pl-5">
            {r.steps.map((s, i) => (
              <li key={i} className={s.ok ? "text-good" : ""}>
                {L.step(formatBahtShort(s.guess), s.interest === null ? t.unit.none : formatBaht(s.interest), s.ok, formatBahtShort(s.low), formatBahtShort(s.high))}
              </li>
            ))}
          </ol>
        </>
      )}
      <Button className="mt-4" onClick={applyLimitPayment}>
        {L.use}
      </Button>
    </Panel>
  );
}
