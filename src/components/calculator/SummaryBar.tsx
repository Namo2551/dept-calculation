"use client";
import { useEffect, useState } from "react";
import { scrollToId } from "@/hooks/useCalculator";
import { formatBahtShort } from "@/lib/format";
import { useCalc } from "./CalcContext";

// Narrow screens only: once the inputs scroll off screen, a slim bar keeps the numbers in view
// and offers a way back to them.
export function SummaryBar() {
  const { t, single } = useCalc();
  const [away, setAway] = useState(false);

  useEffect(() => {
    const form = document.getElementById("tool");
    if (!form || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setAway(!entries[0].isIntersecting));
    io.observe(form);
    return () => io.disconnect();
  }, []);

  if (!away) return null;
  const { v } = single;
  const edit = () => {
    scrollToId("tool");
    document.querySelector<HTMLInputElement>("#tool input")?.focus({ preventScroll: true });
  };
  return (
    <div role="region" aria-label={t.summary.label} className="no-print lg:hidden sticky top-0 z-10 -mx-6 px-6 py-2 bg-bg border-b border-hair flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="num text-sm min-w-0">{t.summary.line(formatBahtShort(v.bal), String(v.apr), String(v.m), v.floor ? formatBahtShort(v.floor) : null, formatBahtShort(v.p))}</span>
      <button type="button" onClick={edit} className="shrink-0 h-11 px-4 border border-btn font-mono text-sm cursor-pointer">
        {t.summary.edit}
      </button>
    </div>
  );
}
