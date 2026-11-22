import { describe, expect, test } from "vitest";
import type { DebtPlanRow } from "@/lib/supabase/database.types";
import { calcPlanSchema, copyName, isPlanId, planEditSchema, planNameSchema, planToSingleRaw, firstErrors } from "./plans-validation";

const single = { bal: "30,000", apr: "16", m: "5", floor: "0", p: "1,500", n: "24", lim: "3,000" };

const row: DebtPlanRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u",
  debt_id: null,
  name: "Card",
  balance: 30000,
  apr: 16,
  min_pct: 5,
  min_floor: 0,
  fixed_payment: 1500,
  target_months: 24,
  interest_limit: 3000,
  bonus_amount: null,
  bonus_month: null,
  start_date: "2026-11-22",
  currency: "THB",
  notes: null,
  created_at: "",
  updated_at: "",
};

const edit = {
  name: "Card",
  balance: "30,000",
  apr: "16",
  min_pct: "5",
  min_floor: "0",
  fixed_payment: "1,500",
  target_months: "24",
  interest_limit: "3,000",
  bonus_amount: "",
  bonus_month: "",
  start_date: "2026-11-22",
  notes: "",
};

describe("planNameSchema", () => {
  test("trims and accepts 1 to 80 characters", () => {
    expect(planNameSchema.parse("  My plan ")).toBe("My plan");
    expect(planNameSchema.safeParse("a".repeat(80)).success).toBe(true);
  });
  test("rejects empty and too long names", () => {
    expect(planNameSchema.safeParse("   ").success).toBe(false);
    expect(planNameSchema.safeParse("a".repeat(81)).success).toBe(false);
  });
});

describe("calcPlanSchema", () => {
  test("parses the calculator strings into table columns", () => {
    const r = calcPlanSchema.parse({ name: "Card", ...single });
    expect(r).toEqual({ name: "Card", balance: 30000, apr: 16, min_pct: 5, min_floor: 0, fixed_payment: 1500, target_months: 24, interest_limit: 3000 });
  });
  test("uses the same rules as the calculator", () => {
    const bad = (patch: Partial<typeof single>) => calcPlanSchema.safeParse({ name: "x", ...single, ...patch }).success;
    expect(bad({ bal: "0" })).toBe(false);
    expect(bad({ bal: "abc" })).toBe(false);
    expect(bad({ apr: "101" })).toBe(false);
    expect(bad({ m: "0.05" })).toBe(false);
    expect(bad({ floor: "-1" })).toBe(false);
    expect(bad({ p: "-5" })).toBe(false);
    expect(bad({ n: "1.5" })).toBe(false);
    expect(bad({ n: "1201" })).toBe(false);
    expect(bad({ lim: "-1" })).toBe(false);
    expect(bad({ apr: "0", p: "0" })).toBe(true);
  });
  test("rejects amounts the database column cannot hold", () => {
    expect(calcPlanSchema.safeParse({ name: "x", ...single, bal: "1000000000000" }).success).toBe(false);
  });
});

describe("planEditSchema", () => {
  test("parses every field, empty optional ones become null", () => {
    const r = planEditSchema.parse(edit);
    expect(r).toMatchObject({ name: "Card", balance: 30000, fixed_payment: 1500, bonus_amount: null, bonus_month: null, start_date: "2026-11-22", notes: null });
  });
  test("keeps a bonus when both amount and month are given", () => {
    const r = planEditSchema.parse({ ...edit, bonus_amount: "5,000", bonus_month: "6", notes: " pay early " });
    expect(r.bonus_amount).toBe(5000);
    expect(r.bonus_month).toBe(6);
    expect(r.notes).toBe("pay early");
  });
  test("asks for the missing half of a bonus", () => {
    const r = planEditSchema.safeParse({ ...edit, bonus_amount: "5,000" });
    expect(r.success).toBe(false);
    expect(firstErrors(r).bonus_month).toBeTruthy();
    const r2 = planEditSchema.safeParse({ ...edit, bonus_month: "3" });
    expect(firstErrors(r2).bonus_amount).toBeTruthy();
  });
  test("checks bonus ranges, the date and notes length", () => {
    expect(planEditSchema.safeParse({ ...edit, bonus_amount: "0", bonus_month: "3" }).success).toBe(false);
    expect(planEditSchema.safeParse({ ...edit, bonus_amount: "10", bonus_month: "0" }).success).toBe(false);
    expect(planEditSchema.safeParse({ ...edit, start_date: "2026-02-30" }).success).toBe(false);
    expect(planEditSchema.safeParse({ ...edit, start_date: "22/11/2026" }).success).toBe(false);
    expect(planEditSchema.safeParse({ ...edit, notes: "a".repeat(1001) }).success).toBe(false);
    expect(planEditSchema.safeParse({ ...edit, notes: "a".repeat(1000) }).success).toBe(true);
  });
  test("field errors point at the input", () => {
    const r = planEditSchema.safeParse({ ...edit, balance: "", min_pct: "0" });
    const e = firstErrors(r);
    expect(Object.keys(e).sort()).toEqual(["balance", "min_pct"]);
  });
});

describe("helpers", () => {
  test("isPlanId accepts uuids only", () => {
    expect(isPlanId(row.id)).toBe(true);
    expect(isPlanId("abc")).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });
  test("planToSingleRaw gives the calculator's input strings", () => {
    expect(planToSingleRaw({ ...row, balance: 30000.5, fixed_payment: 1469 })).toEqual({ bal: "30,000.50", apr: "16", m: "5", floor: "0", p: "1,469", n: "24", lim: "3,000" });
  });
  test("planToSingleRaw output parses back to the same numbers", () => {
    const r = calcPlanSchema.parse({ name: row.name, ...planToSingleRaw(row) });
    expect(r.balance).toBe(row.balance);
    expect(r.target_months).toBe(row.target_months);
  });
  test("copyName finds a free name and stays within 80 characters", () => {
    expect(copyName("Card", ["Card"])).toBe("Card (copy)");
    expect(copyName("Card", ["Card", "Card (copy)"])).toBe("Card (copy 2)");
    expect(copyName("Card", ["Card", "Card (copy)", "Card (copy 2)"])).toBe("Card (copy 3)");
    const long = "x".repeat(80);
    const c = copyName(long, [long]);
    expect(c.length).toBeLessThanOrEqual(80);
    expect(c.endsWith("(copy)")).toBe(true);
  });
});
