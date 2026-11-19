"use client";
import { useEffect, useState } from "react";
import { useCalc } from "@/components/calculator/CalcContext";
import { Button } from "@/components/ui/Button";
import { RangeField } from "@/components/ui/RangeField";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { inductionStepDemo } from "@/lib/debt";
import { formatBaht } from "@/lib/format";
import { Box, Bsub } from "./parts";

// [Mathematical reasoning] One induction step with real numbers: recurrence from Bk (②) equals the closed form at k+1 (③).
export function InductionLadder() {
  const { t, single } = useCalc();
  const l = t.math.step2.ladder;
  const reduced = useReducedMotion();
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { bal, apr, p } = single.v;
  const d = inductionStepDemo({ balance: bal, apr, p, k });
  const ok = d.diff < 1e-6 * Math.max(1, Math.abs(d.nextByClosedForm));

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      const next = k + 1;
      setK(next);
      if (next >= 24) setPlaying(false);
    }, reduced ? 400 : 700);
    return () => clearTimeout(id);
  }, [playing, k, reduced]);

  const s0 = Math.max(0, k - 5);
  const steps: { i: number; kind: "done" | "next" }[] = [];
  for (let i = s0; i <= k + 1; i++) steps.push({ i, kind: i === k + 1 ? "next" : "done" });

  return (
    <div data-testid="ladder" className="bg-bg border border-hair p-4 sm:p-5 mt-4">
      <b>{l.title}</b>
      <div className="mt-2">
        <RangeField label={l.pick(k)} min={0} max={60} value={k} onChange={(n) => { setPlaying(false); setK(n); }} />
      </div>
      <Button
        className="mt-2"
        onClick={() => {
          if (playing) return setPlaying(false);
          setK(0);
          setPlaying(true);
        }}
      >
        {playing ? l.stop : l.play}
      </Button>
      <div className="grid gap-3 sm:grid-cols-3 mt-4">
        <Box label={l.box1(k)}>
          <Bsub i={k} /> = {formatBaht(d.Bk)}
        </Box>
        <Box label={l.box2(k)}>{formatBaht(d.nextByRecurrence)}</Box>
        <Box label={l.box3(k)} testId="ladder-3">
          <Bsub i={k + 1} /> = {formatBaht(d.nextByClosedForm)}
        </Box>
      </div>
      <p className={`mt-3 font-semibold ${ok ? "text-good" : "text-bad"}`}>{ok ? l.ok(k + 1) : l.notOk}</p>
      {d.nextByClosedForm < 0 && <p className="text-sm text-muted">{l.negative}</p>}
      <div className="flex items-end gap-1.5 mt-4" role="img" aria-label={l.stairs}>
        {s0 > 0 && (
          <div className="bg-bg border border-hair text-center text-xs px-1 text-accent flex flex-col justify-end flex-1 max-w-24" style={{ height: 30 }}>
            0-{s0 - 1} ✓
          </div>
        )}
        {steps.map(({ i, kind }) => (
          <div
            key={i}
            className={`text-center text-xs px-1 leading-tight flex flex-col justify-end flex-1 max-w-24 min-w-0 overflow-hidden ${
              kind === "next" ? "border-2 border-dashed border-accent text-accent" : "bg-bg border border-hair text-accent"
            }`}
            style={{ height: 36 + (i - s0) * 12 }}
          >
            <b>{l.step(i)}</b>
            {i === 0 ? l.base : kind === "next" ? l.up : l.passed}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{l.hint}</p>
    </div>
  );
}
