import { describe, expect, test } from "vitest";
import { fieldErrors } from "./validation/auth";
import { goalSchema, type GoalFormInput } from "./goals-schema";

const DEBT = "7f1c2a4e-1b2c-4d3e-8f90-123456789abc";
const base: GoalFormInput = { title: "Become debt-free", kind: "debt_free_by", debtId: "", targetDate: "2027-12-31", targetPct: "", targetAmount: "" };
const parse = (over: Partial<GoalFormInput>) => goalSchema.safeParse({ ...base, ...over });

describe("goalSchema", () => {
  test("debt_free_by needs a date and stores only the fields for its kind", () => {
    const r = parse({ debtId: DEBT, targetPct: "50", targetAmount: "100" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ title: "Become debt-free", kind: "debt_free_by", debt_id: null, target_date: "2027-12-31", target_pct: null, target_amount: null });
    expect(fieldErrors(parse({ targetDate: "" })).targetDate).toBeTruthy();
  });

  test("title is trimmed, 1 to 120 characters", () => {
    expect(parse({ title: "  Hi  " }).data?.title).toBe("Hi");
    expect(fieldErrors(parse({ title: "   " })).title).toBeTruthy();
    expect(parse({ title: "x".repeat(120) }).success).toBe(true);
    expect(fieldErrors(parse({ title: "x".repeat(121) })).title).toBeTruthy();
  });

  test("kind must be one of the four", () => {
    expect(fieldErrors(parse({ kind: "win_lottery" })).kind).toBeTruthy();
  });

  test("debt_paid_by needs a debt id (a uuid) and a date", () => {
    expect(parse({ kind: "debt_paid_by", debtId: DEBT }).data?.debt_id).toBe(DEBT);
    expect(fieldErrors(parse({ kind: "debt_paid_by", debtId: "" })).debtId).toBeTruthy();
    expect(fieldErrors(parse({ kind: "debt_paid_by", debtId: "1; drop table" })).debtId).toBeTruthy();
    expect(fieldErrors(parse({ kind: "debt_paid_by", debtId: DEBT, targetDate: "" })).targetDate).toBeTruthy();
  });

  test("dates must be real YYYY-MM-DD dates in a sensible range", () => {
    expect(fieldErrors(parse({ targetDate: "2027-02-30" })).targetDate).toBeTruthy();
    expect(fieldErrors(parse({ targetDate: "31/12/2027" })).targetDate).toBeTruthy();
    expect(fieldErrors(parse({ targetDate: "1999-12-31" })).targetDate).toBeTruthy();
    expect(fieldErrors(parse({ targetDate: "2101-01-01" })).targetDate).toBeTruthy();
    expect(parse({ targetDate: "2028-02-29" }).success).toBe(true);
  });

  test("reduce_total_pct: more than 0 and at most 100, up to 2 decimals; date optional", () => {
    const ok = parse({ kind: "reduce_total_pct", targetPct: "50", targetDate: "" });
    expect(ok.data).toEqual({ title: "Become debt-free", kind: "reduce_total_pct", debt_id: null, target_date: null, target_pct: 50, target_amount: null });
    expect(parse({ kind: "reduce_total_pct", targetPct: "12.5" }).data?.target_date).toBe("2027-12-31");
    expect(fieldErrors(parse({ kind: "reduce_total_pct", targetPct: "0" })).targetPct).toBeTruthy();
    expect(fieldErrors(parse({ kind: "reduce_total_pct", targetPct: "100.01" })).targetPct).toBeTruthy();
    expect(fieldErrors(parse({ kind: "reduce_total_pct", targetPct: "" })).targetPct).toBeTruthy();
    expect(fieldErrors(parse({ kind: "reduce_total_pct", targetPct: "1.234" })).targetPct).toBeTruthy();
    expect(fieldErrors(parse({ kind: "reduce_total_pct", targetPct: "abc" })).targetPct).toBeTruthy();
  });

  test("reduce_total_to: 0 or more, commas allowed, up to 2 decimals", () => {
    expect(parse({ kind: "reduce_total_to", targetAmount: "10,000.50" }).data?.target_amount).toBe(10000.5);
    expect(parse({ kind: "reduce_total_to", targetAmount: "0" }).data?.target_amount).toBe(0);
    expect(fieldErrors(parse({ kind: "reduce_total_to", targetAmount: "-1" })).targetAmount).toBeTruthy();
    expect(fieldErrors(parse({ kind: "reduce_total_to", targetAmount: "" })).targetAmount).toBeTruthy();
    expect(fieldErrors(parse({ kind: "reduce_total_to", targetAmount: "1000000000000" })).targetAmount).toBeTruthy();
  });
});
