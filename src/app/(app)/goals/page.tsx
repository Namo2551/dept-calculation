import type { Metadata } from "next";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm, type Preset } from "@/components/goals/GoalForm";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/Button";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { goalsCopy as C } from "@/copy/goals";
import { requireConsent } from "@/lib/auth";
import { loadOverviews } from "@/lib/data/load";
import { achievedAtChange, evaluateGoal } from "@/lib/goals";
import { addMonths, parseDate, toISODate, todayISO } from "@/lib/ledger";

export const metadata: Metadata = { title: "Goals", robots: { index: false } };

// Progress depends on the latest payments, so render on every request.
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { supabase, profile, consentMissing } = await requireConsent();
  const asOf = todayISO();
  const [items, goalsRes] = await Promise.all([loadOverviews(supabase, asOf), supabase.from("financial_goals").select("*").order("created_at")]);
  if (goalsRes.error) throw goalsRes.error;
  const goals = goalsRes.data ?? [];
  const debts = items.filter((i) => i.debt.status !== "archived").map((i) => ({ id: i.debt.id, name: i.debt.name }));
  const evaluated = goals.map((g) => ({ goal: g, e: evaluateGoal(g, items, asOf) }));

  // Keep achieved_at in step with the live numbers (set when reached, cleared if a change un-reaches it).
  if (!consentMissing) {
    const now = new Date().toISOString();
    await Promise.all(
      evaluated.map(async (x) => {
        const next = achievedAtChange(x.goal.achieved_at, x.e.status === "achieved", now);
        if (next === undefined) return;
        const { error } = await supabase.from("financial_goals").update({ achieved_at: next }).eq("id", x.goal.id);
        if (!error) x.goal = { ...x.goal, achieved_at: next };
      }),
    );
  }

  const presets: Preset[] = [
    { label: C.form.presetDebtFree, values: { title: C.form.presetDebtFreeTitle, kind: "debt_free_by", debtId: "", targetDate: "2027-12-31", targetPct: "", targetAmount: "" } },
    ...(debts[0]
      ? [
          {
            label: C.form.presetPayOne(debts[0].name),
            values: { title: C.form.presetPayOne(debts[0].name).slice(0, 120), kind: "debt_paid_by", debtId: debts[0].id, targetDate: toISODate(addMonths(parseDate(asOf), 6)), targetPct: "", targetAmount: "" },
          },
        ]
      : []),
    { label: C.form.presetHalf, values: { title: C.form.presetHalf, kind: "reduce_total_pct", debtId: "", targetDate: "", targetPct: "50", targetAmount: "" } },
  ];

  return (
    <>
      <PageIntro title={C.title} intro={C.intro} />
      <div className="mt-10 grid gap-10 min-w-0">
        <Panel>
          <PanelTitle>{C.form.newTitle}</PanelTitle>
          {debts.length === 0 && (
            <p className="mb-5 text-muted">
              {C.list.noDebts}{" "}
              <Button href="/debts" variant="quiet" size="sm">
                {C.list.addDebt}
              </Button>
            </p>
          )}
          <GoalForm debts={debts} presets={presets} />
        </Panel>

        <section aria-labelledby="goals-list" className="grid gap-6 min-w-0">
          <h2 id="goals-list" className="text-2xl sm:text-[28px] font-display font-medium tracking-[-0.01em]">
            {C.list.title}
          </h2>
          {evaluated.length === 0 ? (
            <p className="text-muted">{C.list.empty}</p>
          ) : (
            evaluated.map(({ goal, e }) => <GoalCard key={goal.id} goal={goal} e={e} asOf={asOf} currency={profile.currency} debts={debts} />)
          )}
        </section>
      </div>
    </>
  );
}
