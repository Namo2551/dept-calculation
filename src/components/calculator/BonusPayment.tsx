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
  // the last amount and month that were both valid: a half-typed field keeps the answer on screen
  const [ok, setOk] = useState<{ a: number; m: number } | null>(null);
  // where focus goes after the box opens (the amount field) or closes (the "I have a bonus" button)
  const focusTo = useRef<"input" | "button" | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusTo.current === null) return;
    wrap.current?.querySelector<HTMLElement>(focusTo.current)?.focus();
    focusTo.current = null;
  });

  const goodMonth = (x: number) => Number.isInteger(x) && x >= 1 && x <= 1200;
  const update = (nextAmount: string, nextMonth: string) => {
    setAmount(nextAmount);
    setMonth(nextMonth);
    const na = parseNumber(nextAmount);
    const nm = parseNumber(nextMonth);
    if (nextAmount.trim() === "") setOk(null);
    else if (na > 0 && goodMonth(nm)) setOk({ a: na, m: nm });
  };

  const a = parseNumber(amount);
  const amountBad = amount.trim() !== "" && !(a > 0);
  const monthBad = !goodMonth(parseNumber(month));
  const { v, B } = single;
  const res = useMemo(
    () => (ok === null ? null : simulateWithBonus({ balance: v.bal, apr: v.apr, p: v.p, amount: ok.a, month: ok.m })),
    [ok, v.bal, v.apr, v.p],
  );

  if (!open) {
    return (
      <div ref={wrap} className="no-print">
        <Button
          onClick={() => {
            focusTo.current = "input";
            setOpen(true);
          }}
        >{T.open}</Button>
      </div>
    );
  }

  const remove = () => {
    setOpen(false);
    setAmount("");
    setOk(null);
    focusTo.current = "button";
  };

  return (
    <div ref={wrap}>
      <Panel className="no-print">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelTitle as="h3">{T.heading}</PanelTitle>
          <Button size="sm" variant="quiet" onClick={remove}>{T.remove}</Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 max-w-[640px]">
          <NumberField label={T.amount} value={amount} onChange={(x) => update(x, month)} error={amountBad ? T.amountError : null} errorPrefix={t.errors.prefix} />
          <NumberField label={T.month} inputMode="numeric" value={month} onChange={(x) => update(amount, x)} error={monthBad ? T.monthError : null} errorPrefix={t.errors.prefix} />
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
