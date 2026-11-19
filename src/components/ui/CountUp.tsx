"use client";
import { useEffect, useRef, useState } from "react";
import { keepFigures } from "@/lib/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Counts from the previous value to the new one in 0.5 s (instant with reduced motion).
// A 650 ms timeout forces the final text in case animation frames pause in a background tab.
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const prev = useRef(reduced ? value : 0);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduced || from === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const u = Math.max(0, Math.min(1, (now - t0) / 500));
      setShown(from + (value - from) * (1 - Math.pow(1 - u, 3)));
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const guard = setTimeout(() => setShown(value), 650);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(guard);
    };
  }, [value, reduced]);

  return <>{keepFigures(format(shown))}</>;
}
