"use client";
import { useCalc } from "@/components/calculator/CalcContext";
import { Skeleton } from "@/components/ui/Skeleton";

// Shows a skeleton until saved or shared numbers are loaded in the browser, then the stateful sections.
export function Ready({ fallback, children }: { fallback?: React.ReactNode; children: React.ReactNode }) {
  const { ready, t } = useCalc();
  if (!ready) return <div className="mt-8">{fallback ?? <Skeleton label={t.loading} />}</div>;
  return <>{children}</>;
}
