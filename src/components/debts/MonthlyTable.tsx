import { debtsCopy } from "@/copy/debts";
import type { LedgerRow } from "@/lib/ledger";
import { formatMoney, shortDate } from "@/lib/money";

const M = debtsCopy.monthly;

// The completed months of the ledger, collapsed by default.
export function MonthlyTable({ rows, currency, open = false }: { rows: LedgerRow[]; currency: string; open?: boolean }) {
  if (rows.length === 0) return <p className="text-muted">{M.none}</p>;
  const money = (n: number) => formatMoney(n, currency);
  return (
    <details open={open} className="group">
      <summary className="inline-flex items-center min-h-11 cursor-pointer font-mono text-sm underline underline-offset-4">{M.summary(rows.length)}</summary>
      <div className="mt-4 overflow-x-auto border border-hair">
        <table className="w-full min-w-[640px] text-[15px]">
          <caption className="sr-only">{M.caption}</caption>
          <thead className="bg-surface text-right">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-left">{M.colMonth}</th>
              <th scope="col" className="px-3 py-2 font-medium text-left">{M.colEnds}</th>
              <th scope="col" className="px-3 py-2 font-medium">{M.colStart}</th>
              <th scope="col" className="px-3 py-2 font-medium">{M.colInterest}</th>
              <th scope="col" className="px-3 py-2 font-medium">{M.colPaid}</th>
              <th scope="col" className="px-3 py-2 font-medium">{M.colEnd}</th>
            </tr>
          </thead>
          <tbody className="text-right num">
            {rows.map((r) => (
              <tr key={r.month} className="border-t border-hair">
                <th scope="row" className="px-3 py-2 font-normal text-left">{r.month}</th>
                <td className="px-3 py-2 text-left whitespace-nowrap">{shortDate(r.endsOn)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(r.start)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(r.interest)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(r.paid)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(r.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
