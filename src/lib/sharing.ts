// Private share links. The raw token exists only in the link the owner copies; the database stores its
// SHA-256 hash. Recipients read through public.get_shared_view(token), which enforces the owner's choices.
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "./supabase/database.types";

// 32 random bytes (256 bits), URL-safe: 43 characters.
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// PostgREST takes bytea as a "\x<hex>" string.
export function tokenHashForDb(token: string): string {
  return "\\x" + hashToken(token);
}

const num = z.coerce.number();
const sharedDebt = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  start_balance: num,
  start_date: z.string(),
  apr: num,
  min_pct: num.nullable(),
  min_amount: num,
  due_day: num.nullable(),
  currency: z.string(),
  status: z.string(),
  payments: z.array(z.object({ paid_on: z.string(), amount: num, note: z.string().nullable() })).nullable(),
  // sent instead of payments when the owner hid the payment history: one total per month
  monthly_paid: z.array(z.object({ paid_on: z.string(), amount: num })).nullable().optional(),
  schedule: z.object({ balance: num, apr: num, monthly_payment: num, start_date: z.string() }).nullable(),
});

const sharedView = z.object({
  label: z.string().nullable(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  show_amounts: z.boolean(),
  show_payments: z.boolean(),
  show_goals: z.boolean(),
  show_notes: z.boolean(),
  include_debts: z.boolean(),
  plan: z
    .object({
      name: z.string(),
      balance: num,
      apr: num,
      min_pct: num,
      min_floor: num,
      fixed_payment: num,
      target_months: num,
      bonus_amount: num.nullable(),
      bonus_month: num.nullable(),
      start_date: z.string(),
      currency: z.string(),
      notes: z.string().nullable(),
    })
    .nullable(),
  debts: z.array(sharedDebt),
  goals: z.array(
    z.object({ title: z.string(), kind: z.string(), target_date: z.string().nullable(), target_pct: num.nullable(), target_amount: num.nullable(), achieved: z.boolean() }),
  ),
});

export type SharedView = z.infer<typeof sharedView>;

export function parseSharedView(raw: unknown): SharedView | null {
  const r = sharedView.safeParse(raw);
  return r.success ? r.data : null;
}

// Shape shared debts like database rows so the same ledger/overview math renders them.
export function sharedDebtRows(v: SharedView): { debt: DebtRow; payments: PaymentRecordRow[]; schedule: RepaymentScheduleRow | null }[] {
  const ts = { created_at: "", updated_at: "" };
  return v.debts.map((d) => ({
    debt: { ...d, user_id: "", min_pct: d.min_pct, due_day: d.due_day, ...ts },
    payments: (d.payments ?? (d.monthly_paid ?? []).map((m) => ({ ...m, note: null }))).map((p, i) => ({
      id: `${d.id}-${i}`,
      user_id: "",
      debt_id: d.id,
      paid_on: p.paid_on,
      amount: p.amount,
      note: p.note,
      ...ts,
    })),
    schedule: d.schedule ? { id: d.id, user_id: "", debt_id: d.id, source_plan_id: null, is_active: true, ...d.schedule, ...ts } : null,
  }));
}

// Whether a link still works: revoked wins, then expiry.
export function shareStatus(s: { revoked_at: string | null; expires_at: string | null }, nowMs = Date.now()): "active" | "revoked" | "expired" {
  if (s.revoked_at) return "revoked";
  if (s.expires_at && new Date(s.expires_at).getTime() <= nowMs) return "expired";
  return "active";
}
