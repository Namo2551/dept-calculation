"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appCopy } from "@/copy/app";
import { debtsCopy } from "@/copy/debts";
import { requireConsent } from "@/lib/auth";
import { loadOverview } from "@/lib/data/load";
import { debtSchema, fieldErrors, idSchema, paymentSchemaFor, scheduleSchema, statusSchema } from "@/lib/debts-validation";
import { nextStatus } from "@/lib/debts-view";
import { todayISO } from "@/lib/ledger";
import { shortDate } from "@/lib/money";
import type { Database } from "@/lib/supabase/database.types";

// Server Actions for debts, payments and plan baselines. Every write checks consent, validates with zod, and
// relies on RLS plus composite foreign keys for ownership: ids from the form are never trusted on their own
// (an id that isn't this user's matches 0 rows or fails the foreign key).

export type DebtFormState = {
  errors?: Record<string, string>;
  message?: string;
  tone?: "good" | "bad";
  values?: Record<string, string>; // what was typed, to refill the form after a validation error
  done?: number; // changes on every success so client forms can reset
};

type Client = SupabaseClient<Database>;
const V = debtsCopy.validation;
const generic = (): DebtFormState => ({ message: appCopy.auth.genericError, tone: "bad" });
const missing = (): DebtFormState => ({ message: V.notFound, tone: "bad" });
const ok = (message: string): DebtFormState => ({ message, tone: "good", done: Date.now() });

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

async function writer() {
  const ctx = await requireConsent();
  return { supabase: ctx.supabase, blocked: ctx.consentMissing ? ({ message: appCopy.needConsent, tone: "bad" } as DebtFormState) : null };
}

function refresh(debtId?: string) {
  revalidatePath("/debts");
  if (debtId) {
    revalidatePath(`/debts/${debtId}`);
    revalidatePath(`/debts/${debtId}/payments`);
  }
  revalidatePath("/dashboard");
}

const debtFields = (fd: FormData) => ({
  name: str(fd, "name"),
  kind: str(fd, "kind"),
  start_balance: str(fd, "start_balance"),
  start_date: str(fd, "start_date"),
  apr: str(fd, "apr"),
  min_pct: str(fd, "min_pct"),
  min_amount: str(fd, "min_amount"),
  due_day: str(fd, "due_day"),
  currency: str(fd, "currency") || "THB",
});

// Moves a debt to paid off when its payments clear the balance, and back to active if they no longer do.
// Returns true when it just became paid off.
async function syncStatus(supabase: Client, debtId: string): Promise<boolean> {
  const o = await loadOverview(supabase, debtId);
  if (!o) return false;
  const next = nextStatus(o.debt.status, o.ledger.paidOff);
  if (!next) return false;
  await supabase.from("debts").update({ status: next }).eq("id", debtId);
  return next === "paid_off";
}

// ------------------------------------------------------------------ debts

export async function createDebt(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const values = debtFields(fd);
  const parsed = debtSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed), values };
  const { data, error } = await supabase.from("debts").insert(parsed.data).select("id").single();
  if (error || !data) return generic();
  refresh();
  redirect(`/debts/${data.id}`);
}

export async function updateDebt(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const id = idSchema.safeParse(str(fd, "id"));
  if (!id.success) return missing();
  const values = debtFields(fd);
  const parsed = debtSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed), values };
  const first = await supabase.from("payment_records").select("paid_on").eq("debt_id", id.data).order("paid_on").limit(1).maybeSingle();
  if (first.data && parsed.data.start_date > first.data.paid_on) {
    return { errors: { start_date: debtsCopy.form.startAfterPayments(shortDate(first.data.paid_on)) }, values };
  }
  const { data, error } = await supabase.from("debts").update(parsed.data).eq("id", id.data).select("id");
  if (error) return generic();
  if (!data?.length) return missing();
  await syncStatus(supabase, id.data);
  refresh(id.data);
  return ok(debtsCopy.form.saved);
}

export async function setDebtStatus(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const id = idSchema.safeParse(str(fd, "id"));
  const status = statusSchema.safeParse(str(fd, "status"));
  if (!id.success || !status.success) return missing();
  const { data, error } = await supabase.from("debts").update({ status: status.data }).eq("id", id.data).select("id");
  if (error) return generic();
  if (!data?.length) return missing();
  refresh(id.data);
  return ok(debtsCopy.form.saved);
}

// Payments and baselines go with it through ON DELETE CASCADE.
export async function deleteDebt(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const id = idSchema.safeParse(str(fd, "id"));
  if (!id.success || str(fd, "confirm") !== "yes") return missing();
  const { data, error } = await supabase.from("debts").delete().eq("id", id.data).select("id");
  if (error) return generic();
  if (!data?.length) return missing();
  refresh();
  redirect("/debts");
}

// ------------------------------------------------------------------ payments

async function debtStart(supabase: Client, debtId: string): Promise<string | null> {
  const { data } = await supabase.from("debts").select("start_date").eq("id", debtId).maybeSingle();
  return data?.start_date ?? null;
}

