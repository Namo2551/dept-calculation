"use client";
import { useActionState, useState } from "react";
import { deletePlan, duplicatePlan, renamePlan, type PlanFormState } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/TextField";
import { plansCopy } from "@/copy/plans";

const C = plansCopy.list;

// Display-ready figures, computed on the server page.
export type PlanListItem = { id: string; name: string; balance: string; payment: string; months: string; updated: string };
type Notify = (s: PlanFormState) => void;

const dangerBtn =
  "inline-flex items-center justify-center h-11 px-4 font-mono font-medium text-sm border-2 border-bad text-bad bg-transparent hover:bg-surface cursor-pointer disabled:opacity-50";

function useNotifyingAction(action: (p: PlanFormState | undefined, fd: FormData) => Promise<PlanFormState>, notify: Notify, after?: (s: PlanFormState) => void) {
  return useActionState(async (prev: PlanFormState | undefined, fd: FormData) => {
    const res = await action(prev, fd);
    if (res.message) notify(res);
    after?.(res);
    return res;
  }, undefined);
}

function PlanRow({ item, notify }: { item: PlanListItem; notify: Notify }) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [renameState, renameAction, renamePending] = useNotifyingAction(renamePlan, notify, (s) => {
    if (s.tone === "good") setRenaming(false);
  });
  const [, dupAction, dupPending] = useNotifyingAction(duplicatePlan, notify);
  const [, delAction, delPending] = useNotifyingAction(deletePlan, notify);
  const nameErr = renameState?.errors?.name;
  const inputId = `rename-${item.id}`;

  return (
    <tr className="border-t border-hair align-top">
      <th scope="row" className="py-3 pr-4 text-left font-semibold min-w-[180px]">
        {renaming ? (
          <form action={renameAction} className="grid gap-2">
            <input type="hidden" name="id" value={item.id} />
            <label htmlFor={inputId} className="text-sm font-medium">
              {C.renameLabel(item.name)}
            </label>
            <input
              id={inputId}
              name="name"
              defaultValue={item.name}
              maxLength={80}
              autoFocus
              aria-invalid={nameErr ? "true" : "false"}
              aria-describedby={nameErr ? inputId + "-err" : undefined}
              className={`w-full h-11 bg-bg border px-3 text-base font-normal ${nameErr ? "border-2 border-bad" : "border-field"}`}
            />
            {nameErr && (
              <p id={inputId + "-err"} className="text-sm text-bad font-normal">
                <span aria-hidden="true">⚠ </span>
                <b>{plansCopy.errors.prefix}</b> {nameErr}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="submit" variant="primary" disabled={renamePending}>
                {C.renameSave}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setRenaming(false)}>
                {C.cancel}
              </Button>
            </div>
          </form>
        ) : (
          item.name
        )}
      </th>
      <td className="py-3 pr-4 num whitespace-nowrap">{item.balance}</td>
      <td className="py-3 pr-4 num whitespace-nowrap">{item.payment}</td>
      <td className="py-3 pr-4 whitespace-nowrap">{item.months}</td>
      <td className="py-3 pr-4 whitespace-nowrap">{item.updated}</td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2 min-w-[300px]">
          <Button size="sm" href={`/calculator?plan=${item.id}`}>
            {C.open}
          </Button>
          <Button size="sm" href={`/plans/${item.id}`}>
            {C.details}
          </Button>
          {!renaming && (
            <Button size="sm" variant="quiet" onClick={() => setRenaming(true)}>
              {C.rename}
            </Button>
          )}
          <form action={dupAction}>
            <input type="hidden" name="id" value={item.id} />
            <Button size="sm" variant="quiet" type="submit" disabled={dupPending}>
              {C.duplicate}
            </Button>
          </form>
          {confirming ? (
            <form action={delAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className={dangerBtn} disabled={delPending} autoFocus>
                {C.confirmDelete(item.name)}
              </button>
              <Button size="sm" variant="quiet" onClick={() => setConfirming(false)}>
                {C.cancel}
              </Button>
            </form>
          ) : (
            <button type="button" className={dangerBtn} onClick={() => setConfirming(true)}>
              {C.delete}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PlansTable({ items }: { items: PlanListItem[] }) {
  const [note, setNote] = useState<PlanFormState | null>(null);
  return (
    <div className="grid gap-4">
      {note?.message && <FormMessage tone={note.tone ?? "bad"}>{note.message}</FormMessage>}
      <div className="overflow-x-auto border-y border-hair">
        <table className="w-full text-[15px]">
          <caption className="sr-only">{C.caption}</caption>
          <thead>
            <tr className="text-left text-sm text-muted">
              <th scope="col" className="py-3 pr-4 font-medium">{C.name}</th>
              <th scope="col" className="py-3 pr-4 font-medium">{C.balance}</th>
              <th scope="col" className="py-3 pr-4 font-medium">{C.payment}</th>
              <th scope="col" className="py-3 pr-4 font-medium">{C.months}</th>
              <th scope="col" className="py-3 pr-4 font-medium">{C.updated}</th>
              <th scope="col" className="py-3 font-medium">{C.actions}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <PlanRow key={item.id} item={item} notify={setNote} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
