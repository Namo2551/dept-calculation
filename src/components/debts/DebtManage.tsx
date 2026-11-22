"use client";
import { useActionState } from "react";
import { deleteDebt, setDebtStatus } from "@/app/(app)/debts/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/TextField";
import { debtsCopy } from "@/copy/debts";
import { ConfirmSubmit } from "./ConfirmSubmit";

const A = debtsCopy.actions;

// One button that moves a debt to another status (archive, unarchive, paid off, active again).
export function StatusButton({ id, status, label, variant = "secondary" }: { id: string; status: string; label: string; variant?: "primary" | "secondary" }) {
  const [state, action, pending] = useActionState(setDebtStatus, undefined);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {label}
      </Button>
      {state?.tone === "bad" && <FormMessage tone="bad">{state.message}</FormMessage>}
    </form>
  );
}

// Archive or unarchive, paid off or active again, and delete with a second click that says payments go too.
export function DebtManage({ id, status, paymentCount }: { id: string; status: string; paymentCount: number }) {
  const [state, action, pending] = useActionState(deleteDebt, undefined);
  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted">{A.archiveHint}</p>
      <div className="flex flex-wrap gap-3">
        {status === "archived" ? <StatusButton id={id} status="active" label={A.unarchive} /> : <StatusButton id={id} status="archived" label={A.archive} />}
        {status === "active" && <StatusButton id={id} status="paid_off" label={A.markPaidOff} />}
        {status === "paid_off" && <StatusButton id={id} status="active" label={A.reopen} />}
      </div>
      <form action={action} className="grid gap-3">
        {state?.message && <FormMessage tone="bad">{state.message}</FormMessage>}
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmit label={A.delete} confirmLabel={A.deleteConfirm} cancelLabel={A.cancel} warning={A.deleteWarning(paymentCount)} pending={pending} />
      </form>
    </div>
  );
}
