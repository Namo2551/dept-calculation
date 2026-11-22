// Server-side rules for saved debt plans. They match the calculator's input rules (src/lib/state.ts) and the
// CHECK constraints on public.debt_plans, so anything that passes here is accepted by the database.
import { z } from "zod";
import { plansCopy } from "@/copy/plans";
import { formatBahtShort } from "@/lib/format";
import { parseNumber, type SingleRaw } from "@/lib/state";
import type { DebtPlanRow } from "@/lib/supabase/database.types";
import { fieldErrors } from "@/lib/validation/auth";

const E = plansCopy.errors;
const MONEY_MAX = 999_999_999_999.99; // numeric(14,2)

// A number typed with commas, spaces or a baht sign ("30,000"), parsed the way the calculator parses it.
const num = (rule: z.ZodNumber) =>
  z
    .string()
    .transform((s) => parseNumber(s))
    .pipe(rule);

const money = (msg: string, min: "gt0" | "ge0") => num((min === "gt0" ? z.number({ error: msg }).gt(0, msg) : z.number({ error: msg }).min(0, msg)).max(MONEY_MAX, E.tooBig));
const months = (msg: string) => num(z.number({ error: msg }).int(msg).min(1, msg).max(1200, msg));

export const planNameSchema = z.string().trim().min(1, E.name).max(80, E.name);

const inputs = {
  balance: money(E.balance, "gt0"),
  apr: num(z.number({ error: E.apr }).min(0, E.apr).max(100, E.apr)),
  min_pct: num(z.number({ error: E.min_pct }).min(0.1, E.min_pct).max(100, E.min_pct)),
  min_floor: money(E.min_floor, "ge0"),
  fixed_payment: money(E.fixed_payment, "ge0"),
  target_months: months(E.target_months),
  interest_limit: money(E.interest_limit, "ge0"),
};

// The calculator's inputs (SingleRaw keys) as a new plan's columns.
export const calcPlanSchema = z
  .object({ name: planNameSchema, bal: z.string(), apr: z.string(), m: z.string(), floor: z.string(), p: z.string(), n: z.string(), lim: z.string() })
  .transform((v, ctx) => {
    const parsed = z
      .object(inputs)
      .safeParse({ balance: v.bal, apr: v.apr, min_pct: v.m, min_floor: v.floor, fixed_payment: v.p, target_months: v.n, interest_limit: v.lim });
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: E.calcInvalid, path: ["form"] });
      return z.NEVER;
    }
    return { name: v.name, ...parsed.data };
  });

const optional = <T extends z.ZodType>(schema: T) => z.union([z.literal("").transform(() => null), schema]);

function isRealDate(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Every editable column of a plan, as posted by the edit form (all strings).
export const planEditSchema = z
  .object({
    name: planNameSchema,
    ...inputs,
    bonus_amount: optional(money(E.bonus_amount, "gt0")),
    bonus_month: optional(months(E.bonus_month)),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, E.start_date)
      .refine(isRealDate, E.start_date),
    notes: z
      .string()
      .trim()
      .max(1000, E.notes)
      .transform((s) => (s === "" ? null : s)),
  })
  .superRefine((v, ctx) => {
    if (v.bonus_amount !== null && v.bonus_month === null) ctx.addIssue({ code: "custom", message: E.bonusMonthNeeded, path: ["bonus_month"] });
    if (v.bonus_amount === null && v.bonus_month !== null) ctx.addIssue({ code: "custom", message: E.bonusAmountNeeded, path: ["bonus_amount"] });
  });

export type PlanEdit = z.output<typeof planEditSchema>;

const uuid = z.uuid();
export function isPlanId(id: unknown): id is string {
  return uuid.safeParse(id).success;
}

// First message per field, for showing next to the inputs.
export const firstErrors = fieldErrors;

// A saved plan as the calculator's input strings (the same formats the inputs use, e.g. "30,000").
export function planToSingleRaw(p: Pick<DebtPlanRow, "balance" | "apr" | "min_pct" | "min_floor" | "fixed_payment" | "target_months" | "interest_limit">): SingleRaw {
  return {
    bal: formatBahtShort(p.balance),
    apr: String(p.apr),
    m: String(p.min_pct),
    floor: formatBahtShort(p.min_floor),
    p: formatBahtShort(p.fixed_payment),
    n: String(p.target_months),
    lim: formatBahtShort(p.interest_limit),
  };
}

// A free name for a copy: "Card (copy)", then "Card (copy 2)", ... trimmed so it fits 80 characters.
export function copyName(name: string, taken: string[]): string {
  const used = new Set(taken);
  for (let i = 1; ; i++) {
    const suffix = i === 1 ? " (copy)" : ` (copy ${i})`;
    const candidate = name.slice(0, 80 - suffix.length).trimEnd() + suffix;
    if (!used.has(candidate)) return candidate;
  }
}
