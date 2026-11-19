"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { requiredPayment, simulate } from "@/lib/debt";
import { durationText, formatBaht } from "@/lib/format";
import { useCalc } from "./CalcContext";
import { Stat } from "./Stat";

// Shared with the math explainer (step 3), which shows the same calculation.
export function useRequired() {
  const { single } = useCalc();
  const { bal, apr, n } = single.v;
  return useMemo(() => {
    const rp = requiredPayment(bal, apr, n);
    return { rp, sim: simulate({ balance: bal, apr, strategy: "fixed", p: rp.roundedUp }) };
  }, [bal, apr, n]);
}

export function RequiredPayment() {
  const { t, lang, state, errors, setSingle, applyRequiredPayment } = useCalc();
  const { rp, sim } = useRequired();
  return (
    <Panel className="no-print">
      <PanelTitle>{t.need.heading}</PanelTitle>
      <NumberField label={t.need.n} inputMode="numeric" value={state.single.n} onChange={(v) => setSingle("n", v)} error={errors.n ? t.errors.n : null} errorPrefix={t.errors.prefix} />
      <div className="mt-3">
        <Stat label={t.need.pay} big>
          {t.unit.baht(formatBaht(rp.roundedUp))}
        </Stat>
        <div className="grid grid-cols-2 gap-x-4">
          <Stat label={t.results.paidIn}>{durationText(sim, lang)}</Stat>
          <Stat label={t.results.totalInterest}>{sim.totalInterest === null ? t.unit.none : t.unit.baht(formatBaht(sim.totalInterest))}</Stat>
        </div>
      </div>
      <Button className="mt-4" onClick={applyRequiredPayment}>
        {t.need.use}
      </Button>
    </Panel>
  );
}
