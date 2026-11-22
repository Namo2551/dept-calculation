"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { loadPlanForCalculator, savePlanFromCalculator, updatePlanFromCalculator, type PlanFormState } from "@/app/(app)/plans/actions";
import { useCalc } from "@/components/calculator/CalcContext";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { plansCopy } from "@/copy/plans";
import type { SingleRaw } from "@/lib/state";

const C = plansCopy.save;
const KEYS: (keyof SingleRaw)[] = ["bal", "apr", "m", "floor", "p", "n", "lim"];

type Open = { id: string; name: string };
type Note = { text: string; tone: "good" | "bad"; planId?: string };

// The calculator's current valid inputs as hidden fields, read by the Server Action.
function SingleInputs({ single }: { single: SingleRaw }) {
  return (
    <>
      {KEYS.map((k) => (
        <input key={k} type="hidden" name={k} value={single[k]} />
      ))}
    </>
  );
}

export default function CalcPlanTools({ planId }: { planId: string | null }) {
  const { validState, replaceSingle } = useCalc();
  const [open, setOpen] = useState<Open | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);

  // ?plan=<id>: load that plan's inputs once per id. Not found leaves the calculator as it is.
  useEffect(() => {
    if (!planId) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows "loading" while the plan is fetched
    setLoading(true);
    loadPlanForCalculator(planId)
      .then((res) => {
        if (!live) return;
        if (res.ok) {
          replaceSingle(res.single);
          setOpen({ id: res.id, name: res.name });
          setNote({ text: C.loaded(res.name), tone: "good", planId: res.id });
        } else {
          setOpen(null);
          setNote({ text: C.notFound, tone: "bad" });
        }
      })
      .catch(() => live && setNote({ text: C.notFound, tone: "bad" }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [planId, replaceSingle]);

  const [saveState, saveAction, saving] = useActionState(async (prev: PlanFormState | undefined, fd: FormData) => {
    setDraft(String(fd.get("name") ?? ""));
    const res = await savePlanFromCalculator(prev, fd);
    if (res.planId && res.name) {
      setOpen({ id: res.planId, name: res.name });
      setFormOpen(false);
      setDraft("");
    }
    if (res.message) setNote({ text: res.message, tone: res.tone ?? "bad", planId: res.planId });
    return res;
  }, undefined);

  const [, updateAction, updating] = useActionState(async (prev: PlanFormState | undefined, fd: FormData) => {
    const res = await updatePlanFromCalculator(prev, fd);
    if (res.message) setNote({ text: res.message, tone: res.tone ?? "bad", planId: res.planId });
    if (res.name && res.planId) setOpen({ id: res.planId, name: res.name });
    return res;
  }, undefined);

  return (
    <div className="grid gap-3 w-full" data-testid="plan-tools">
      <div className="flex flex-wrap items-center gap-2">
        {!formOpen && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            {C.open}
          </Button>
        )}
        {open && (
          <form action={updateAction}>
            <input type="hidden" name="id" value={open.id} />
            <SingleInputs single={validState.single} />
            <Button size="sm" type="submit" disabled={updating}>
              {C.update(open.name)}
            </Button>
          </form>
        )}
        <Button size="sm" variant="quiet" href="/plans">
          {C.allPlans}
        </Button>
      </div>

      {formOpen && (
        <form action={saveAction} className="grid gap-3 sm:grid-cols-[minmax(0,320px)_auto] sm:items-end">
          <SingleInputs single={validState.single} />
          <TextField
            label={C.nameLabel}
            hint={C.nameHint}
            name="name"
            maxLength={80}
            required
            autoComplete="off"
            defaultValue={draft}
            error={saveState?.errors?.name}
            errorPrefix={plansCopy.errors.prefix}
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit" variant="primary" disabled={saving}>
              {saving ? C.saving : C.submit}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setFormOpen(false)}>
              {C.cancel}
            </Button>
          </div>
        </form>
      )}

      <p role="status" className={`text-sm min-h-5 ${note?.tone === "bad" ? "text-bad" : "text-good"}`}>
        {loading ? C.loading : note?.text}
        {!loading && note?.planId && note.tone === "good" && (
          <>
            {" "}
            <Link href={`/plans/${note.planId}`} className="underline underline-offset-4 font-semibold">
              {C.viewPlan}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
