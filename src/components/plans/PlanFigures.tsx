import { plansCopy } from "@/copy/plans";
import type { SimResult } from "@/lib/debt";
import { formatMoney, monthYear, shortDate } from "@/lib/money";
import { monthsLabel } from "@/lib/plans-summary";
import type { DebtPlanRow } from "@/lib/supabase/database.types";

const F = plansCopy.fields;
const D = plansCopy.detail;

// A plan's inputs as a definition list.
export function PlanInputsList({ plan }: { plan: DebtPlanRow }) {
  const m = (v: number) => formatMoney(v, plan.currency);
  const rows: [string, string][] = [
    [F.balance, m(plan.balance)],
    [F.apr, `${plan.apr}%`],
    [F.min_pct, `${plan.min_pct}%`],
    [F.min_floor, m(plan.min_floor)],
    [F.fixed_payment, m(plan.fixed_payment)],
    [F.target_months, String(plan.target_months)],
    [F.interest_limit, m(plan.interest_limit)],
    [F.bonus_amount, plan.bonus_amount === null ? F.none : m(plan.bonus_amount)],
    [F.bonus_month, plan.bonus_month === null ? F.none : String(plan.bonus_month)],
    [F.start_date, shortDate(plan.start_date)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="border-t border-hair pt-2 min-w-0">
          <dt className="text-sm text-muted">{k}</dt>
          <dd className="num font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// Results of one payment method: duration, payoff month, interest, total paid.
export function MethodResult({ title, sim, payoff, currency, testId }: { title: string; sim: SimResult; payoff: string | null; currency: string; testId?: string }) {
  const m = (v: number | null) => (v === null ? plansCopy.months.never : formatMoney(v, currency));
  return (
    <section className="inset-card p-5 min-w-0" data-testid={testId}>
      <h3 className="font-display text-xl mb-3">{title}</h3>
      {sim.months === null && <p className="mb-3 text-bad">{D.neverEnds}</p>}
      <dl className="grid gap-2">
        <Row k={D.duration} v={monthsLabel(sim)} />
        <Row k={D.payoff} v={payoff ? monthYear(payoff) : monthsLabel(sim)} />
        <Row k={D.totalInterest} v={m(sim.totalInterest)} />
        <Row k={D.totalPaid} v={sim.months === null ? plansCopy.months.never : m(sim.totalPaid)} />
        <Row k={D.firstPayment} v={m(sim.firstPayment)} />
      </dl>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4">
      <dt className="text-muted">{k}</dt>
      <dd className="num font-semibold">{v}</dd>
    </div>
  );
}
