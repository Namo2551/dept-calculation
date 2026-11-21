"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { formatBaht, toCsv } from "@/lib/format";
import { useCalc } from "./CalcContext";

export function MonthlyTable() {
  const { t, single } = useCalc();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"A" | "B">("A");
  const rows = single[method].rows;

  const download = () => {
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }); // BOM so Excel reads UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debt-${method}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <details id="tableBox" className="inset-card p-5 sm:p-7 min-w-0 no-print" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="text-xl sm:text-2xl font-semibold tracking-tight min-h-11 flex items-center justify-between gap-4">
        {t.table.summary}
        <span aria-hidden="true" className={`border border-btn w-10 h-10 grid place-items-center transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </summary>
      {open && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-3 items-center">
            <ToggleGroup<"A" | "B">
              label={t.table.methodLabel}
              value={method}
              onChange={setMethod}
              options={[{ value: "A", label: t.table.methodA }, { value: "B", label: t.table.methodB }]}
            />
            <Button onClick={download}>{t.table.csv}</Button>
          </div>
          <div className="bg-bg border border-hair mt-5 max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-[0.93rem]">
              <thead>
                <tr>
                  {t.table.cols.map((c) => (
                    <th key={c} className="sticky top-0 bg-bg text-right font-semibold px-3 py-2 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.month} className="border-t border-hair">
                    <td className="text-right px-3 py-1.5">{w.month}</td>
                    <td className="text-right px-3 py-1.5 whitespace-nowrap">{formatBaht(w.start)}</td>
                    <td className="text-right px-3 py-1.5 whitespace-nowrap">{formatBaht(w.interest)}</td>
                    <td className="text-right px-3 py-1.5 whitespace-nowrap">{formatBaht(w.payment)}</td>
                    <td className="text-right px-3 py-1.5 whitespace-nowrap">{formatBaht(w.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </details>
  );
}
