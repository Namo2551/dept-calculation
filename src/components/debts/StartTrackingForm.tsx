"use client";
import { useActionState, useState } from "react";
import { startSchedule } from "@/app/(app)/debts/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { debtsCopy } from "@/copy/debts";
import { formatMoney, shortDate } from "@/lib/money";
import { formKey } from "./DebtForm";
import { SelectField } from "./SelectField";

const C = debtsCopy.plan;

export type PlanOption = { id: string; name: string; fixed_payment: number };

// Freezes a baseline: copy a saved plan, or use a monthly payment on this debt's own starting numbers.
export function StartTrackingForm({
  debtId,
  plans,
  startBalance,
  startDate,
  currency,
  isReset,
}: {
  debtId: string;
  plans: PlanOption[];
  startBalance: number;
  startDate: string;
  currency: string;
  isReset: boolean;
}) {
  const [state, action, pending] = useActionState(startSchedule, undefined);
  const usable = plans.filter((p) => p.fixed_payment > 0);
  const [mode, setMode] = useState<"plan" | "payment">(usable.length > 0 ? "plan" : "payment");
  const v = { plan_id: usable[0]?.id ?? "", monthly_payment: "", ...state?.values };
  const e = state?.errors ?? {};
  return (
    <form key={formKey(state)} action={action} className="grid gap-5" noValidate>
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      <input type="hidden" name="debt_id" value={debtId} />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium mb-2">{isReset ? C.resetTitle : C.startTitle}</legend>
        {(["plan", "payment"] as const).map((m) => (
          <label key={m} className="inline-flex items-center gap-3 min-h-11 cursor-pointer">
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="size-5 accent-[var(--btn)]" />
            {m === "plan" ? C.fromPlan : C.fromPayment}
          </label>
        ))}
      </fieldset>
      {mode === "plan" ? (
        usable.length > 0 ? (
          <SelectField
            label={C.pickPlan}
            name="plan_id"
            defaultValue={v.plan_id}
            error={e.plan_id}
            options={usable.map((p) => ({ value: p.id, label: C.planOption(p.name, formatMoney(p.fixed_payment, currency)) }))}
          />
        ) : (
          <p className="text-muted">{C.noPlans}</p>
        )
      ) : (
        <TextField
          label={C.monthlyPayment}
          name="monthly_payment"
          inputMode="decimal"
          hint={C.monthlyPaymentHint(formatMoney(startBalance, currency), shortDate(startDate))}
          defaultValue={v.monthly_payment}
          error={e.monthly_payment}
        />
      )}
      <div>
        <Button type="submit" variant="primary" disabled={pending || (mode === "plan" && usable.length === 0)}>
          {isReset ? C.reset : C.start}
        </Button>
      </div>
    </form>
  );
}
