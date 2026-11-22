import Link from "next/link";
import { debtsCopy } from "@/copy/debts";
import { planBadge } from "@/lib/debts-view";
import { monthYear, formatMoney } from "@/lib/money";
import { minimumDue, type DebtOverview } from "@/lib/overview";
import { PlanBadge } from "./PlanBadge";

const F = debtsCopy.fields;

export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num font-medium break-words">{children}</dd>
    </div>
  );
}

// One debt on the list page. The name links to its page.
export function DebtCard({ o }: { o: DebtOverview }) {
  const { debt, ledger, projection } = o;
  const cur = debt.currency;
  const debtFree = ledger.paidOff ? F.paidOffAlready : projection ? monthYear(projection.debtFreeISO) : F.never;
  return (
    <article className={`inset-card p-5 sm:p-6 grid gap-4 ${debt.status === "archived" ? "opacity-80" : ""}`} aria-labelledby={`debt-${debt.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`debt-${debt.id}`} className="font-display font-medium text-xl break-words">
            <Link href={`/debts/${debt.id}`} className="underline-offset-4 hover:underline inline-flex min-h-11 items-center">
              {debt.name}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {debtsCopy.kinds[debt.kind] ?? debt.kind}
          </p>
        </div>
        <PlanBadge badge={planBadge(o.comparison)} />
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Fact label={F.balance}>{formatMoney(ledger.balance, cur)}</Fact>
        <Fact label={F.apr}>{debt.apr}%</Fact>
        <Fact label={F.minimumDue}>{formatMoney(minimumDue(debt, ledger.balance), cur)}</Fact>
        <Fact label={F.dueDay}>{debt.due_day ? F.dueDayValue(debt.due_day) : F.noDueDay}</Fact>
        <Fact label={F.status}>{debtsCopy.statuses[debt.status] ?? debt.status}</Fact>
        <Fact label={F.debtFree}>{debtFree}</Fact>
      </dl>
    </article>
  );
}
