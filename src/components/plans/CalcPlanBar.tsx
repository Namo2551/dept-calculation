"use client";
import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import { plansCopy } from "@/copy/plans";
import { useSignedIn } from "@/hooks/useSignedIn";

// The save and open tools talk to Server Actions, so they load only for signed-in visitors.
const CalcPlanTools = lazy(() => import("./CalcPlanTools"));

// "Save plan" in the calculator's toolbar. Signed out: a sign-in link that comes back here.
export function CalcPlanBar() {
  const signedIn = useSignedIn();
  // Read from the address once on mount (opening a plan link mounts the calculator page afresh).
  const [planId, setPlanId] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the query is only known in the browser
    setPlanId(new URLSearchParams(window.location.search).get("plan"));
  }, []);
  if (signedIn === null) return null;
  if (!signedIn) {
    const next = planId ? `/calculator?plan=${planId}` : "/calculator";
    return (
      <Link
        href={`/login?next=${planId ? encodeURIComponent(next) : next}`}
        className="inline-flex items-center min-h-11 text-sm underline underline-offset-4"
      >
        {plansCopy.save.signIn}
      </Link>
    );
  }
  return (
    <Suspense fallback={null}>
      <CalcPlanTools planId={planId} />
    </Suspense>
  );
}
