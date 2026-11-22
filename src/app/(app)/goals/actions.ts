"use server";
import { revalidatePath } from "next/cache";
import { appCopy } from "@/copy/app";
import { goalsCopy } from "@/copy/goals";
import { requireConsent } from "@/lib/auth";
import { goalSchema, type GoalFormInput } from "@/lib/goals-schema";
import { fieldErrors } from "@/lib/validation/auth";

export type GoalState = {
  errors?: Record<string, string>;
  message?: string;
  tone?: "good" | "bad";
  values?: GoalFormInput; // what was submitted, to refill the form after an error
  n?: number; // changes on every response so the form remounts with fresh defaults
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

function readForm(fd: FormData): GoalFormInput {
  return { title: str(fd, "title"), kind: str(fd, "kind"), debtId: str(fd, "debtId"), targetDate: str(fd, "targetDate"), targetPct: str(fd, "targetPct"), targetAmount: str(fd, "targetAmount") };
}

// Creates a goal, or updates one when the form carries an id. RLS limits both to the user's own rows, and the
// composite foreign key rejects another user's debt; the debt check below just gives a clear field error.
export async function saveGoal(_: GoalState | undefined, fd: FormData): Promise<GoalState> {
  const { supabase, consentMissing } = await requireConsent();
  const values = readForm(fd);
  const n = Date.now();
  if (consentMissing) return { message: appCopy.needConsent, tone: "bad", values, n };
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed), values, n };
  const row = parsed.data;

  if (row.debt_id) {
    const { data: debt } = await supabase.from("debts").select("id").eq("id", row.debt_id).maybeSingle();
    if (!debt) return { errors: { debtId: goalsCopy.form.notYourDebt }, values, n };
  }

  const id = str(fd, "id");
  if (id) {
    if (!UUID.test(id)) return { message: goalsCopy.form.error, tone: "bad", values, n };
    // achieved_at is recomputed by the goals page from the new target.
    const { data, error } = await supabase.from("financial_goals").update({ ...row, achieved_at: null }).eq("id", id).select("id");
    if (error || !data?.length) return { message: goalsCopy.form.error, tone: "bad", values, n };
  } else {
    const { error } = await supabase.from("financial_goals").insert(row);
    if (error) return { message: goalsCopy.form.error, tone: "bad", values, n };
  }
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { message: goalsCopy.form.saved, tone: "good", n };
}

export async function deleteGoal(_: GoalState | undefined, fd: FormData): Promise<GoalState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return { message: appCopy.needConsent, tone: "bad" };
  const id = str(fd, "id");
  if (!UUID.test(id)) return { message: goalsCopy.form.error, tone: "bad" };
  const { data, error } = await supabase.from("financial_goals").delete().eq("id", id).select("id");
  if (error || !data?.length) return { message: goalsCopy.form.error, tone: "bad" };
  revalidatePath("/goals");
  return { message: goalsCopy.form.deleted, tone: "good" };
}
