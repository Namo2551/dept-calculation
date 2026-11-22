"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { formatBaht, monthsToText, payoffDate } from "@/lib/format";
import { simulateWithBonus } from "@/lib/plans";
import { parseNumber } from "@/lib/state";
import { useCalc } from "./CalcContext";
import { Stat } from "./Stat";

// "What if I get a bonus?": hidden behind a button until the user has one. Applies one extra payment to
// method B in the chosen month. Local only: it never changes the main results and isn't saved or shared.
export function BonusPayment() {
  const { t, single } = useCalc();
  const T = t.bonus;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("6");
  const refocus = useRef(false); // after Remove, put focus back on the "I have a bonus" button
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    wrap.current?.querySelector("button")?.focus();
  });

  const a = parseNumber(amount);
  const m = parseNumber(month);
  const amountBad = amount.trim() !== "" && !(a > 0);
  const monthBad = !(Number.isInteger(m) && m >= 1 && m <= 1200);
  const { v, B } = single;
  const res = useMemo(
    () => (a > 0 && !monthBad ? simulateWithBonus({ balance: v.bal, apr: v.apr, p: v.p, amount: a, month: m }) : null),
    [a, m, monthBad, v.bal, v.apr, v.p],
  );

  if (!open) {
    return (
      <div ref={wrap} className="no-print">
        <Button onClick={() => setOpen(true)}>{T.open}</Button>
      </div>
    );
  }

  const remove = () => {
    setOpen(false);
    setAmount("");
    refocus.current = true;
  };

  return (
    <div ref={wrap}>
      <Panel className="no-print">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelTitle as="h3">{T.heading}</PanelTitle>
          <Button size="sm" variant="quiet" onClick={remove}>{T.remove}</Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 max-w-[640px]">
          <NumberField label={T.amount} value={amount} onChange={setAmount} error={amountBad ? T.amountError : null} errorPrefix={t.errors.prefix} />
          <NumberField label={T.month} inputMode="numeric" value={month} onChange={setMonth} error={monthBad ? T.monthError : null} errorPrefix={t.errors.prefix} />
        </div>
        <div className="mt-3">
          {res === null ? (
            <p className="text-sm text-muted">{T.hint}</p>
          ) : res.afterPayoff ? (
            <p className="font-semibold">{T.tooLate(B.months!)}</p>
          ) : (
            <>
              <Stat label={T.paidIn} big>
                {res.months === null ? T.still : monthsToText(res.months)}
              </Stat>
              {res.months !== null && <p className="text-sm text-muted -mt-1 mb-2">{t.results.onDate(payoffDate(res.months, new Date()))}</p>}
              {res.months !== null && (
                <div className="grid sm:grid-cols-2 gap-x-4">
                  {B.months !== null ? (
                    <>
                      <Stat label={T.sooner}>{monthsToText(B.months - res.months)}</Stat>
                      <Stat label={T.saved}>{t.unit.baht(formatBaht(B.totalInterest! - res.totalInterest!))}</Stat>
                    </>
                  ) : (
                    <Stat label={t.extra.vsNow}>{T.nowEnds}</Stat>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
