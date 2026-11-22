import Link from "next/link";
import { BarChart } from "@/components/dashboard/BarChart";
import { MonthLineChart } from "@/components/dashboard/MonthLineChart";
import { ProgressBar, StatusBadge, percentText, type Tone } from "@/components/dashboard/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { dashboardCopy as C } from "@/copy/dashboard";
import { ymLabel, type Dashboard, type DebtStatus, type MonthPayments } from "@/lib/dashboard";
import { formatMoney, formatMoneyShort, monthYear } from "@/lib/money";

export const statusTone: Record<DebtStatus, Tone> = { paid_off: "good", ahead: "good", on_track: "good", behind: "bad", no_plan: "neutral" };

function Headline({ d }: { d: Dashboard }) {
  const h = d.headline;
  const text = h.kind === "date" ? C.headline.date(h.months, monthYear(h.iso)) : h.kind === "paid_off" ? C.headline.paidOff : h.kind === "never" ? C.headline.never(h.names) : "";
  return (
    <section aria-labelledby="headline" className="grid gap-5">
      <h2 id="headline" className={`font-display font-medium tracking-[-0.01em] text-balance ${h.kind === "never" ? "text-xl sm:text-2xl text-bad" : "text-3xl sm:text-[40px] leading-tight"}`}>
        {text}
      </h2>
      <ProgressBar value={d.totals.progress} label={C.progress.label} text={C.progress.text(percentText(d.totals.progress))} />
    </section>
  );
}

