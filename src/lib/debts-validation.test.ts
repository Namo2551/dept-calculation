import { describe, expect, test } from "vitest";
import { addDaysISO, debtSchema, fieldErrors, paymentSchemaFor, scheduleSchema, statusSchema } from "./debts-validation";

const goodDebt = {
  name: "Visa card",
  kind: "credit_card",
  start_balance: "30,000",
  start_date: "2026-01-15",
  apr: "16",
  min_pct: "5",
  min_amount: "500",
  due_day: "25",
  currency: "THB",
};

describe("debtSchema", () => {
  test("accepts a full debt and turns form strings into numbers", () => {
    const r = debtSchema.safeParse(goodDebt);
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      name: "Visa card",
      kind: "credit_card",
      start_balance: 30000,
      start_date: "2026-01-15",
      apr: 16,
      min_pct: 5,
      min_amount: 500,
      due_day: 25,
      currency: "THB",
    });
  });

  test("optional fields: empty minimum % and due day become null, empty minimum amount becomes 0", () => {
    const r = debtSchema.safeParse({ ...goodDebt, min_pct: "", due_day: "", min_amount: "" });
    expect(r.success).toBe(true);
    expect(r.data?.min_pct).toBeNull();
    expect(r.data?.due_day).toBeNull();
    expect(r.data?.min_amount).toBe(0);
  });

  test("trims the name and rejects empty or over 80 characters", () => {
    expect(debtSchema.safeParse({ ...goodDebt, name: "  Car loan  " }).data?.name).toBe("Car loan");
    expect(fieldErrors(debtSchema.safeParse({ ...goodDebt, name: "   " }))).toHaveProperty("name");
    expect(fieldErrors(debtSchema.safeParse({ ...goodDebt, name: "x".repeat(81) }))).toHaveProperty("name");
    expect(debtSchema.safeParse({ ...goodDebt, name: "x".repeat(80) }).success).toBe(true);
  });

  test("matches the database checks on numbers", () => {
    const err = (patch: Record<string, string>) => fieldErrors(debtSchema.safeParse({ ...goodDebt, ...patch }));
    expect(err({ start_balance: "0" })).toHaveProperty("start_balance");
    expect(err({ start_balance: "abc" })).toHaveProperty("start_balance");
    expect(err({ start_balance: "" })).toHaveProperty("start_balance");
    expect(err({ apr: "-1" })).toHaveProperty("apr");
    expect(err({ apr: "100.5" })).toHaveProperty("apr");
    expect(err({ apr: "0" })).toEqual({});
    expect(err({ min_pct: "0" })).toHaveProperty("min_pct"); // DB: min_pct > 0 when set
    expect(err({ min_pct: "101" })).toHaveProperty("min_pct");
    expect(err({ min_amount: "-5" })).toHaveProperty("min_amount");
    expect(err({ due_day: "0" })).toHaveProperty("due_day");
    expect(err({ due_day: "32" })).toHaveProperty("due_day");
    expect(err({ due_day: "2.5" })).toHaveProperty("due_day");
  });

  test("checks the kind, currency and date format", () => {
    const err = (patch: Record<string, string>) => fieldErrors(debtSchema.safeParse({ ...goodDebt, ...patch }));
    expect(err({ kind: "mortgage" })).toHaveProperty("kind");
    expect(err({ currency: "USD" })).toHaveProperty("currency");
    expect(err({ start_date: "15/01/2026" })).toHaveProperty("start_date");
    expect(err({ start_date: "2026-02-30" })).toHaveProperty("start_date");
    expect(err({ start_date: "1999-12-31" })).toHaveProperty("start_date");
  });
});

describe("paymentSchemaFor", () => {
  const schema = paymentSchemaFor({ startDate: "2026-01-15", today: "2026-11-22" });

  test("accepts a payment and makes an empty note null", () => {
    const r = schema.safeParse({ paid_on: "2026-11-22", amount: "1,500.50", note: "  " });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ paid_on: "2026-11-22", amount: 1500.5, note: null });
  });

  test("rejects dates before the debt started with a friendly message", () => {
    const e = fieldErrors(schema.safeParse({ paid_on: "2026-01-14", amount: "100", note: "" }));
    expect(e.paid_on).toMatch(/15 Jan 2026/);
    expect(schema.safeParse({ paid_on: "2026-01-15", amount: "100", note: "" }).success).toBe(true);
  });

  test("allows tomorrow (time zones) but not later", () => {
    expect(schema.safeParse({ paid_on: "2026-11-23", amount: "100", note: "" }).success).toBe(true);
    const e = fieldErrors(schema.safeParse({ paid_on: "2026-11-24", amount: "100", note: "" }));
    expect(e.paid_on).toMatch(/future/i);
  });

  test("rejects zero, negative and too-large amounts, and long notes", () => {
    expect(fieldErrors(schema.safeParse({ paid_on: "2026-11-01", amount: "0", note: "" }))).toHaveProperty("amount");
    expect(fieldErrors(schema.safeParse({ paid_on: "2026-11-01", amount: "-3", note: "" }))).toHaveProperty("amount");
    expect(fieldErrors(schema.safeParse({ paid_on: "2026-11-01", amount: "1000000000000", note: "" }))).toHaveProperty("amount");
    expect(fieldErrors(schema.safeParse({ paid_on: "2026-11-01", amount: "10", note: "x".repeat(501) }))).toHaveProperty("note");
    expect(schema.safeParse({ paid_on: "2026-11-01", amount: "10", note: "x".repeat(500) }).success).toBe(true);
  });

  test("rejects a malformed date", () => {
    expect(fieldErrors(schema.safeParse({ paid_on: "yesterday", amount: "10", note: "" }))).toHaveProperty("paid_on");
  });
});

describe("scheduleSchema", () => {
  test("from a saved plan needs a plan id", () => {
    const id = "6f1c2b9e-0d3a-4c1e-9a7b-2e5f8d4c3b21";
    expect(scheduleSchema.safeParse({ mode: "plan", plan_id: id }).data).toEqual({ mode: "plan", plan_id: id });
    expect(fieldErrors(scheduleSchema.safeParse({ mode: "plan", plan_id: "" }))).toHaveProperty("plan_id");
  });
  test("a custom monthly payment must be above zero", () => {
    expect(scheduleSchema.safeParse({ mode: "payment", monthly_payment: "2,000" }).data).toEqual({ mode: "payment", monthly_payment: 2000 });
    expect(fieldErrors(scheduleSchema.safeParse({ mode: "payment", monthly_payment: "0" }))).toHaveProperty("monthly_payment");
  });
});

describe("statusSchema and dates", () => {
  test("only the three statuses", () => {
    expect(statusSchema.safeParse("archived").success).toBe(true);
    expect(statusSchema.safeParse("deleted").success).toBe(false);
  });
  test("addDaysISO crosses months and years", () => {
    expect(addDaysISO("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
  });
});
