import { z } from "zod";
import { GOAL_KINDS } from "./goals";

// Server-side rules for the goal form. They match the financial_goals CHECK constraints: title 1-120,
// kind one of four, debt_id + date for debt_paid_by, a date for debt_free_by, 0 < pct <= 100,
// amount >= 0 (numeric(14,2)). Only the fields for the chosen kind are stored; the rest become null.

export type GoalFormInput = { title: string; kind: string; debtId: string; targetDate: string; targetPct: string; targetAmount: string };

const MSG = {
  title: "Give the goal a name of 1 to 120 characters",
  kind: "Choose a goal type",
  debt: "Choose one of your debts",
  date: "Enter a date between 2000 and 2100",
  dateNeeded: "Choose a target date",
  pct: "Enter a percentage above 0 and up to 100, with at most 2 decimals",
  amount: "Enter an amount of 0 or more, with at most 2 decimals",
};

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && s >= "2000-01-01" && s <= "2100-12-31";
}

// "10,000.50" -> 10000.5; null when not a plain number with at most 2 decimals.
function money(s: string): number | null {
  const t = s.replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t);
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const goalSchema = z
  .object({
    title: z.string().trim().min(1, MSG.title).max(120, MSG.title),
    kind: z.enum(GOAL_KINDS, { message: MSG.kind }),
    debtId: z.string().trim(),
    targetDate: z.string().trim(),
    targetPct: z.string().trim(),
    targetAmount: z.string().trim(),
  })
  .transform((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    let target_date: string | null = null;
    if (v.targetDate) {
      if (isRealDate(v.targetDate)) target_date = v.targetDate;
      else issue("targetDate", MSG.date);
    } else if (v.kind === "debt_free_by" || v.kind === "debt_paid_by") issue("targetDate", MSG.dateNeeded);

    let debt_id: string | null = null;
    if (v.kind === "debt_paid_by") {
      if (uuid.test(v.debtId)) debt_id = v.debtId.toLowerCase();
      else issue("debtId", MSG.debt);
    }

    let target_pct: number | null = null;
    if (v.kind === "reduce_total_pct") {
      const n = money(v.targetPct);
      if (n !== null && n > 0 && n <= 100) target_pct = n;
      else issue("targetPct", MSG.pct);
    }

    let target_amount: number | null = null;
    if (v.kind === "reduce_total_to") {
      const n = money(v.targetAmount);
      if (n !== null && n >= 0 && n < 1e12) target_amount = n;
      else issue("targetAmount", MSG.amount);
    }
    return { title: v.title, kind: v.kind, debt_id, target_date, target_pct, target_amount };
  });

export type GoalValues = z.output<typeof goalSchema>;
