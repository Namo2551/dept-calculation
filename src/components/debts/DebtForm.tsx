"use client";
import { useActionState } from "react";
import { createDebt, updateDebt } from "@/app/(app)/debts/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { debtsCopy } from "@/copy/debts";
import { SelectField } from "./SelectField";
import { newDebtDefaults, type DebtFormValues } from "@/lib/debts-form";

export { newDebtDefaults, type DebtFormValues };

const F = debtsCopy.form;

// Remount the fields whenever a submit comes back, so they show the refilled values (after an error) or the
// fresh defaults (after a success) instead of whatever React's automatic form reset left.
export function formKey(state: { values?: Record<string, string>; done?: number } | undefined): string {
  return state ? `${state.done ?? ""}:${JSON.stringify(state.values ?? {})}` : "initial";
}

const kindOptions = Object.entries(debtsCopy.kinds).map(([value, label]) => ({ value, label }));

export function DebtForm({ initial, mode }: { initial: DebtFormValues; mode: "add" | "edit" }) {
  const [state, action, pending] = useActionState(mode === "add" ? createDebt : updateDebt, undefined);
  const v = { ...initial, ...state?.values };
  const e = state?.errors ?? {};
  return (
    <form key={formKey(state)} action={action} className="grid gap-5" noValidate>
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label={F.name} name="name" hint={F.nameHint} maxLength={80} defaultValue={v.name} error={e.name} autoComplete="off" required />
        <SelectField label={F.kind} name="kind" options={kindOptions} defaultValue={v.kind} error={e.kind} />
        <TextField label={F.startBalance} name="start_balance" inputMode="decimal" defaultValue={v.start_balance} error={e.start_balance} required />
        <TextField label={F.startDate} name="start_date" type="date" hint={F.startDateHint} defaultValue={v.start_date} error={e.start_date} min="2000-01-01" required />
        <TextField label={F.apr} name="apr" inputMode="decimal" defaultValue={v.apr} error={e.apr} required />
        <TextField label={F.dueDay} name="due_day" inputMode="numeric" hint={F.dueDayHint} defaultValue={v.due_day} error={e.due_day} />
        <TextField label={F.minPct} name="min_pct" inputMode="decimal" hint={F.minPctHint} defaultValue={v.min_pct} error={e.min_pct} />
        <TextField label={F.minAmount} name="min_amount" inputMode="decimal" hint={F.minAmountHint} defaultValue={v.min_amount} error={e.min_amount} />
        <SelectField label={F.currency} name="currency" options={[{ value: "THB", label: "THB (฿)" }]} defaultValue={v.currency} error={e.currency} />
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {mode === "add" ? F.add : F.save}
        </Button>
      </div>
    </form>
  );
}
