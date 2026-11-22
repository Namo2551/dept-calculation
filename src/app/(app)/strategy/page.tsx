import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { StrategyView } from "@/components/strategy/StrategyView";
import { strategyCopy as C } from "@/copy/strategy";
import { requireProfile } from "@/lib/auth";
import { loadOverviews } from "@/lib/data/load";
import { todayISO } from "@/lib/ledger";
import { activeDebts } from "@/lib/strategy";

export const metadata: Metadata = { title: C.metaTitle, robots: { index: false } };

// Avalanche vs snowball on the user's active debts at today's ledger balances. Read only: the budget and the
// plan shown in the monthly table live in the URL (?budget=, ?plan=), so a result can be bookmarked.
export default async function StrategyPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { supabase } = await requireProfile("/strategy");
  const [query, items] = await Promise.all([searchParams, loadOverviews(supabase)]);
  const today = todayISO();
  return (
    <>
      <PageIntro title={C.title} intro={C.intro} />
      <StrategyView debts={activeDebts(items)} rawBudget={query.budget} rawPlan={query.plan} today={today} />
    </>
  );
}
