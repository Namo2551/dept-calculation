"use client";
import { useState } from "react";
import { useCalc } from "@/components/calculator/CalcContext";
import { RangeField } from "@/components/ui/RangeField";
import { closedFormFixed } from "@/lib/debt";
import { explainFirstMonths, formatBaht } from "@/lib/format";
import { Box } from "./parts";

// [Recurrence relations] Step through method B month by month and compare with the closed form.
export function RecurrenceWalk() {
  const { t, single } = useCalc();
  const m = t.math.step1;
  const { B, v, pB } = single;
  const [k, setK] = useState(3);
  let full = 0; // months paid with the full p, where the closed form applies
  while (full < B.rows.length && full < 24 && B.rows[full].payment === v.p) full++;
  const kMax = Math.max(1, full);
  const kk = Math.min(k, kMax);
  const byWalk = B.rows[kk - 1].end;
  const byCF = closedFormFixed(v.bal, B.r, v.p, kk);
  const same = Math.abs(byWalk - byCF) < 0.005;
  const lines = explainFirstMonths(pB, kk).map((s) => s.replace(/^[^:]+: /, ""));

  return (
    <div data-testid="walk" className="bg-bg border border-hair p-4 sm:p-5 mt-4">
      <RangeField label={m.walkLabel(kk)} min={1} max={kMax} value={kk} onChange={setK} />
      <ol className="num list-decimal pl-7 my-3 max-h-56 overflow-auto text-sm grid gap-1">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
      <p className="text-sm">{m.walkNote}</p>
      <div className="grid gap-3 sm:grid-cols-3 mt-4">
        <Box label={m.byWalk(kk)}>{t.unit.baht(formatBaht(byWalk))}</Box>
        <Box label={m.byClosed(kk)}>{t.unit.baht(formatBaht(byCF))}</Box>
        <Box label={m.result}>
          <span className={same ? "text-good" : "text-bad"}>{same ? m.same : m.differ}</span>
        </Box>
      </div>
      {kMax < 24 && <p className="mt-3 text-sm text-muted">{m.walkLimit(kMax)}</p>}
    </div>
  );
}
