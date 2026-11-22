"use client";
import { useActionState } from "react";
import { addPayment } from "@/app/(app)/debts/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { debtsCopy } from "@/copy/debts";
import { addDaysISO } from "@/lib/debts-validation";
import { formKey } from "./DebtForm";

const P = debtsCopy.payments;

// Records one payment. The date defaults to today; the server rejects dates before the debt's start or more
// than a day ahead, with the same friendly messages.
export function PaymentForm({ debtId, startDate, today }: { debtId: string; startDate: string; today: string }) {
  const [state, action, pending] = useActionState(addPayment, undefined);
  const v = { paid_on: today, amount: "", note: "", ...state?.values };
  const e = state?.errors ?? {};
  return (
    <form key={formKey(state)} action={action} className="grid gap-5" noValidate>
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      <input type="hidden" name="debt_id" value={debtId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label={P.date} name="paid_on" type="date" min={startDate} max={addDaysISO(today, 1)} defaultValue={v.paid_on} error={e.paid_on} required />
        <TextField label={P.amount} name="amount" inputMode="decimal" defaultValue={v.amount} error={e.amount} required />
      </div>
      <TextField label={P.note} name="note" hint={P.noteHint} maxLength={500} defaultValue={v.note} error={e.note} autoComplete="off" />
      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {P.add}
        </Button>
      </div>
    </form>
  );
}
