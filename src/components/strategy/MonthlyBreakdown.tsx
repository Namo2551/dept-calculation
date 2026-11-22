import { strategyCopy as C } from "@/copy/strategy";
import type { MultiStrategy } from "@/lib/debt";
import { formatMoney, monthYear } from "@/lib/money";
import { monthDate, monthlyRows, PLANS, toCard, type StrategyDebt } from "@/lib/strategy";

const MAX_ROWS = 600; // 50 years; a minimum-only plan can run to 100

export function planHref(budget: number, plan: MultiStrategy): string {
  return `/strategy?budget=${encodeURIComponent(String(budget))}&plan=${plan}#monthly`;
}

// Collapsible month-by-month table for one plan: the payment to each debt and what is left after it.
export function MonthlyBreakdown({ debts, budget, plan, today, open }: { debts: StrategyDebt[]; budget: number; plan: MultiStrategy; today: string; open: boolean }) {
  const all = monthlyRows(debts.map(toCard), budget, plan);
  const rows = all.slice(0, MAX_ROWS);
  const name = C.plans.short[plan];
  return (
    <details id="monthly" open={open} className="border-t border-hair pt-6 scroll-mt-24">
      <summary className="cursor-pointer min-h-11 flex items-center font-display font-medium text-[24px] leading-tight">{C.monthly.summary(name)}</summary>
      <nav aria-label={C.monthly.choose} className="mt-4 flex flex-wrap gap-2">
        {PLANS.map((p) => (
          <a
            key={p}
            href={planHref(budget, p)}
            aria-current={p === plan ? "true" : undefined}
            className={`inline-flex items-center min-h-11 px-4 border border-btn text-sm ${p === plan ? "bg-btn text-on-btn font-medium" : "hover:bg-surface"}`}
          >
            {C.plans.short[p]}
          </a>
        ))}
      </nav>
      <div className="mt-4 overflow-x-auto max-h-[70vh] overflow-y-auto border border-hair">
        <table className="num w-full text-sm border-collapse">
          <caption className="text-left p-3 text-muted">{C.monthly.caption(name)}</caption>
          <thead className="sticky top-0 bg-bg">
            <tr>
              <th scope="col" className="text-left p-2 border-b border-hair">{C.monthly.month}</th>
              <th scope="col" className="text-left p-2 border-b border-hair">{C.monthly.date}</th>
              {debts.map((d) => (
                <th key={"p" + d.id} scope="col" className="text-right p-2 border-b border-hair">{C.monthly.pay(d.name)}</th>
              ))}
              {debts.map((d) => (
                <th key={"b" + d.id} scope="col" className="text-right p-2 border-b border-hair">{C.monthly.left(d.name)}</th>
              ))}
              <th scope="col" className="text-right p-2 border-b border-hair">{C.monthly.total}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-hair">
                <th scope="row" className="text-left p-2 font-medium">{r.month}</th>
                <td className="p-2 whitespace-nowrap">{monthYear(monthDate(today, r.month))}</td>
                {r.payments.map((p, i) => (
                  <td key={"p" + i} className="text-right p-2 whitespace-nowrap">{formatMoney(p)}</td>
                ))}
                {r.balances.map((b, i) => (
                  <td key={"b" + i} className="text-right p-2 whitespace-nowrap">{formatMoney(b)}</td>
                ))}
                <td className="text-right p-2 whitespace-nowrap">{formatMoney(r.payments.reduce((a, x) => a + x, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {all.length > MAX_ROWS && <p className="mt-2 text-sm text-muted">{C.monthly.capped(MAX_ROWS)}</p>}
    </details>
  );
}
