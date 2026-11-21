"use client";
import { useCalc } from "@/components/calculator/CalcContext";
import { formatBaht } from "@/lib/format";
import { ClosedFormProof, InterestOnlyProof, MathSummary, PctProof, RealExamples, RecurrenceStep, RequiredPaymentStep } from "./pieces";

// The whole explainer, in reading order, built from the same pieces the "Why?" buttons show.
export function MathExplainer() {
  const { t, single } = useCalc();
  const { v, B } = single;
  return (
    <section id="why" className="min-w-0">
      <p className="mt-4 max-w-[75ch]">{t.math.intro(formatBaht(v.bal), String(v.apr), B.r.toFixed(6), formatBaht(v.p), String(v.m))}</p>
      <div className="grid gap-6 mt-6">
        <RecurrenceStep />
        <ClosedFormProof />
        <PctProof />
        <InterestOnlyProof />
        <RequiredPaymentStep />
        <RealExamples />
        <MathSummary />
      </div>
    </section>
  );
}
