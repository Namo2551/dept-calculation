"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appCopy } from "@/copy/app";
import { plansCopy } from "@/copy/plans";
import { requireConsent, requireUser } from "@/lib/auth";
import { calcPlanSchema, copyName, firstErrors, isPlanId, planEditSchema, planNameSchema, planToSingleRaw } from "@/lib/plans-validation";
import type { SingleRaw } from "@/lib/state";

// Every action checks the user on the server; RLS limits each query to their own rows, so an id that belongs
// to someone else simply matches nothing. Writes also need the privacy consent.

export type PlanFormState = {
  errors?: Record<string, string>;
  message?: string;
  tone?: "good" | "bad";
  planId?: string;
  name?: string;
  values?: Record<string, string>; // what was posted, so a form with errors keeps the user's typing
};

const E = plansCopy.errors;
const UNIQUE_VIOLATION = "23505";
const SINGLE_KEYS: (keyof SingleRaw)[] = ["bal", "apr", "m", "floor", "p", "n", "lim"];

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const singleFrom = (fd: FormData) => Object.fromEntries(SINGLE_KEYS.map((k) => [k, str(fd, k)])) as SingleRaw;
const bad = (message: string): PlanFormState => ({ message, tone: "bad" });

function refresh(id?: string) {
  revalidatePath("/plans");
  if (id) revalidatePath(`/plans/${id}`);
}

// Calculator: save the current inputs as a new plan.
export async function savePlanFromCalculator(_: PlanFormState | undefined, fd: FormData): Promise<PlanFormState> {
  const { supabase, profile, consentMissing } = await requireConsent();
  if (consentMissing) return bad(appCopy.needConsent);
  const parsed = calcPlanSchema.safeParse({ name: str(fd, "name"), ...singleFrom(fd) });
  if (!parsed.success) {
    const errors = firstErrors(parsed);
    return errors.form ? bad(errors.form) : { errors };
  }
  const { data, error } = await supabase
    .from("debt_plans")
    .insert({ ...parsed.data, currency: profile.currency })
    .select("id, name")
    .single();
  if (error?.code === UNIQUE_VIOLATION) return { errors: { name: E.nameTaken } };
  if (error || !data) return bad(appCopy.auth.genericError);
  refresh();
  return { message: plansCopy.save.saved(data.name), tone: "good", planId: data.id, name: data.name };
}

// Calculator: overwrite the open plan's calculator inputs (name, dates, bonus and notes are kept).
export async function updatePlanFromCalculator(_: PlanFormState | undefined, fd: FormData): Promise<PlanFormState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return bad(appCopy.needConsent);
  const id = str(fd, "id");
  if (!isPlanId(id)) return bad(E.notFound);
  const parsed = calcPlanSchema.safeParse({ name: "x", ...singleFrom(fd) });
  if (!parsed.success) return bad(E.calcInvalid);
  const { name: _ignored, ...fields } = parsed.data;
  void _ignored;
  const { data, error } = await supabase.from("debt_plans").update(fields).eq("id", id).select("id, name").maybeSingle();
  if (error) return bad(appCopy.auth.genericError);
  if (!data) return bad(E.notFound);
  refresh(id);
  return { message: plansCopy.save.updated(data.name), tone: "good", planId: data.id, name: data.name };
}

export type LoadedPlan = { ok: true; id: string; name: string; single: SingleRaw } | { ok: false };

// Calculator: the inputs of one of the user's plans, or { ok: false } when it isn't theirs or doesn't exist.
export async function loadPlanForCalculator(id: string): Promise<LoadedPlan> {
  const { supabase } = await requireUser(`/calculator?plan=${id}`);
  if (!isPlanId(id)) return { ok: false };
  const { data } = await supabase
    .from("debt_plans")
    .select("id, name, balance, apr, min_pct, min_floor, fixed_payment, target_months, interest_limit")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false };
  return { ok: true, id: data.id, name: data.name, single: planToSingleRaw(data) };
}

export async function renamePlan(_: PlanFormState | undefined, fd: FormData): Promise<PlanFormState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return bad(appCopy.needConsent);
  const id = str(fd, "id");
  if (!isPlanId(id)) return bad(E.notFound);
  const name = planNameSchema.safeParse(str(fd, "name"));
  if (!name.success) return { errors: { name: E.name } };
  const { data, error } = await supabase.from("debt_plans").update({ name: name.data }).eq("id", id).select("id, name").maybeSingle();
  if (error?.code === UNIQUE_VIOLATION) return { errors: { name: E.nameTaken } };
  if (error) return bad(appCopy.auth.genericError);
  if (!data) return bad(E.notFound);
  refresh(id);
  return { message: plansCopy.list.renamed, tone: "good", planId: data.id, name: data.name };
}

export async function duplicatePlan(_: PlanFormState | undefined, fd: FormData): Promise<PlanFormState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return bad(appCopy.needConsent);
  const id = str(fd, "id");
  if (!isPlanId(id)) return bad(E.notFound);
  const { data: plan } = await supabase.from("debt_plans").select("*").eq("id", id).maybeSingle();
  if (!plan) return bad(E.notFound);
  const { data: names } = await supabase.from("debt_plans").select("name");
  const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...fields } = plan;
  void [_id, _u, _c, _up];
  const { data, error } = await supabase
    .from("debt_plans")
    .insert({ ...fields, name: copyName(plan.name, (names ?? []).map((n) => n.name)) })
    .select("id, name")
    .single();
  if (error || !data) return bad(appCopy.auth.genericError);
  refresh();
  return { message: plansCopy.list.duplicated(data.name), tone: "good", planId: data.id, name: data.name };
}

// Deletes a plan. With redirectTo (the details page), goes there afterwards.
export async function deletePlan(_: PlanFormState | undefined, fd: FormData): Promise<PlanFormState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return bad(appCopy.needConsent);
  const id = str(fd, "id");
  if (!isPlanId(id)) return bad(E.notFound);
  const { data, error } = await supabase.from("debt_plans").delete().eq("id", id).select("id");
  if (error) return bad(appCopy.auth.genericError);
  if (!data?.length) return bad(E.notFound);
  refresh(id);
  if (str(fd, "redirectTo") === "/plans") redirect("/plans?deleted=1");
  return { message: plansCopy.list.deleted, tone: "good" };
}

// Details page: every field of a plan.
export async function updatePlan(_: PlanFormState | undefined, fd: FormData): Promise<PlanFormState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return bad(appCopy.needConsent);
  const id = str(fd, "id");
  if (!isPlanId(id)) return bad(E.notFound);
  const keys = ["name", "balance", "apr", "min_pct", "min_floor", "fixed_payment", "target_months", "interest_limit", "bonus_amount", "bonus_month", "start_date", "notes"];
  const values = Object.fromEntries(keys.map((k) => [k, str(fd, k)]));
  const parsed = planEditSchema.safeParse(values);
  if (!parsed.success) return { errors: firstErrors(parsed), values };
  const { data, error } = await supabase.from("debt_plans").update(parsed.data).eq("id", id).select("id, name").maybeSingle();
  if (error?.code === UNIQUE_VIOLATION) return { errors: { name: E.nameTaken }, values };
  if (error) return { ...bad(appCopy.auth.genericError), values };
  if (!data) return bad(E.notFound);
  refresh(id);
  return { message: plansCopy.detail.saved, tone: "good", planId: data.id, name: data.name };
}
