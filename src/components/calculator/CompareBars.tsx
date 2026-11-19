"use client";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import type { SimResult } from "@/lib/debt";
import { compareSentence, durationText } from "@/lib/format";
import { useCalc } from "./CalcContext";

export function CompareBars() {
  const { t, lang, single } = useCalc();
  const { A, B, v } = single;
  const max = Math.max(A.months || 0, B.months || 0) || 1;
  const width = (s: SimResult) => (s.months === null ? 100 : Math.max(1.5, (100 * s.months) / max));
  const bar = (key: "A" | "B", name: string, s: SimResult) => (
    <div>
      <div className="flex justify-between gap-3 text-[0.93rem] mb-2">
        <b>{name}</b>
        <span className="num">{durationText(s, lang)}</span>
      </div>
      <div
        className={`h-6 rounded-full transition-[width] duration-300 ${key === "A" ? "bg-series-a" : "hatch-b"}`}
        style={{ width: width(s) + "%" }}
      />
    </div>
  );
  return (
    <Panel>
      <PanelTitle>{t.compare.heading}</PanelTitle>
      <div className="pressed rounded-well p-5 grid gap-5">
        {bar("A", t.compare.barA, A)}
        {bar("B", t.compare.barB, B)}
      </div>
      <p className="mt-5 font-semibold max-w-[70ch]">{compareSentence(A, B, { m: v.m / 100, p: v.p }, lang)}</p>
    </Panel>
  );
}
