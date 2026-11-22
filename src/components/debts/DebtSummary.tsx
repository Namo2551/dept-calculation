import { debtsCopy } from "@/copy/debts";
import { monthsToText } from "@/lib/format";
import { formatMoney, monthYear } from "@/lib/money";
import { minimumDue, type DebtOverview } from "@/lib/overview";
import { Fact } from "./DebtCard";

const D = debtsCopy.detail;

// Today's numbers for one debt and where they lead, naming the monthly payment the projection assumes.
export function DebtSummary({ o }: { o: DebtOverview }) {
  const { debt, ledger, projection } = o;
  const cur = debt.currency;
  const payoff = ledger.paidOff
    ? debtsCopy.fields.paidOffAlready
    : projection
      ? D.payoffIn(monthsToText(projection.months), monthYear(projection.debtFreeISO))
      : D.never;
  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <Fact label={debtsCopy.fields.balance}>
          <span className="text-2xl font-display">{formatMoney(ledger.balance, cur)}</span>
        </Fact>
        <Fact label={D.paidSoFar}>{formatMoney(ledger.totalPaid, cur)}</Fact>
        <Fact label={D.interestSoFar}>{formatMoney(ledger.interestCharged, cur)}</Fact>
        <Fact label={debtsCopy.fields.minimumDue}>{formatMoney(minimumDue(debt, ledger.balance), cur)}</Fact>
        <Fact label={D.projectedPayoff}>{payoff}</Fact>
        {!ledger.paidOff && <Fact label={D.payoffNow}>{formatMoney(ledger.payoffAmount, cur)}</Fact>}
        <Fact label={D.remainingInterest}>{projection ? formatMoney(projection.remainingInterest, cur) : D.never}</Fact>
      </dl>
      {!ledger.paidOff && <p className="text-sm text-muted">{D.basisAmount(D.basis[o.basisSource], formatMoney(o.monthlyBasis, cur))}</p>}
    </div>
  );
}
