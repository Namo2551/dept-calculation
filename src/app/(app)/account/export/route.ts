import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

// "Download my data" (PDPA right of access): every row the signed-in user owns, as one JSON file.
// RLS limits each query to this user; the share-link token hashes are left out.
export async function GET() {
  const { supabase, userId, email } = await requireUser("/account");
  const [profile, debts, plans, schedules, payments, goals, shares] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("debts").select("*").order("created_at"),
    supabase.from("debt_plans").select("*").order("created_at"),
    supabase.from("repayment_schedules").select("*").order("created_at"),
    supabase.from("payment_records").select("*").order("paid_on"),
    supabase.from("financial_goals").select("*").order("created_at"),
    supabase
      .from("shared_plans")
      .select("id,label,plan_id,include_debts,show_amounts,show_payments,show_goals,show_notes,expires_at,revoked_at,last_viewed_at,created_at")
      .order("created_at"),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: userId, email },
    profile: profile.data,
    debts: debts.data ?? [],
    debt_plans: plans.data ?? [],
    repayment_schedules: schedules.data ?? [],
    payment_records: payments.data ?? [],
    financial_goals: goals.data ?? [],
    shared_links: shares.data ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="paydown-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
