"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/copy";
import { scrollToId } from "@/hooks/useCalculator";

// Old /charts and /why addresses: forward to the calculator section, keeping any share hash.
export function RedirectTo({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to + window.location.hash, { scroll: false });
  }, [router, to]);
  return (
    <div className="mt-8">
      <Skeleton label={copy.loading} />
    </div>
  );
}

// Reads ?show=chart or ?show=math once the sections exist, jumps there, then drops the query.
// The hash is reserved for share state, so section jumps use the query.
export function ShowTarget() {
  useEffect(() => {
    const show = new URLSearchParams(window.location.search).get("show");
    if (show === null) return;
    if (show === "chart") scrollToId("chart-sec");
    if (show === "math") {
      const math = document.getElementById("math") as HTMLDetailsElement | null;
      if (math) {
        // A smooth scroll started before the math renders gets cut short by the layout change,
        // so jump once the opened content is on the page.
        math.addEventListener("toggle", () => setTimeout(() => math.scrollIntoView?.({ block: "start" }), 50), { once: true });
        math.open = true;
      }
    }
    try {
      history.replaceState(null, "", window.location.pathname + window.location.hash);
    } catch {
      // history API blocked: the query simply stays
    }
  }, []);
  return null;
}
