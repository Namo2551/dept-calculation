import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { SharedBalanceChart } from "@/components/sharing/SharedBalanceChart";
import { Button } from "@/components/ui/Button";
import { sharingCopy as S } from "@/copy/sharing";
import { simulate } from "@/lib/debt";
import { addMonths, parseDate, plannedRows, todayISO, toISODate } from "@/lib/ledger";
import { formatMoney, monthYear, shortDate } from "@/lib/money";
import { overviewOf, totalsOf } from "@/lib/overview";
import { parseSharedView, sharedDebtRows } from "@/lib/sharing";
import { createClient } from "@/lib/supabase/server";
import { monthsToText } from "@/lib/format";

// The recipient's page: read only, never indexed, no referrer sent onward (the token is in this URL).
export const metadata: Metadata = { title: "Shared progress", robots: { index: false, follow: false }, referrer: "no-referrer" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="num font-display text-[24px] leading-tight">{value}</p>
    </div>
  );
}

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_view", { p_token: token });
  const view = parseSharedView(data);

  if (!view) {
    return (
      <>
        <PageIntro title={S.viewTitle} intro={S.invalid} />
        <div className="mt-8">
          <Button href="/" variant="primary">
            Paydown
          </Button>
        </div>
      </>
    );
  }

  const pctMode = !view.show_amounts;
  const money = (v: number, currency = "THB") => (pctMode ? `${v.toFixed(1)}%` : formatMoney(v, currency));
  const today = todayISO();
  const debts = sharedDebtRows(view).map((r) => overviewOf(r.debt, r.payments, r.schedule, today));
  const totals = totalsOf(debts);
  const plan = view.plan;
  const planSim = plan ? simulate({ balance: plan.balance, apr: plan.apr, strategy: "fixed", p: plan.fixed_payment }) : null;

  return (
    <>
      <PageIntro title={view.label ? `${S.viewTitle}: ${view.label}` : S.viewTitle} intro={S.viewIntro} />
      <p className="mt-4 text-sm text-muted">
        {S.readOnly} {pctMode && S.percentNote}
      </p>

      {plan && planSim && (
        <section className="mt-10 border-t border-hair pt-8" aria-labelledby="sv-plan">
          <h2 id="sv-plan" className="font-display font-medium text-[28px] mb-5">
            {S.planTitle}: {plan.name}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={S.balanceNow} value={money(plan.balance, plan.currency)} />
            <Stat label={S.monthly} value={money(plan.fixed_payment, plan.currency)} />
            <Stat label={S.paidOffIn} value={planSim.months === null ? S.never : monthsToText(planSim.months)} />
            <Stat label={S.totalInterest} value={planSim.totalInterest === null ? "-" : money(planSim.totalInterest, plan.currency)} />
          </div>
          {planSim.months !== null && <p className="mt-3 text-sm text-muted">{`${S.debtFree}: ${monthYear(toISODate(addMonths(parseDate(plan.start_date), planSim.months)))}`}</p>}
          {plan.notes && <p className="mt-4 max-w-[70ch] whitespace-pre-line">{plan.notes}</p>}
          <div className="mt-6 inset-card p-3 sm:p-4">
            <SharedBalanceChart
              actual={[plan.balance, ...planSim.rows.map((r) => r.end)]}
              planned={[]}
              aria={S.chartAria(plan.name)}
              actualLabel={plan.name}
              plannedLabel=""
            />
          </div>
        </section>
      )}

      {view.include_debts && (
        <section className="mt-10 border-t border-hair pt-8" aria-labelledby="sv-debts">
          <h2 id="sv-debts" className="font-display font-medium text-[28px] mb-5">
            {S.debtsTitle}
          </h2>
          {debts.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {S.progress}: <b>{Math.round(totals.progress * 100)}%</b>
                </span>
                <span>{totals.debtFreeISO ? `${S.debtFree}: ${monthYear(totals.debtFreeISO)}` : S.never}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(totals.progress * 100)} aria-label={S.progress} className="mt-2 h-4 border border-hair bg-surface">
                <div className="h-full bg-btn" style={{ width: `${totals.progress * 100}%` }} />
              </div>
            </div>
          )}
          <div className="grid gap-8">
            {debts.map((o) => {
              const planned = o.schedule ? [o.schedule.balance, ...plannedRows(o.schedule).map((r) => r.end)] : [];
              const actual = [o.debt.start_balance, ...o.ledger.rows.map((r) => r.end), o.ledger.balance];
              return (
                <article key={o.debt.id} className="inset-card p-5 sm:p-7 grid gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">{o.debt.name}</h3>
                    <span className="text-sm">{o.comparison ? S.onPlan[o.comparison.status] : S.noPlan2}</span>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label={S.balanceNow} value={money(o.ledger.balance, o.debt.currency)} />
                    <Stat label={S.progress} value={`${Math.round(Math.max(0, 1 - o.ledger.balance / o.debt.start_balance) * 100)}%`} />
                    <Stat label={S.monthly} value={money(o.monthlyBasis, o.debt.currency)} />
                    <Stat label={S.debtFree} value={o.ledger.paidOff ? "✓" : o.projection ? monthYear(o.projection.debtFreeISO) : S.never} />
                  </div>
                  <SharedBalanceChart actual={actual} planned={planned} aria={S.chartAria(o.debt.name)} actualLabel={o.debt.name} plannedLabel={S.planTitle} />
                  {view.show_payments && o.ledger.history.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="num w-full text-sm">
                        <caption className="text-left font-semibold mb-2">{S.paymentsTitle}</caption>
                        <thead>
                          <tr className="text-left text-muted">
                            <th scope="col" className="py-2 pr-4">{S.date}</th>
                            <th scope="col" className="py-2 pr-4">{S.amount}</th>
                            {view.show_notes && <th scope="col" className="py-2">{S.note}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {o.ledger.history.map((h, i) => (
                            <tr key={i} className="border-t border-hair">
                              <td className="py-2 pr-4 whitespace-nowrap">{shortDate(h.paid_on)}</td>
                              <td className="py-2 pr-4 whitespace-nowrap">{money(h.amount, o.debt.currency)}</td>
                              {view.show_notes && <td className="py-2">{h.note ?? ""}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {view.show_goals && view.goals.length > 0 && (
        <section className="mt-10 border-t border-hair pt-8" aria-labelledby="sv-goals">
          <h2 id="sv-goals" className="font-display font-medium text-[28px] mb-5">
            {S.goalsTitle}
          </h2>
          <ul className="grid gap-3">
            {view.goals.map((g, i) => (
              <li key={i} className="inset-card p-4 flex flex-wrap justify-between gap-3">
                <span>
                  <b>{g.title}</b>
                  {g.target_date ? <span className="text-muted"> · {monthYear(g.target_date)}</span> : null}
                </span>
                <span className={g.achieved ? "text-good font-semibold" : "text-muted"}>{g.achieved ? S.achieved : S.open}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="mt-12 border-t border-hair pt-8">
        <h2 className="font-display font-medium text-[24px] mb-4">{S.ctaTitle}</h2>
        <Button href="/signup" variant="primary">
          {S.cta}
        </Button>
      </aside>
    </>
  );
}
