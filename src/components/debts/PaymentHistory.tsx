"use client";
import { useActionState, useState } from "react";
import { deletePayment, updatePayment } from "@/app/(app)/debts/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { debtsCopy } from "@/copy/debts";
import { addDaysISO } from "@/lib/debts-validation";
import type { HistoryRow } from "@/lib/debts-view";
import { formatMoney, shortDate } from "@/lib/money";
import { ConfirmSubmit } from "./ConfirmSubmit";
import { formKey } from "./DebtForm";

const P = debtsCopy.payments;

type Ctx = { debtId: string; startDate: string; today: string; currency: string };

// Payments in date order with the balance after each; edit opens a form under the row, delete asks twice.
export function PaymentHistory({ rows, ...ctx }: { rows: HistoryRow[] } & Ctx) {
  if (rows.length === 0) return <p className="text-muted">{P.empty}</p>;
  return (
    <div className="overflow-x-auto border border-hair">
      <table className="w-full min-w-[640px] text-left text-[15px]">
        <caption className="sr-only">{P.historyCaption}</caption>
        <thead className="bg-surface">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">{P.colDate}</th>
            <th scope="col" className="px-3 py-2 font-medium text-right">{P.colAmount}</th>
            <th scope="col" className="px-3 py-2 font-medium">{P.colNote}</th>
            <th scope="col" className="px-3 py-2 font-medium text-right">{P.colBalance}</th>
            <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">{P.colActions}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <PaymentRow key={r.id} row={r} {...ctx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentRow({ row, debtId, startDate, today, currency }: { row: HistoryRow } & Ctx) {
  const [edit, editAction, editPending] = useActionState(updatePayment, undefined);
  const [del, delAction, delPending] = useActionState(deletePayment, undefined);
  // The editor stays open until a save succeeds (a new `done` value), then closes by itself.
  const [opened, setOpened] = useState<{ with: typeof edit } | null>(null);
  const editing = opened !== null && (edit === opened.with || edit?.tone !== "good");
  const v = { paid_on: row.paid_on, amount: String(row.amount), note: row.note ?? "", ...edit?.values };
  const e = edit?.errors ?? {};
  const date = shortDate(row.paid_on);
  return (
    <>
      <tr className="border-t border-hair align-top">
        <th scope="row" className="px-3 py-2 font-normal whitespace-nowrap">{date}</th>
        <td className="px-3 py-2 text-right num whitespace-nowrap">{formatMoney(row.amount, currency)}</td>
        <td className="px-3 py-2 break-words max-w-[24ch]">{row.note}</td>
        <td className="px-3 py-2 text-right num whitespace-nowrap">
          {row.balanceAfter === null ? <span className="text-muted">{P.pendingBalance(date)}</span> : formatMoney(row.balanceAfter, currency)}
        </td>
        <td className="px-3 py-1">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="quiet" aria-expanded={editing} onClick={() => setOpened(editing ? null : { with: edit })}>
              {editing ? P.cancel : P.edit}
              <span className="sr-only"> {date}</span>
            </Button>
            <form action={delAction}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="debt_id" value={debtId} />
              <ConfirmSubmit label={P.delete} confirmLabel={P.deleteConfirm} cancelLabel={P.cancel} pending={delPending} />
            </form>
          </div>
          {del?.tone === "bad" && <FormMessage tone="bad">{del.message}</FormMessage>}
          {!editing && edit?.tone === "good" && <p role="status" className="sr-only">{edit.message}</p>}
        </td>
      </tr>
      {editing && (
        <tr className="bg-surface">
          <td colSpan={5} className="px-3 py-4">
            <form key={formKey(edit)} action={editAction} className="grid gap-4" noValidate aria-label={P.editTitle(date)}>
              {edit?.tone === "bad" && edit.message && <FormMessage tone="bad">{edit.message}</FormMessage>}
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="debt_id" value={debtId} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label={P.date} name="paid_on" type="date" min={startDate} max={addDaysISO(today, 1)} defaultValue={v.paid_on} error={e.paid_on} />
                <TextField label={P.amount} name="amount" inputMode="decimal" defaultValue={v.amount} error={e.amount} />
                <TextField label={P.note} name="note" maxLength={500} defaultValue={v.note} error={e.note} autoComplete="off" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" size="sm" variant="primary" disabled={editPending}>
                  {P.save}
                </Button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
