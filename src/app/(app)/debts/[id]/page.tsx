import type { Metadata } from "next";
import Link from "next/link";
import { AccountSection } from "@/components/app/AccountSection";
import { DebtForm } from "@/components/debts/DebtForm";
import { DebtManage, StatusButton } from "@/components/debts/DebtManage";
import { DebtSummary } from "@/components/debts/DebtSummary";
import { MonthlyTable } from "@/components/debts/MonthlyTable";
import { PaymentForm } from "@/components/debts/PaymentForm";
import { PaymentHistory } from "@/components/debts/PaymentHistory";
import { PlanBadge } from "@/components/debts/PlanBadge";
import { PlanVsActual } from "@/components/debts/PlanVsActual";
import { StartTrackingForm } from "@/components/debts/StartTrackingForm";
import { PageIntro } from "@/components/PageIntro";
import { debtsCopy } from "@/copy/debts";
import { planBadge, planVsActualSeries } from "@/lib/debts-view";
import { formatMoney, shortDate } from "@/lib/money";
import { loadDebtPage } from "./load-debt";

export const metadata: Metadata = { title: "Debt", robots: { index: false } };

const D = debtsCopy.detail;
const C = debtsCopy.plan;
const P = debtsCopy.payments;
const LATEST = 10;

export default async function DebtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, o, today, history } = await loadDebtPage(id, `/debts/${id}`);
  const { debt, ledger, schedule, comparison } = o;
  const cur = debt.currency;
  const plans = await supabase.from("debt_plans").select("id, name, fixed_payment").order("name");
  const series = schedule ? planVsActualSeries(ledger, debt.start_balance, schedule) : null;
  const shown = history.slice(-LATEST); // the latest payments, still in date order

  return (
    <>
      <p className="pt-8">
        <Link href="/debts" className="inline-flex min-h-11 items-center font-mono text-sm underline underline-offset-4">
          ← {D.back}
        </Link>
      </p>
      <PageIntro title={debt.name} intro={`${debtsCopy.kinds[debt.kind] ?? debt.kind} · ${debtsCopy.statuses[debt.status] ?? debt.status}. ${D.startedOn(shortDate(debt.start_date), formatMoney(debt.start_balance, cur))}`} />

      <div className="mt-10 grid gap-12">
        <AccountSection title={D.summaryTitle} id="summary">
          <DebtSummary o={o} />
          {debt.status === "paid_off" && <p className="mt-5 text-good">{D.paidOffNote}</p>}
          {ledger.paidOff && debt.status === "active" && (
            <div className="mt-5 grid gap-3 max-w-[460px]">
              <p>{D.offerPaidOff}</p>
              <StatusButton id={debt.id} status="paid_off" label={debtsCopy.actions.markPaidOff} variant="primary" />
            </div>
          )}
        </AccountSection>

        <AccountSection title={C.title} id="plan">
          <p className="mb-5 text-muted max-w-[60ch]">{C.intro}</p>
          {schedule && comparison && series ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <PlanBadge badge={planBadge(comparison)} />
                <p className="font-medium" data-testid="plan-status">
                  {comparison.status === "ahead"
                    ? C.statusAhead(formatMoney(-comparison.difference, cur))
                    : comparison.status === "behind"
                      ? C.statusBehind(formatMoney(comparison.difference, cur))
                      : C.statusOnTrack}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-4 max-w-[520px]">
                <div>
                  <dt className="text-sm text-muted">{C.plannedBalance}</dt>
                  <dd className="num font-medium">{formatMoney(comparison.plannedBalance, cur)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">{C.actualBalance}</dt>
                  <dd className="num font-medium">{formatMoney(comparison.actualBalance, cur)}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted">
                {C.comparedAfter(comparison.monthsCompared)} {C.baselineFrom(formatMoney(schedule.monthly_payment, cur), shortDate(schedule.start_date))}
              </p>
              {!series.planPaysOff && <p className="text-bad">{C.neverPaysOff}</p>}
              <div className="inset-card p-3 sm:p-5">
                <PlanVsActual planned={series.planned} actual={series.actual} len={series.len} todayIndex={series.todayIndex} currency={cur} />
              </div>
              <details>
                <summary className="inline-flex items-center min-h-11 cursor-pointer font-mono text-sm underline underline-offset-4">{C.resetTitle}</summary>
                <div className="mt-4 grid gap-4 max-w-[560px]">
                  <p className="text-sm text-muted">{C.resetIntro}</p>
                  <StartTrackingForm debtId={debt.id} plans={plans.data ?? []} startBalance={debt.start_balance} startDate={debt.start_date} currency={cur} isReset />
                </div>
              </details>
            </div>
          ) : (
            <div className="grid gap-4 max-w-[560px]">
              <p>{C.startIntro}</p>
              <StartTrackingForm debtId={debt.id} plans={plans.data ?? []} startBalance={debt.start_balance} startDate={debt.start_date} currency={cur} isReset={false} />
            </div>
          )}
        </AccountSection>

        <AccountSection title={P.title} id="payments">
          <div className="grid gap-10">
            <div className="max-w-[640px]">
              <h3 className="font-display text-xl mb-4">{P.addTitle}</h3>
              <PaymentForm debtId={debt.id} startDate={debt.start_date} today={today} />
            </div>
            <div className="grid gap-4 min-w-0">
              <h3 className="font-display text-xl">{P.historyTitle}</h3>
              {history.length > LATEST && <p className="text-sm text-muted">{P.latest(LATEST)}</p>}
              <PaymentHistory rows={shown} debtId={debt.id} startDate={debt.start_date} today={today} currency={cur} />
              {history.length > LATEST && (
                <p>
                  <Link href={`/debts/${debt.id}/payments`} className="inline-flex min-h-11 items-center font-mono text-sm underline underline-offset-4">
                    {P.seeAll(history.length)}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </AccountSection>

        <AccountSection title={debtsCopy.monthly.title} id="monthly">
          <MonthlyTable rows={ledger.rows} currency={cur} />
        </AccountSection>

        <AccountSection title={debtsCopy.form.editTitle} id="edit">
          <details>
            <summary className="inline-flex items-center min-h-11 cursor-pointer font-mono text-sm underline underline-offset-4">{debtsCopy.form.editTitle}</summary>
            <div className="mt-5 max-w-[760px]">
              <DebtForm
                mode="edit"
                initial={{
                  id: debt.id,
                  name: debt.name,
                  kind: debt.kind,
                  start_balance: String(debt.start_balance),
                  start_date: debt.start_date,
                  apr: String(debt.apr),
                  min_pct: debt.min_pct === null ? "" : String(debt.min_pct),
                  min_amount: String(debt.min_amount),
                  due_day: debt.due_day === null ? "" : String(debt.due_day),
                  currency: debt.currency,
                }}
              />
            </div>
          </details>
        </AccountSection>

        <AccountSection title={debtsCopy.actions.manageTitle} id="manage">
          <DebtManage id={debt.id} status={debt.status} paymentCount={o.payments.length} />
        </AccountSection>
      </div>
    </>
  );
}
