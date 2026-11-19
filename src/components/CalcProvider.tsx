"use client";
import { CalcContext } from "@/components/calculator/CalcContext";
import { useCalculator } from "@/hooks/useCalculator";

// One calculator state for every route: the root layout mounts this once, so numbers survive navigation.
export function CalcProvider({ children }: { children: React.ReactNode }) {
  const calc = useCalculator();
  return <CalcContext.Provider value={calc}>{children}</CalcContext.Provider>;
}
