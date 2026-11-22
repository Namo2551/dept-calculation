"use client";
import { useActionState, useState } from "react";
import { deletePlan } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/TextField";
import { plansCopy } from "@/copy/plans";

const C = plansCopy.detail;
const cls =
  "inline-flex items-center justify-center min-h-12 px-[22px] font-mono font-medium text-[15px] border-2 border-bad text-bad bg-transparent hover:bg-surface cursor-pointer disabled:opacity-50";

// Delete from the details page: a first click arms it, the second deletes and goes back to /plans.
export function DeletePlanButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState(deletePlan, undefined);
  if (!armed) {
    return (
      <button type="button" className={cls} onClick={() => setArmed(true)}>
        {C.delete}
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {state?.message && <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage>}
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="redirectTo" value="/plans" />
      <button type="submit" className={cls} disabled={pending} autoFocus>
        {C.confirmDelete}
      </button>
      <Button variant="quiet" onClick={() => setArmed(false)}>
        {plansCopy.list.cancel}
      </Button>
    </form>
  );
}
