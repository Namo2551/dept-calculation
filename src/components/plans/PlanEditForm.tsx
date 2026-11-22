"use client";
import { useActionState, useId } from "react";
import { updatePlan } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { plansCopy } from "@/copy/plans";
import { formatBahtShort } from "@/lib/format";
import type { DebtPlanRow } from "@/lib/supabase/database.types";

const F = plansCopy.fields;
const P = plansCopy.errors.prefix;

// Edit every field of a plan. The server validates with zod and sends field errors back.
export function PlanEditForm({ plan }: { plan: DebtPlanRow }) {
  const [state, action, pending] = useActionState(updatePlan, undefined);
  const e = state?.errors ?? {};
  const notesId = useId();
  const v = state?.values; // after an error, keep what the user typed
  const val = (name: string, fallback: string) => v?.[name] ?? fallback;
  const money = (name: keyof DebtPlanRow, value: number | null) => (
    <TextField label={F[name as keyof typeof F]} name={name} inputMode="decimal" defaultValue={val(name, value === null ? "" : formatBahtShort(value))} error={e[name]} errorPrefix={P} />
  );
  const plain = (name: keyof DebtPlanRow, value: number | null, inputMode: "decimal" | "numeric") => (
    <TextField label={F[name as keyof typeof F]} name={name} inputMode={inputMode} defaultValue={val(name, value === null ? "" : String(value))} error={e[name]} errorPrefix={P} />
  );

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={plan.id} />
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      <TextField label={F.name} name="name" maxLength={80} defaultValue={val("name", plan.name)} autoComplete="off" error={e.name} errorPrefix={P} />
      <div className="grid gap-5 sm:grid-cols-2">
        {money("balance", plan.balance)}
        {plain("apr", plan.apr, "decimal")}
        {plain("min_pct", plan.min_pct, "decimal")}
        {money("min_floor", plan.min_floor)}
        {money("fixed_payment", plan.fixed_payment)}
        {plain("target_months", plan.target_months, "numeric")}
        {money("interest_limit", plan.interest_limit)}
        <TextField label={F.start_date} name="start_date" type="date" defaultValue={val("start_date", plan.start_date)} error={e.start_date} errorPrefix={P} />
        {money("bonus_amount", plan.bonus_amount)}
        {plain("bonus_month", plan.bonus_month, "numeric")}
      </div>
      <div>
        <label htmlFor={notesId} className="block text-sm font-medium mb-2">
          {F.notes}
        </label>
        <textarea
          id={notesId}
          name="notes"
          rows={4}
          maxLength={1000}
          defaultValue={val("notes", plan.notes ?? "")}
          aria-invalid={e.notes ? "true" : "false"}
          aria-describedby={e.notes ? notesId + "-err" : undefined}
          className={`w-full bg-bg border px-3 py-2 text-base ${e.notes ? "border-2 border-bad" : "border-field"}`}
        />
        {e.notes && (
          <p id={notesId + "-err"} className="mt-2 text-sm text-bad">
            <span aria-hidden="true">⚠ </span>
            <b>{P}</b> {e.notes}
          </p>
        )}
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {plansCopy.detail.save}
        </Button>
      </div>
    </form>
  );
}
