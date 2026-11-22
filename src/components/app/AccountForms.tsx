"use client";
import { useActionState } from "react";
import { deleteAccount, updateProfile } from "@/app/(app)/account/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { appCopy } from "@/copy/app";

const C = appCopy.account;

export function ProfileForm({ displayName, currency }: { displayName: string; currency: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-5 max-w-[460px]">
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      <TextField label={C.displayName} name="displayName" maxLength={80} defaultValue={displayName} autoComplete="name" error={state?.errors?.displayName} />
      <div>
        <label htmlFor="currency" className="block text-sm font-medium mb-2">
          {C.currency}
        </label>
        <p className="-mt-1 mb-2 text-sm text-muted">{C.currencyHint}</p>
        <select id="currency" name="currency" defaultValue={currency} className="w-full h-12 bg-bg border border-field px-3 text-base">
          <option value="THB">THB (฿)</option>
        </select>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {C.save}
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="grid gap-5 max-w-[460px]">
      {state?.message && <FormMessage tone="bad">{state.message}</FormMessage>}
      <TextField label={C.deleteConfirmLabel} name="confirm" autoComplete="off" error={state?.errors?.confirm} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center min-h-12 px-[22px] font-mono font-medium text-[15px] border-2 border-bad text-bad bg-transparent hover:bg-surface cursor-pointer disabled:opacity-50"
      >
        {C.deleteButton}
      </button>
    </form>
  );
}
