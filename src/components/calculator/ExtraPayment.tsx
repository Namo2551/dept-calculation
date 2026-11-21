"use client";
import { useMemo } from "react";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { RangeField } from "@/components/ui/RangeField";
import { simulate } from "@/lib/debt";
import { durationText, formatBaht, formatBahtShort, monthsToText } from "@/lib/format";
import { useCalc } from "./CalcContext";
import { Stat } from "./Stat";

export function ExtraPayment() {
  const { t, single, extra, setExtra } = useCalc();
  const { v, B } = single;
  const P = useMemo(
    () => (extra === 0 ? null : simulate({ balance: v.bal, apr: v.apr, strategy: "fixed", p: v.p + extra })),
    [extra, v.bal, v.apr, v.p],
  );
  return (
    <Panel className="no-print">
      <PanelTitle as="h3">{t.extra.heading}</PanelTitle>
      <RangeField label={t.extra.label(formatBahtShort(extra))} min={0} max={2000} step={100} value={extra} onChange={setExtra} />
      {P === null ? (
        <p className="mt-3 text-sm text-muted">{t.extra.hint}</p>
      ) : (
        <div className="mt-3">
          <Stat label={t.extra.payIn(formatBahtShort(v.p + extra))} big>
            {durationText(P)}
          </Stat>
          {B.months !== null && P.months !== null ? (
            <div className="grid grid-cols-2 gap-x-4">
              <Stat label={t.extra.faster}>{monthsToText(B.months - P.months)}</Stat>
              <Stat label={t.extra.saved}>{t.unit.baht(formatBaht(B.totalInterest! - P.totalInterest!))}</Stat>
            </div>
          ) : (
            P.months !== null && <Stat label={t.extra.vsNow}>{t.extra.nowPaysOff}</Stat>
          )}
        </div>
      )}
    </Panel>
  );
}
