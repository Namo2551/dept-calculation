import { z } from "zod";
import { debtsCopy } from "@/copy/debts";
import { shortDate } from "./money";

// Server-side rules for the debt, payment and baseline forms. Ranges match the CHECK constraints in
// supabase/migrations/20261122000100_initial_schema.sql. Form values arrive as strings.
const V = debtsCopy.validation;
export { fieldErrors } from "./validation/auth";

export const DEBT_KINDS = ["credit_card", "personal_loan", "other"] as const;
export const DEBT_STATUSES = ["active", "paid_off", "archived"] as const;
const MAX_MONEY = 1e12; // numeric(14,2)

// "30,000" or " 1 500.50 " -> number; empty -> undefined; anything else -> NaN (fails as "not a number").
function toNumber(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.replace(/[,\s]/g, "");
  if (s === "") return undefined;
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}

const num = (message: string) => z.preprocess(toNumber, z.number({ error: message }));
const optionalNum = (message: string) => z.preprocess(toNumber, z.number({ error: message }).optional());

function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const isoDate = z
  .string({ error: V.date })
  .trim()
  .refine(isRealDate, V.date)
  .refine((s) => s >= "2000-01-01", V.dateTooEarly);

// 'YYYY-MM-DD' plus n days, without time zones.
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const debtSchema = z.object({
  name: z.string().trim().min(1, V.nameRequired).max(80, V.nameTooLong),
  kind: z.enum(DEBT_KINDS, { error: V.kind }),
  start_balance: num(V.balance).refine((n) => n > 0 && n < MAX_MONEY, V.balance),
  start_date: isoDate,
  apr: num(V.apr).refine((n) => n >= 0 && n <= 100, V.apr),
  min_pct: optionalNum(V.minPct)
    .refine((n) => n === undefined || (n > 0 && n <= 100), V.minPct)
    .transform((n) => n ?? null),
  min_amount: optionalNum(V.minAmount)
    .refine((n) => n === undefined || (n >= 0 && n < MAX_MONEY), V.minAmount)
    .transform((n) => n ?? 0),
  due_day: optionalNum(V.dueDay)
    .refine((n) => n === undefined || (Number.isInteger(n) && n >= 1 && n <= 31), V.dueDay)
    .transform((n) => n ?? null),
  currency: z.enum(["THB"], { error: V.currency }),
});
export type DebtInput = z.infer<typeof debtSchema>;

// A payment must fall between the debt's start date and tomorrow (one day of slack for time zones).
export function paymentSchemaFor({ startDate, today }: { startDate: string; today: string }) {
  const latest = addDaysISO(today, 1);
  return z.object({
    paid_on: isoDate
      .refine((s) => !isRealDate(s) || s >= startDate, V.beforeStart(shortDate(startDate)))
      .refine((s) => !isRealDate(s) || s <= latest, V.future),
    amount: num(V.amount).refine((n) => n > 0 && n < MAX_MONEY, V.amount),
    note: z
      .string()
      .trim()
      .max(500, V.noteTooLong)
      .optional()
      .transform((s) => (s ? s : null)),
  });
}
export type PaymentInput = z.infer<ReturnType<typeof paymentSchemaFor>>;

export const scheduleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("plan"), plan_id: z.uuid({ error: V.pickPlan }) }),
  z.object({ mode: z.literal("payment"), monthly_payment: num(V.monthlyPayment).refine((n) => n > 0 && n < MAX_MONEY, V.monthlyPayment) }),
]);

export const statusSchema = z.enum(DEBT_STATUSES);
export const idSchema = z.uuid();
