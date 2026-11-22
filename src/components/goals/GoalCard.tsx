import { PaymentsOverview } from "@/components/dashboard/DashboardView";
import { MonthLineChart } from "@/components/dashboard/MonthLineChart";
import { ProgressBar, StatusBadge, percentText, type Tone } from "@/components/dashboard/ProgressBar";
import { DeleteGoalButton, GoalForm, type DebtOption } from "@/components/goals/GoalForm";
import { goalsCopy as C } from "@/copy/goals";
import { monthlyPayments, totalDebtSeries, ymLabel } from "@/lib/dashboard";
import type { GoalEvaluation, GoalKind, GoalStatus } from "@/lib/goals";
import { formatMoney, formatMoneyShort, monthYear, shortDate } from "@/lib/money";
import type { FinancialGoalRow } from "@/lib/supabase/database.types";

const tone: Record<GoalStatus, Tone> = { achieved: "good", on_track: "good", behind: "bad", no_debts: "neutral" };

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-medium num break-words">{value}</dd>
    </div>
  );
}

function History({ e, asOf, currency, targetLabel }: { e: GoalEvaluation; asOf: string; currency: string; targetLabel: string }) {
  const series = totalDebtSeries(e.scope, asOf);
  const months = series.months.slice(0, series.todayIndex + 1).map(ymLabel);
  const payments = monthlyPayments(e.scope, asOf);
  const any = payments.some((p) => p.paid > 0) || months.length > 1;
  return (
    <section className="grid gap-5">
      <h4 className="font-display text-lg font-medium">{C.history.title}</h4>
      {!any ? (
        <p className="text-muted">{C.history.noHistory}</p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">{C.history.bars}</p>
            <PaymentsOverview rows={payments} currency={currency} showPlanned={false} aria={C.history.barsAria(ymLabel(payments[0].ym), ymLabel(payments.at(-1)!.ym))} />
          </div>
          {months.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-medium">{C.history.line}</p>
              <MonthLineChart
                months={months}
                solid={{ data: series.actual, label: C.history.balance }}
                target={{ value: e.target, label: `${C.history.target}: ${formatMoneyShort(e.target, currency)}` }}
                aria={C.history.lineAria(months[0], months.at(-1)!, targetLabel)}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Required({ e, currency }: { e: GoalEvaluation; currency: string }) {
  const r = e.required;
  if (!r) return e.status !== "achieved" && !e.overdue ? <p className="text-sm text-muted">{C.card.tooSoon}</p> : null;
  const gap = r.total - e.currentBasis;
  return (
    <div className="border border-hair bg-bg p-4 grid gap-3">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label={C.card.required} value={formatMoney(r.total, currency)} />
        <Fact label={C.card.currentBasis} value={formatMoney(e.currentBasis, currency)} />
      </dl>
      <p className={`text-sm ${gap > 0.005 ? "text-bad" : "text-good"}`}>{gap > 0.005 ? C.card.requiredGap(formatMoney(gap, currency)) : C.card.requiredEnough}</p>
      {r.perDebt.length > 1 && (
        <ul className="text-sm text-muted grid gap-1">
          {r.perDebt.map((d) => (
            <li key={d.id} className="num">
              {d.name}: {formatMoney(d.amount, currency)}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">{C.card.requiredNote(r.months)}</p>
    </div>
  );
}

export function GoalCard({
  goal,
  e,
  asOf,
  currency,
  debts,
}: {
  goal: FinancialGoalRow;
  e: GoalEvaluation;
  asOf: string;
  currency: string;
  debts: DebtOption[];
}) {
  const kind = goal.kind as GoalKind;
  const targetText = formatMoney(e.target, currency);
  return (
    <article className="inset-card p-5 sm:p-7 min-w-0 grid gap-5" aria-labelledby={`goal-${goal.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`goal-${goal.id}`} className="font-display text-xl sm:text-2xl font-medium break-words">
            {goal.title}
          </h3>
          <p className="mt-1 text-sm text-muted">{C.kinds[kind] ?? goal.kind}</p>
        </div>
        <StatusBadge tone={tone[e.status]}>{C.status[e.status]}</StatusBadge>
      </header>

      {e.status === "no_debts" ? (
        <p className="text-muted">{C.list.noDebts}</p>
      ) : (
        <>
          <ProgressBar value={e.progress} label={C.card.progressLabel(goal.title)} text={C.card.progressText(percentText(e.progress))} />
          {e.status === "achieved" && goal.achieved_at && <p className="text-good">{C.card.achievedOn(shortDate(goal.achieved_at.slice(0, 10)))}</p>}
          {e.overdue && <p className="text-bad">{C.card.overdue}</p>}
          <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Fact label={C.card.start} value={formatMoney(e.start, currency)} />
            <Fact label={C.card.current} value={formatMoney(e.current, currency)} />
            <Fact label={C.card.target} value={targetText} />
            {goal.target_date && <Fact label={C.card.targetDate} value={shortDate(goal.target_date)} />}
            {e.status !== "achieved" && <Fact label={C.card.projected} value={e.projectedISO ? monthYear(e.projectedISO) : C.card.projectedNever} />}
          </dl>
          {(kind === "debt_free_by" || kind === "debt_paid_by") && e.status !== "achieved" && <Required e={e} currency={currency} />}
          <History e={e} asOf={asOf} currency={currency} targetLabel={targetText} />
        </>
      )}

      <div className="flex flex-wrap items-start gap-3 border-t border-hair pt-4">
        <details className="grow min-w-0">
          <summary className="cursor-pointer min-h-11 inline-flex items-center underline underline-offset-4">{C.form.edit}</summary>
          <div className="mt-4">
            <GoalForm
              debts={debts}
              goalId={goal.id}
              initial={{
                title: goal.title,
                kind: goal.kind,
                debtId: goal.debt_id ?? "",
                targetDate: goal.target_date ?? "",
                targetPct: goal.target_pct === null ? "" : String(goal.target_pct),
                targetAmount: goal.target_amount === null ? "" : String(goal.target_amount),
              }}
            />
          </div>
        </details>
        <DeleteGoalButton goalId={goal.id} title={goal.title} />
      </div>
    </article>
  );
}
