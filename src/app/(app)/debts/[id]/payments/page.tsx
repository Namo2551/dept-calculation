import type { Metadata } from "next";
import Link from "next/link";
import { AccountSection } from "@/components/app/AccountSection";
import { MonthlyTable } from "@/components/debts/MonthlyTable";
import { PaymentForm } from "@/components/debts/PaymentForm";
import { PaymentHistory } from "@/components/debts/PaymentHistory";
import { PageIntro } from "@/components/PageIntro";
import { debtsCopy } from "@/copy/debts";
import { formatMoney } from "@/lib/money";
import { loadDebtPage } from "../load-debt";

export const metadata: Metadata = { title: "Payment history", robots: { index: false } };

const P = debtsCopy.payments;

// The full payment history for one debt: every payment with its balance after, and the monthly breakdown.
export default async function PaymentHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { o, today, history } = await loadDebtPage(id, `/debts/${id}/payments`);
  const { debt, ledger } = o;
  const cur = debt.currency;
  return (
    <>
      <p className="pt-8">
        <Link href={`/debts/${debt.id}`} className="inline-flex min-h-11 items-center font-mono text-sm underline underline-offset-4">
          ← {P.backToDebt(debt.name)}
        </Link>
      </p>
      <PageIntro title={P.fullTitle(debt.name)} intro={P.fullIntro} />
      <dl className="mt-8 grid grid-cols-2 gap-5 max-w-[520px]">
        <div>
          <dt className="text-sm text-muted">{debtsCopy.fields.balance}</dt>
          <dd className="num font-display text-2xl">{formatMoney(ledger.balance, cur)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{debtsCopy.detail.paidSoFar}</dt>
          <dd className="num font-display text-2xl">{formatMoney(ledger.totalPaid, cur)}</dd>
        </div>
      </dl>
      <div className="mt-10 grid gap-12">
        <AccountSection title={P.historyTitle} id="history">
          <PaymentHistory rows={history} debtId={debt.id} startDate={debt.start_date} today={today} currency={cur} />
        </AccountSection>
        <AccountSection title={P.addTitle} id="add-payment">
          <div className="max-w-[640px]">
            <PaymentForm debtId={debt.id} startDate={debt.start_date} today={today} />
          </div>
        </AccountSection>
        <AccountSection title={debtsCopy.monthly.title} id="monthly">
          <MonthlyTable rows={ledger.rows} currency={cur} open />
        </AccountSection>
      </div>
    </>
  );
}
