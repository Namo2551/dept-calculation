"use client";
import { useActionState, useId, useState } from "react";
import { deleteGoal, saveGoal } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { goalsCopy } from "@/copy/goals";
import { GOAL_KINDS } from "@/lib/goals";
import type { GoalFormInput } from "@/lib/goals-schema";

const C = goalsCopy.form;

export type DebtOption = { id: string; name: string };
export type Preset = { label: string; values: GoalFormInput };

export const EMPTY_GOAL: GoalFormInput = { title: "", kind: "debt_free_by", debtId: "", targetDate: "", targetPct: "", targetAmount: "" };

const selectCls = (error?: string) => `w-full h-12 bg-bg border px-3 text-base ${error ? "border-2 border-bad" : "border-field"}`;

function SelectField({ label, name, value, onChange, error, children }: { label: string; name: string; value: string; onChange?: (v: string) => void; error?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? id + "-err" : undefined}
        className={selectCls(error)}
      >
        {children}
      </select>
      {error && (
        <p id={id + "-err"} className="mt-2 text-sm text-bad">
          <span aria-hidden="true">⚠ </span>
          <b>Check:</b> {error}
        </p>
      )}
    </div>
  );
}

// The fields; remounted (by key) whenever the defaults change, so the kind picker starts from them.
function Fields({ initial, debts, errors }: { initial: GoalFormInput; debts: DebtOption[]; errors?: Record<string, string> }) {
  const [kind, setKind] = useState<string>(initial.kind || "debt_free_by");
  const [debtId, setDebtId] = useState<string>(initial.debtId || debts[0]?.id || "");
  return (
    <>
      <TextField label={C.title} name="title" maxLength={120} defaultValue={initial.title} error={errors?.title} autoComplete="off" />
      <SelectField label={C.kind} name="kind" value={kind} onChange={setKind} error={errors?.kind}>
        {GOAL_KINDS.map((k) => (
          <option key={k} value={k}>
            {goalsCopy.kinds[k]}
          </option>
        ))}
      </SelectField>
      {kind === "debt_paid_by" &&
        (debts.length > 0 ? (
          <SelectField label={C.debt} name="debtId" value={debtId} onChange={setDebtId} error={errors?.debtId}>
            {debts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectField>
        ) : (
          <p className="text-bad">{C.debtNone}</p>
        ))}
      <TextField
        label={kind === "debt_free_by" || kind === "debt_paid_by" ? C.targetDate : C.targetDateOptional}
        name="targetDate"
        type="date"
        min="2000-01-01"
        max="2100-12-31"
        defaultValue={initial.targetDate}
        error={errors?.targetDate}
      />
      {kind === "reduce_total_pct" && (
        <TextField label={C.targetPct} hint={C.targetPctHint} name="targetPct" inputMode="decimal" defaultValue={initial.targetPct} error={errors?.targetPct} />
      )}
      {kind === "reduce_total_to" && <TextField label={C.targetAmount} name="targetAmount" inputMode="decimal" defaultValue={initial.targetAmount} error={errors?.targetAmount} />}
    </>
  );
}

// Create (no goalId) or edit a goal. Presets fill the form with an example to adjust.
export function GoalForm({ debts, presets = [], goalId, initial = EMPTY_GOAL }: { debts: DebtOption[]; presets?: Preset[]; goalId?: string; initial?: GoalFormInput }) {
  const [state, action, pending] = useActionState(saveGoal, undefined);
  const [preset, setPreset] = useState<{ values: GoalFormInput; n: number } | null>(null);
  // After an error the submitted values come back; after a successful create the form starts empty again.
  const fresh = state?.tone === "good" && !goalId ? EMPTY_GOAL : initial;
  const values = preset ? preset.values : (state?.values ?? fresh);
  const key = preset ? "p" + preset.n : "s" + (state?.n ?? 0);
  return (
    <div className="grid gap-5">
      {presets.length > 0 && (
        <div>
          <p className="text-sm font-medium">{C.presets}</p>
          <p className="mb-3 text-sm text-muted">{C.presetsHint}</p>
          <div className="flex flex-wrap gap-3">
            {presets.map((p) => (
              <Button key={p.label} size="sm" onClick={() => setPreset({ values: p.values, n: (preset?.n ?? 0) + 1 })}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form action={action} onSubmit={() => setPreset(null)} className="grid gap-5 max-w-[520px]">
        {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
        {goalId && <input type="hidden" name="id" value={goalId} />}
        <Fields key={key} initial={values} debts={debts} errors={preset ? undefined : state?.errors} />
        <div>
          <Button type="submit" variant="primary" disabled={pending}>
            {goalId ? C.update : C.create}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Delete with a second click to confirm.
export function DeleteGoalButton({ goalId, title }: { goalId: string; title: string }) {
  const [state, action, pending] = useActionState(deleteGoal, undefined);
  const [armed, setArmed] = useState(false);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={goalId} />
      {state?.message && state.tone === "bad" && <FormMessage tone="bad">{state.message}</FormMessage>}
      {armed ? (
        <button
          type="submit"
          disabled={pending}
          aria-label={`${C.deleteConfirm}: ${title}`}
          className="inline-flex items-center justify-center h-11 px-4 font-mono font-medium text-sm border-2 border-bad text-bad bg-transparent hover:bg-surface cursor-pointer disabled:opacity-50"
        >
          {C.deleteConfirm}
        </button>
      ) : (
        <Button size="sm" onClick={() => setArmed(true)} aria-label={`${C.delete}: ${title}`}>
          {C.delete}
        </Button>
      )}
    </form>
  );
}
