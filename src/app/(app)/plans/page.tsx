import type { Metadata } from "next";
import { AccountSection } from "@/components/app/AccountSection";
import { PageIntro } from "@/components/PageIntro";
import { ComparePicker } from "@/components/plans/ComparePicker";
import { PlansTable, type PlanListItem } from "@/components/plans/PlansTable";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/TextField";
import { plansCopy } from "@/copy/plans";
import { requireUser } from "@/lib/auth";
import { simulate } from "@/lib/debt";
import { formatMoney, shortDate } from "@/lib/money";
import { monthsLabel } from "@/lib/plans-summary";

export const metadata: Metadata = { title: "Plans", robots: { index: false } };

const C = plansCopy.list;

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { supabase } = await requireUser("/plans");
  const { deleted } = await searchParams;
  const { data } = await supabase.from("debt_plans").select("*").order("updated_at", { ascending: false });
  const plans = data ?? [];
  const items: PlanListItem[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    balance: formatMoney(p.balance, p.currency),
    payment: formatMoney(p.fixed_payment, p.currency),
    months: monthsLabel(simulate({ balance: p.balance, apr: p.apr, strategy: "fixed", p: p.fixed_payment })),
    updated: shortDate(p.updated_at.slice(0, 10)),
  }));

  return (
    <>
      <PageIntro title={C.title} intro={C.intro} />
      <div className="mt-10 grid gap-12">
        {deleted === "1" && <FormMessage tone="good">{C.deleted}</FormMessage>}
        {plans.length === 0 ? (
          <div className="inset-card p-6 grid gap-4 justify-items-start">
            <p>{C.empty}</p>
            <Button href="/calculator" variant="primary">
              {C.toCalculator}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              <div>
                <Button href="/calculator" size="sm">
                  {C.newPlan}
                </Button>
              </div>
              <PlansTable items={items} />
            </div>
            <AccountSection title={C.compareTitle} id="compare">
              <ComparePicker plans={plans.map((p) => ({ id: p.id, name: p.name }))} />
            </AccountSection>
          </>
        )}
      </div>
    </>
  );
}