function Cards({ d, currency }: { d: Dashboard; currency: string }) {
  const t = d.totals;
  const items: { label: string; value: string; note?: string }[] = [
    { label: C.cards.outstanding, value: formatMoney(t.outstanding, currency) },
    { label: C.cards.paid, value: formatMoney(t.paid, currency) },
    { label: C.cards.interestPaid, value: formatMoney(t.interestPaid, currency) },
    { label: C.cards.remainingInterest, value: t.remainingInterest === null ? C.cards.remainingNever : formatMoney(t.remainingInterest, currency) },
    { label: C.cards.debtFree, value: t.debtFreeISO === null ? C.cards.debtFreeNever : monthYear(t.debtFreeISO) },
    { label: C.cards.thisMonth, value: formatMoney(d.thisMonth.paid, currency), note: C.cards.thisMonthOf(formatMoney(d.thisMonth.planned, currency)) },
  ];
  return (
    <section aria-labelledby="summary">
      <h2 id="summary" className="sr-only">
        {C.cards.title}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="inset-card p-5 min-w-0">
            <dt className="text-sm text-muted">{it.label}</dt>
            <dd className="mt-2 font-display text-2xl font-medium num break-words">{it.value}</dd>
            {it.note && <dd className="mt-1 text-sm text-muted num">{it.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

// Bars for the monthly payments plus the same numbers as a table (for screen readers and exact values).
export function PaymentsOverview({ rows, currency, aria, showPlanned = true }: { rows: MonthPayments[]; currency: string; aria: string; showPlanned?: boolean }) {
  const bars = rows.map((r) => ({
    label: ymLabel(r.ym).slice(0, 3),
    title: `${ymLabel(r.ym)}: ${formatMoney(r.paid, currency)}`,
    value: r.paid,
    marker: showPlanned ? r.planned : undefined,
  }));
  return (
    <div className="grid gap-3">
      <BarChart bars={bars} aria={aria} />
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span>
          <span aria-hidden="true" className="inline-block w-3 h-3 mr-2 align-middle bg-series-b" />
          {C.charts.paid}
        </span>
        {showPlanned && (
          <span>
            <span aria-hidden="true" className="inline-block w-4 h-[3px] mr-2 align-middle bg-series-a" />
            {C.charts.planned}
          </span>
        )}
        <span className="num">
          {C.charts.range(ymLabel(rows[0].ym), ymLabel(rows[rows.length - 1].ym))}
        </span>
      </p>
      <details>
        <summary className="cursor-pointer min-h-11 inline-flex items-center underline underline-offset-4">{C.charts.showTable}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm num">
            <thead>
              <tr className="border-b border-hair text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {C.charts.month}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium text-right">
                  {C.charts.paid}
                </th>
                {showPlanned && (
                  <th scope="col" className="py-2 font-medium text-right">
                    {C.charts.planned}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ym} className="border-b border-hair">
                  <th scope="row" className="py-2 pr-4 font-normal text-left whitespace-nowrap">
                    {ymLabel(r.ym)}
                  </th>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatMoney(r.paid, currency)}</td>
                  {showPlanned && <td className="py-2 text-right whitespace-nowrap">{formatMoney(r.planned, currency)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Charts({ d, currency }: { d: Dashboard; currency: string }) {
  const s = d.total;
  const labels = s.months.map(ymLabel);
  const p = d.plan;
  return (
    <>
      {labels.length > 0 && (
        <Panel>
          <PanelTitle>{C.charts.totalTitle}</PanelTitle>
          <MonthLineChart
            months={labels}
            solid={{ data: s.actual, label: C.charts.actual }}
            dashed={{ data: s.projected, label: C.charts.projected }}
            dashedFrom={s.todayIndex}
            todayIndex={s.todayIndex}
            todayLabel={C.charts.today}
            aria={C.charts.totalAria(labels[0], labels.at(-1)!, formatMoneyShort(s.actual.at(-1) ?? 0, currency), formatMoneyShort(s.projected.at(-1) ?? 0, currency))}
          />
          <p className="mt-3 text-sm text-muted">{C.charts.totalNote(labels[0], labels[s.todayIndex], labels.at(-1)!)}</p>
          {!s.complete && <p className="mt-2 text-sm text-bad">{C.charts.totalCut}</p>}
        </Panel>
      )}
      <Panel>
        <PanelTitle>{C.charts.planTitle}</PanelTitle>
        {p ? (
          <>
            <MonthLineChart
              months={p.months.map(ymLabel)}
              solid={{ data: p.actual, label: C.charts.actual }}
              dashed={{ data: p.planned, label: C.charts.planned }}
              todayIndex={p.todayIndex}
              todayLabel={C.charts.today}
              aria={C.charts.planAria(ymLabel(p.months[0]), ymLabel(p.months.at(-1)!))}
            />
            <p className="mt-3 text-sm text-muted">{C.charts.planNote}</p>
          </>
        ) : (
          <p className="text-muted">{C.charts.planEmpty}</p>
        )}
      </Panel>
      <Panel>
        <PanelTitle>{C.charts.paymentsTitle}</PanelTitle>
        <p className="mb-4 text-sm text-muted">{C.charts.paymentsNote}</p>
        <PaymentsOverview rows={d.payments} currency={currency} aria={C.charts.paymentsAria(ymLabel(d.payments[0].ym), ymLabel(d.payments.at(-1)!.ym))} />
      </Panel>
    </>
  );
}

function DebtList({ d, linkDebts }: { d: Dashboard; linkDebts: boolean }) {
  return (
    <Panel>
      <PanelTitle>{C.debts.title}</PanelTitle>
      <ul className="grid gap-3">
        {d.debts.map((x) => {
          const body = (
            <>
              <span className="font-medium break-words">{x.name}</span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="num">
                  <span className="sr-only">{C.debts.balance}: </span>
                  {formatMoney(x.balance, x.currency)}
                </span>
                <StatusBadge tone={statusTone[x.status]}>{C.debts.status[x.status]}</StatusBadge>
              </span>
            </>
          );
          const cls = "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-11 border border-hair bg-bg px-4 py-3";
          return (
            <li key={x.id}>
              {linkDebts ? (
                <Link href={`/debts/${x.id}`} className={`${cls} hover:bg-surface`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {linkDebts && (
        <div className="mt-5">
          <Button href="/debts" size="sm">
            {C.debts.manage}
          </Button>
        </div>
      )}
    </Panel>
  );
}

export function DashboardEmpty() {
  return (
    <Panel className="max-w-[720px]">
      <PanelTitle>{C.empty.title}</PanelTitle>
      <p className="mb-6">{C.empty.body}</p>
      <div className="flex flex-wrap gap-3">
        <Button href="/debts" variant="primary">
          {C.empty.addDebt}
        </Button>
        <Button href="/calculator">{C.empty.calculator}</Button>
      </div>
    </Panel>
  );
}

// The whole dashboard from precomputed data. Pure props, so a read-only view (sharing) can reuse it.
export function DashboardView({ data, currency = "THB", linkDebts = true }: { data: Dashboard; currency?: string; linkDebts?: boolean }) {
  if (data.debts.length === 0) return <DashboardEmpty />;
  return (
    <div className="grid gap-8 min-w-0" data-testid="dashboard">
      <Headline d={data} />
      <Cards d={data} currency={currency} />
      <Charts d={data} currency={currency} />
      <DebtList d={data} linkDebts={linkDebts} />
    </div>
  );
}
