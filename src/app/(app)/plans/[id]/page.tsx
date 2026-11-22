import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountSection } from "@/components/app/AccountSection";
import { PageIntro } from "@/components/PageIntro";
import { DeletePlanButton } from "@/components/plans/DeletePlanButton";
import { PlanEditForm } from "@/components/plans/PlanEditForm";
import { MethodResult, PlanInputsList } from "@/components/plans/PlanFigures";
import { Button } from "@/components/ui/Button";
import { plansCopy } from "@/copy/plans";
import { requireUser } from "@/lib/auth";
import { formatMoney, monthYear, shortDate } from "@/lib/money";
import { summarizePlan } from "@/lib/plans-summary";
import { isPlanId } from "@/lib/plans-validation";
import { monthsToText } from "@/lib/format";

export const metadata: Metadata = { title: "Plan", robots: { index: false } };

const D = plansCopy.detail;

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/plans/${id}`);
  if (!isPlanId(id)) notFound();
  const { data: plan } = await supabase.from("debt_plans").select("*").eq("id", id).maybeSingle();
  if (!plan) notFound(); // not this user's plan (RLS) or it doesn't exist

  const s = summarizePlan(plan);
  const intro = [D.startedOn(shortDate(plan.start_date)), D.updatedOn(shortDate(plan.updated_at.slice(0, 10)))].join(". ") + ".";

  return (
    <>
      <p className="pt-8">
        <Link href="/plans" className="inline-flex items-center min-h-11 underline underline-offset-4">
          {D.back}
        </Link>
      </p>
      <PageIntro title={plan.name} intro={intro} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href={`/calculator?plan=${plan.id}`} variant="primary">
          {D.open}
        </Button>
        <DeletePlanButton id={plan.id} />
      </div>

      <div className="mt-10 grid gap-12">
        <AccountSection title={D.results} id="results">
          <div className="grid gap-5 md:grid-cols-2">
            <MethodResult title={D.methodA} sim={s.A} payoff={s.payoffA} currency={plan.currency} testId="plan-A" />
            <MethodResult title={D.methodB} sim={s.B} payoff={s.payoffB} currency={plan.currency} testId="plan-B" />
          </div>
          {s.bonus && (
            <div className="mt-5 inset-card p-5" data-testid="plan-bonus">
              <h3 className="font-display text-xl mb-3">{D.withBonus(formatMoney(s.bonus.amount, plan.currency), s.bonus.month)}</h3>
              {s.bonus.afterPayoff ? (
                <p>{D.bonusAfter}</p>
              ) : (
                <dl className="grid gap-2">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <dt className="text-muted">{D.duration}</dt>
                    <dd className="num font-semibold">{s.bonus.months === null ? plansCopy.months.never : monthsToText(s.bonus.months)}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <dt className="text-muted">{D.payoff}</dt>
                    <dd className="num font-semibold">{s.bonus.payoff ? monthYear(s.bonus.payoff) : plansCopy.months.never}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <dt className="text-muted">{D.totalInterest}</dt>
                    <dd className="num font-semibold">{s.bonus.totalInterest === null ? plansCopy.months.never : formatMoney(s.bonus.totalInterest, plan.currency)}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </AccountSection>

        <AccountSection title={D.inputs} id="inputs">
          <PlanInputsList plan={plan} />
          <h3 className="mt-6 mb-2 font-semibold">{D.notes}</h3>
          <p className="whitespace-pre-line break-words">{plan.notes || D.noNotes}</p>
        </AccountSection>

        <AccountSection title={D.edit} id="edit">
          <div className="max-w-[720px]">
            <PlanEditForm plan={plan} />
          </div>
        </AccountSection>
      </div>
    </>
  );
}
