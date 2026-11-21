"use client";
import { useState } from "react";
import { copy } from "@/copy";
import { MathExplainer } from "./MathExplainer";

// The whole explainer at the end of the calculator, closed until someone opens it.
export function FullMath() {
  const [open, setOpen] = useState(false);
  return (
    <details id="math" className="inset-card p-5 sm:p-7 min-w-0" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="text-xl sm:text-2xl font-semibold tracking-tight min-h-11 flex items-center justify-between gap-4 cursor-pointer">
        {copy.fullMath}
        <span aria-hidden="true" className={`border border-btn w-10 h-10 grid place-items-center transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </summary>
      {open && <MathExplainer />}
    </details>
  );
}
