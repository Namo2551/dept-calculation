"use client";
import { createContext, useContext } from "react";
import type { Calc } from "@/hooks/useCalculator";

export const CalcContext = createContext<Calc | null>(null);

// Every section reads the shared calculator state and dictionary from here.
export function useCalc(): Calc {
  const c = useContext(CalcContext);
  if (!c) throw new Error("useCalc must be used inside <Calculator>");
  return c;
}
