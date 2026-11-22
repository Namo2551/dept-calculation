"use client";
import { useActionState, useState } from "react";
import { createShare, deleteShare, revokeShare } from "@/app/(app)/sharing/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { sharingCopy as S } from "@/copy/sharing";

function Check({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 min-h-11 cursor-pointer text-[15px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-[var(--btn)]" />
      <span>{label}</span>
    </label>
  );
}

export function CreateShareForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createShare, undefined);
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-5 max-w-[560px]">
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      {state?.link && (
        <div className="grid gap-2">
          <label htmlFor="share-link" className="text-sm font-medium">
            {S.created}
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="share-link" readOnly value={state.link} onFocus={(e) => e.target.select()} className="num flex-1 min-w-0 h-12 bg-bg border border-field px-3 text-sm" />
            <Button
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(state.link!).then(() => setCopied(true));
              }}
            >
              {copied ? S.copied : S.copy}
            </Button>
          </div>
        </div>
      )}
      <form action={action} className="grid gap-5" onSubmit={() => setCopied(false)}>
        <TextField label={S.label} name="label" hint={S.labelHint} maxLength={80} error={state?.errors?.label} />
        <div>
          <label htmlFor="share-plan" className="block text-sm font-medium mb-2">
            {S.plan}
          </label>
          <select id="share-plan" name="planId" defaultValue="" className="w-full h-12 bg-bg border border-field px-3 text-base">
            <option value="">{S.noPlan}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Check name="includeDebts" label={S.includeDebts} defaultChecked />
        <fieldset className="grid gap-1 border border-hair p-4">
          <legend className="px-1 text-sm font-medium">{S.visibilityTitle}</legend>
          <Check name="showAmounts" label={S.showAmounts} defaultChecked />
          <Check name="showPayments" label={S.showPayments} />
          <Check name="showGoals" label={S.showGoals} />
          <Check name="showNotes" label={S.showNotes} />
        </fieldset>
        <div>
          <label htmlFor="share-exp" className="block text-sm font-medium mb-2">
            {S.expires}
          </label>
          <select id="share-exp" name="expiresDays" defaultValue="30" className="w-full h-12 bg-bg border border-field px-3 text-base">
            {S.expiry.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary" disabled={pending}>
          {S.create}
        </Button>
      </form>
    </div>
  );
}

// Two-step buttons: the first click arms, the second confirms (no accidental revokes or deletes).
function ConfirmButton({ action, id, label, confirm, danger = false }: { action: (fd: FormData) => Promise<void>; id: string; label: string; confirm: string; danger?: boolean }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={action} onSubmit={(e) => (armed ? undefined : (e.preventDefault(), setArmed(true)))}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onBlur={() => setArmed(false)}
        className={`inline-flex items-center min-h-11 px-3 font-mono text-sm border cursor-pointer ${danger ? "border-bad text-bad" : "border-btn"} ${armed ? "font-semibold" : ""}`}
      >
        {armed ? confirm : label}
      </button>
    </form>
  );
}

export function ShareActions({ id, active }: { id: string; active: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {active && <ConfirmButton action={revokeShare} id={id} label={S.revoke} confirm={S.revokeConfirm} />}
      <ConfirmButton action={deleteShare} id={id} label={S.delete} confirm={S.deleteConfirm} danger />
    </div>
  );
}
