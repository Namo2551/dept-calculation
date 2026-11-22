import { ChapterTag } from "@/components/report/ChapterTag";
import { AccountSection } from "@/components/app/AccountSection";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { strategyCopy as C } from "@/copy/strategy";
import { formatMoney } from "@/lib/money";
import { compareStrategies, defaultBudget, minimumsTotal, parseBudget, parsePlan, type Comparison, type StrategyDebt } from "@/lib/strategy";
import { MonthlyBreakdown } from "./MonthlyBreakdown";
import { PlanCard } from "./PlanCard";
import { StrategyChart } from "./StrategyChart";

const pct = (x: number) => String(Math.round(x * 1e4) / 1e4);

function DebtsTable({ debts }: { debts: StrategyDebt[] }) {
  return (
    <div className="overflow-x-auto border border-hair">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">{C.debtsTitle}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left p-2 border-b border-hair">{C.debtsCols.name}</th>
            <th scope="col" className="text-right p-2 border-b border-hair">{C.debtsCols.balance}</th>
            <th scope="col" className="text-right p-2 border-b border-hair">{C.debtsCols.apr}</th>
            <th scope="col" className="text-left p-2 border-b border-hair">{C.debtsCols.minimum}</th>
          </tr>
        </thead>
        <tbody>
          {debts.map((d) => (
            <tr key={d.id} className="border-b border-hair last:border-b-0">
              <th scope="row" className="text-left p-2 font-medium">{d.name}</th>
              <td className="num text-right p-2 whitespace-nowrap">{formatMoney(d.balance)}</td>
              <td className="num text-right p-2">{pct(d.apr)}%</td>
              <td className="p-2">{C.minimumRule(d.minPct ? pct(d.minPct) : null, formatMoney(d.minAmount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareSummary({ cmp }: { cmp: Comparison }) {
  const av = cmp.plans.avalanche;
  const sn = cmp.plans.snowball;
  if (cmp.single) return <p>{C.single}</p>;
  if (av.months === null && sn.months === null) return <p className="text-bad">{C.compare.neither}</p>;
  const lines: string[] = [];
  if (cmp.same) lines.push(C.sameOrder);
  else {
    if (cmp.cheaper) {
      const w = cmp.cheaper.strategy;
      lines.push(C.compare.cheaper(C.plans.short[w], C.plans.short[w === "avalanche" ? "snowball" : "avalanche"].toLowerCase(), formatMoney(cmp.cheaper.by)));
    } else lines.push(C.compare.equal);
    if (av.months !== null && sn.months !== null) {
      lines.push(av.months === sn.months ? C.compare.monthsSame : C.compare.monthsDiff(C.plans.short[av.months < sn.months ? "avalanche" : "snowball"], Math.abs(av.months - sn.months)));
    }
    lines.push(cmp.firstSooner ? C.compare.firstSooner(C.plans.short[cmp.firstSooner.strategy], cmp.firstSooner.months) : C.compare.firstSame);
  }
  return (
    <ul className="grid gap-2 list-disc pl-5 max-w-[75ch]">
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

// The whole /strategy page body. Pure rendering from the user's active debts and the URL's ?budget= / ?plan=.
export function StrategyView({ debts, rawBudget, rawPlan, today }: { debts: StrategyDebt[]; rawBudget?: string | string[]; rawPlan?: string | string[]; today: string }) {
  if (debts.length === 0) {
    return (
      <section className="mt-10 inset-card p-5 sm:p-7 max-w-[720px]">
        <h2 className="font-display font-medium text-[26px] leading-tight mb-3">{C.empty.title}</h2>
        <p className="mb-5 text-muted">{C.empty.body}</p>
        <Button href="/debts" variant="primary">
          {C.empty.link}
        </Button>
      </section>
    );
  }

  const suggested = defaultBudget(debts);
  const minSum = minimumsTotal(debts);
  const b = parseBudget(rawBudget, suggested);
  const cmp = compareStrategies(debts, b.budget, today);
  const plan = parsePlan(rawPlan, cmp.recommended ?? "avalanche");
  const lines = { avalanche: cmp.plans.avalanche, snowball: cmp.plans.snowball, minonly: cmp.plans.minonly };

  return (
    <div className="mt-10 grid gap-12 min-w-0">
      <AccountSection title={C.debtsTitle}>
        <DebtsTable debts={debts} />
      </AccountSection>

      <section className="grid gap-4 max-w-[720px]">
        <form method="get" action="/strategy" className="flex flex-wrap items-end gap-4">
          <TextField
            className="w-full max-w-[360px]"
            label={C.budget.label}
            name="budget"
            inputMode="decimal"
            defaultValue={b.input}
            maxLength={20}
            hint={C.budget.hint(formatMoney(suggested), formatMoney(minSum))}
            error={b.error ? C.budget.errors[b.error] : null}
            errorPrefix={C.budget.errorPrefix}
          />
          {rawPlan !== undefined && <input type="hidden" name="plan" value={plan} />}
          <Button type="submit" variant="primary">
            {C.budget.submit}
          </Button>
        </form>
        {b.error && <p className="text-sm">{C.budget.usingFallback(formatMoney(suggested))}</p>}
        {cmp.budgetTooLow && (
          <p role="status" className="border-2 border-bad text-bad px-4 py-3 text-[15px]">
            <span aria-hidden="true">⚠ </span>
            {C.budget.tooLow(formatMoney(cmp.minSum))}
          </p>
        )}
        <p className="text-sm text-muted">{C.budget.bookmark}</p>
      </section>

      <section aria-labelledby="compare-h" className="min-w-0">
        <h2 id="compare-h" className="font-display font-medium text-[28px] sm:text-[32px] leading-tight tracking-[-0.015em] mb-5">
          {C.compare.title}
        </h2>
        <CompareSummary cmp={cmp} />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {(["avalanche", "snowball", "minonly"] as const).map((s) => (
            <PlanCard key={s} plan={cmp.plans[s]} recommended={cmp.recommended === s} />
          ))}
        </div>
      </section>

      <section aria-labelledby="chart-h" className="min-w-0">
        <h2 id="chart-h" className="font-display font-medium text-[26px] leading-tight mb-4">
          {C.chart.title}
        </h2>
        <StrategyChart lines={lines} />
      </section>

      <MonthlyBreakdown debts={debts} budget={b.budget} plan={plan} today={today} open={rawPlan !== undefined} />

      <section aria-labelledby="methods-h" className="border-t border-hair pt-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
          <h2 id="methods-h" className="font-display font-medium text-[26px] leading-tight tracking-[-0.01em]">
            {C.methods.title}
          </h2>
          <ChapterTag ch="3" />
          <ChapterTag ch="8" />
        </div>
        <div className="grid gap-3 max-w-[75ch]">
          <p>{C.methods.avalanche}</p>
          <p>{C.methods.snowball}</p>
          <p>{C.methods.greedy}</p>
          <p>{C.methods.recurrence}</p>
          <p className="text-sm text-muted">{C.methods.model}</p>
        </div>
      </section>
    </div>
  );
}
