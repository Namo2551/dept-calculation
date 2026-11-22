import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { PageIntro } from "@/components/PageIntro";
import { dashboardCopy as C } from "@/copy/dashboard";
import { requireProfile } from "@/lib/auth";
import { buildDashboard } from "@/lib/dashboard";
import { loadOverviews } from "@/lib/data/load";
import { todayISO } from "@/lib/ledger";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Rendered on every request from the user's current rows, so new payments, debts and plans show at once.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile("/dashboard");
  const asOf = todayISO();
  const data = buildDashboard(await loadOverviews(supabase, asOf), asOf);
  return (
    <>
      <PageIntro title={C.title} intro={C.intro} />
      <div className="mt-10">
        <DashboardView data={data} currency={profile.currency} />
      </div>
    </>
  );
}
