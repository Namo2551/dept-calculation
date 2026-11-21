"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCalc } from "@/components/calculator/CalcContext";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/copy";
import { scrollToId } from "@/hooks/useCalculator";

// Old /charts and /why addresses: forward to the calculator section. Waits until the numbers are loaded,
// so a share link's hash has already been read and removed; a plain section anchor is kept.
export function RedirectTo({ to }: { to: string }) {
  const router = useRouter();
  const { ready } = useCalc();
  useEffect(() => {
    if (ready) router.replace(to + window.location.hash, { scroll: false });
  }, [ready, router, to]);
  return (
    <div className="mt-8">
      <Skeleton label={copy.loading} />
    </div>
  );
}

// Reads ?show=chart or ?show=math whenever it appears (on arrival or from a link on this page),
// jumps there, then drops the query. The hash is reserved for share state, so section jumps use the query.
export function ShowTarget() {
  const show = useSearchParams().get("show");
  useEffect(() => {
    if (show === null) return;
    if (show === "chart") scrollToId("chart-sec");
    if (show === "math") {
      const math = document.getElementById("math") as HTMLDetailsElement | null;
      // A smooth scroll started before the math renders gets cut short by the layout change,
      // so jump once the opened content is on the page.
      const jump = () => setTimeout(() => math?.scrollIntoView?.({ block: "start" }), 50);
      if (math?.open) jump();
      else if (math) {
        math.addEventListener("toggle", jump, { once: true });
        math.open = true;
      }
    }
    try {
      history.replaceState(null, "", window.location.pathname + window.location.hash);
    } catch {
      // history API blocked: the query simply stays
    }
  }, [show]);
  return null;
}
