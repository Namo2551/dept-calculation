import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "@/lib/ledger";
import { overviewOf, type DebtOverview } from "@/lib/overview";
import type { Database, DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// Everything the app pages need about the signed-in user's debts, in three queries. RLS limits every query
// to this user's rows, so no user id filter is needed (or trusted) here.
export async function loadOverviews(supabase: Client, asOf = todayISO()): Promise<DebtOverview[]> {
  const [debts, payments, schedules] = await Promise.all([
    supabase.from("debts").select("*").order("created_at"),
    supabase.from("payment_records").select("*").order("paid_on"),
    supabase.from("repayment_schedules").select("*").eq("is_active", true),
  ]);
  if (debts.error) throw debts.error;
  if (payments.error) throw payments.error;
  if (schedules.error) throw schedules.error;
  const byDebt = new Map<string, PaymentRecordRow[]>();
  (payments.data ?? []).forEach((p) => byDebt.set(p.debt_id, [...(byDebt.get(p.debt_id) ?? []), p]));
  const scheduleOf = new Map<string, RepaymentScheduleRow>((schedules.data ?? []).map((s) => [s.debt_id, s]));
  return (debts.data ?? []).map((d: DebtRow) => overviewOf(d, byDebt.get(d.id) ?? [], scheduleOf.get(d.id) ?? null, asOf));
}

// One debt with its payments and active plan; null if it doesn't exist or isn't this user's.
export async function loadOverview(supabase: Client, debtId: string, asOf = todayISO()): Promise<DebtOverview | null> {
  const [debt, payments, schedule] = await Promise.all([
    supabase.from("debts").select("*").eq("id", debtId).maybeSingle(),
    supabase.from("payment_records").select("*").eq("debt_id", debtId).order("paid_on"),
    supabase.from("repayment_schedules").select("*").eq("debt_id", debtId).eq("is_active", true).maybeSingle(),
  ]);
  if (!debt.data) return null;
  return overviewOf(debt.data, payments.data ?? [], schedule.data ?? null, asOf);
}