const paymentFields = (fd: FormData) => ({ paid_on: str(fd, "paid_on"), amount: str(fd, "amount"), note: str(fd, "note") });

export async function addPayment(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const debtId = idSchema.safeParse(str(fd, "debt_id"));
  if (!debtId.success) return missing();
  const startDate = await debtStart(supabase, debtId.data);
  if (!startDate) return missing();
  const values = paymentFields(fd);
  const parsed = paymentSchemaFor({ startDate, today: todayISO() }).safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed), values };
  const { error } = await supabase.from("payment_records").insert({ debt_id: debtId.data, ...parsed.data });
  if (error) return generic();
  const paidOff = await syncStatus(supabase, debtId.data);
  refresh(debtId.data);
  return ok(paidOff ? debtsCopy.payments.paidOffNow : debtsCopy.payments.added);
}

export async function updatePayment(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const id = idSchema.safeParse(str(fd, "id"));
  const debtId = idSchema.safeParse(str(fd, "debt_id"));
  if (!id.success || !debtId.success) return missing();
  const startDate = await debtStart(supabase, debtId.data);
  if (!startDate) return missing();
  const values = paymentFields(fd);
  const parsed = paymentSchemaFor({ startDate, today: todayISO() }).safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed), values };
  const { data, error } = await supabase.from("payment_records").update(parsed.data).eq("id", id.data).eq("debt_id", debtId.data).select("id");
  if (error) return generic();
  if (!data?.length) return missing();
  const paidOff = await syncStatus(supabase, debtId.data);
  refresh(debtId.data);
  return ok(paidOff ? debtsCopy.payments.paidOffNow : debtsCopy.payments.updated);
}

export async function deletePayment(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const id = idSchema.safeParse(str(fd, "id"));
  const debtId = idSchema.safeParse(str(fd, "debt_id"));
  if (!id.success || !debtId.success) return missing();
  const { data, error } = await supabase.from("payment_records").delete().eq("id", id.data).eq("debt_id", debtId.data).select("id");
  if (error) return generic();
  if (!data?.length) return missing();
  await syncStatus(supabase, debtId.data);
  refresh(debtId.data);
  return ok(debtsCopy.payments.deleted);
}

// ------------------------------------------------------------------ plan baseline

// Freezes a new baseline: from a saved plan (copying its balance, rate and fixed payment) or from a monthly
// payment on the debt's own starting numbers. The old active baseline is switched off first, because the
// database allows only one active baseline per debt.
export async function startSchedule(_: DebtFormState | undefined, fd: FormData): Promise<DebtFormState> {
  const { supabase, blocked } = await writer();
  if (blocked) return blocked;
  const debtId = idSchema.safeParse(str(fd, "debt_id"));
  if (!debtId.success) return missing();
  const mode = str(fd, "mode");
  const values = { mode: mode === "plan" ? "plan" : "payment", plan_id: str(fd, "plan_id"), monthly_payment: str(fd, "monthly_payment") };
  const parsed = scheduleSchema.safeParse(values.mode === "plan" ? { mode: "plan", plan_id: values.plan_id } : { mode: "payment", monthly_payment: values.monthly_payment });
  if (!parsed.success) return { errors: fieldErrors(parsed), values };

  const debt = await supabase.from("debts").select("start_balance, apr, start_date").eq("id", debtId.data).maybeSingle();
  if (!debt.data) return missing();

  let row: Database["public"]["Tables"]["repayment_schedules"]["Insert"];
  if (parsed.data.mode === "plan") {
    const plan = await supabase.from("debt_plans").select("id, balance, apr, fixed_payment, start_date").eq("id", parsed.data.plan_id).maybeSingle();
    if (!plan.data) return { errors: { plan_id: V.pickPlan } };
    if (!(plan.data.fixed_payment > 0)) return { errors: { plan_id: V.monthlyPayment } };
    row = {
      debt_id: debtId.data,
      source_plan_id: plan.data.id,
      balance: plan.data.balance,
      apr: plan.data.apr,
      monthly_payment: plan.data.fixed_payment,
      start_date: plan.data.start_date > debt.data.start_date ? plan.data.start_date : debt.data.start_date,
    };
  } else {
    row = {
      debt_id: debtId.data,
      source_plan_id: null,
      balance: debt.data.start_balance,
      apr: debt.data.apr,
      monthly_payment: parsed.data.monthly_payment,
      start_date: debt.data.start_date,
    };
  }

  // One transaction in the database: the old plan is switched off and the new one added together.
  const { error } = await supabase.rpc("start_repayment_schedule", {
    p_debt_id: debtId.data,
    p_source_plan_id: row.source_plan_id ?? null,
    p_balance: row.balance,
    p_apr: row.apr,
    p_monthly_payment: row.monthly_payment,
    p_start_date: row.start_date,
  });
  if (error) return generic();
  refresh(debtId.data);
  return ok(debtsCopy.plan.started);
}
