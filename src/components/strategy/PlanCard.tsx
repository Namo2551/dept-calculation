import { strategyCopy as C } from "@/copy/strategy";
import { formatMoney, monthYear } from "@/lib/money";
import type { PlanSummary } from "@/lib/strategy";
import { LineSample } from "./StrategyChart";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num font-semibold">{children}</dd>
    </div>
  );
}

// One plan: debt-free date, interest, total paid, savings vs minimums and the payoff order.
export function PlanCard({ plan, recommended }: { plan: PlanSummary; recommended: boolean }) {
  const s = plan.strategy;
  const saved = plan.interestSaved;
  return (
    <section data-testid={`plan-${s}`} aria-labelledby={`plan-${s}-h`} className={`p-5 bg-surface min-w-0 ${recommended ? "border-2 border-good" : "border border-hair"}`}>
      <h3 id={`plan-${s}-h`} className="flex items-center gap-2 font-semibold leading-snug">
        <LineSample s={s} />
        {C.plans.titles[s]}
      </h3>
      {recommended && (
        <p className="mt-2 text-sm font-semibold text-good">
          <span aria-hidden="true">✓ </span>
          {C.plans.recommended}
        </p>
      )}
      {s === "minonly" && <p className="mt-2 text-sm text-muted">{C.plans.baseline}</p>}
      <dl>
        <Stat label={C.plans.debtFree}>{plan.months === null || plan.debtFreeISO === null ? C.plans.never : C.plans.debtFreeValue(monthYear(plan.debtFreeISO), plan.months)}</Stat>
        <Stat label={C.plans.totalInterest}>{plan.totalInterest === null ? C.plans.never : formatMoney(plan.totalInterest)}</Stat>
        <Stat label={C.plans.totalPaid}>{plan.months === null ? C.plans.never : formatMoney(plan.totalPaid)}</Stat>
        {s !== "minonly" && (
          <Stat label={C.plans.saved}>
            {saved === null ? <span className="font-normal text-sm">{C.plans.savedNone}</span> : saved < 0 ? <span className="text-bad">{C.plans.costsMore(formatMoney(-saved))}</span> : <span className="text-good">{formatMoney(saved)}</span>}
          </Stat>
        )}
      </dl>
      <p className="mt-4 text-sm text-muted">{C.plans.order}</p>
      <ol className="list-decimal pl-5 text-[0.93rem]">
        {plan.order.map((x) => (
          <li key={x.id}>{C.plans.orderItem(x.name, x.month, x.dateISO && monthYear(x.dateISO))}</li>
        ))}
      </ol>
    </section>
  );
}
