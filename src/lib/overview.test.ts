import { describe, expect, test } from "vitest";
import { minimumDue, overviewOf, totalsOf } from "./overview";
import type { DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "./supabase/database.types";

const ts = { created_at: "", updated_at: "" };
const debt = (over: Partial<DebtRow> = {}): DebtRow => ({
  id: "d1", user_id: "u", name: "Card A", kind: "credit_card", start_balance: 30000, start_date: "2026-01-15", apr: 16,
  min_pct: 5, min_amount: 500, due_day: 20, currency: "THB", status: "active", ...ts, ...over,
});
const pay = (paid_on: string, amount: number): PaymentRecordRow => ({ id: paid_on, user_id: "u", debt_id: "d1", paid_on, amount, note: null, ...ts });
const schedule: RepaymentScheduleRow = { id: "s", user_id: "u", debt_id: "d1", source_plan_id: null, balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15", is_active: true, ...ts };

describe("minimumDue", () => {
  test("is the larger of the % and the fixed minimum, never above the balance", () => {
    expect(minimumDue({ min_pct: 5, min_amount: 500 }, 30000)).toBe(1500);
    expect(minimumDue({ min_pct: 5, min_amount: 500 }, 4000)).toBe(500);
    expect(minimumDue({ min_pct: 5, min_amount: 500 }, 300)).toBe(300);
    expect(minimumDue({ min_pct: null, min_amount: 0 }, 300)).toBe(0);
  });
});

describe("overviewOf", () => {
  test("with a plan: compares and projects with the plan's payment", () => {
    const o = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500)], schedule, "2026-03-15");
    expect(o.basisSource).toBe("plan");
    expect(o.comparison?.status).toBe("on_track");
    expect(o.projection?.months).toBe(22);
  });
  test("without a plan: uses recent payments, then the minimum", () => {
    expect(overviewOf(debt(), [pay("2026-01-20", 2000)], null, "2026-03-15").basisSource).toBe("recent");
    const none = overviewOf(debt(), [], null, "2026-01-20");
    expect(none.basisSource).toBe("minimum");
    expect(none.monthlyBasis).toBe(1500);
    expect(none.comparison).toBeNull();
  });
});

describe("totalsOf", () => {
  test("adds up active debts and takes the latest payoff date", () => {
    const a = overviewOf(debt(), [pay("2026-01-20", 1500)], schedule, "2026-02-15");
    const b = overviewOf(debt({ id: "d2", start_balance: 5000, min_pct: null, min_amount: 1000 }), [], null, "2026-02-15");
    const t = totalsOf([a, b]);
    expect(t.startTotal).toBe(35000);
    expect(t.outstanding).toBeCloseTo(a.ledger.balance + b.ledger.balance, 6);
    expect(t.paid).toBe(1500);
    expect(t.debtFreeISO).toBe([a.projection!.debtFreeISO, b.projection!.debtFreeISO].sort().at(-1));
    expect(t.progress).toBeGreaterThan(0);
  });
  test("archived debts are left out; a debt that never ends gives no debt-free date", () => {
    const stuck = overviewOf(debt({ min_pct: null, min_amount: 100 }), [], null, "2026-02-15");
    expect(totalsOf([stuck]).debtFreeISO).toBeNull();
    expect(totalsOf([stuck]).remainingInterest).toBeNull();
    const archived = overviewOf(debt({ status: "archived" }), [], null, "2026-02-15");
    expect(totalsOf([archived]).startTotal).toBe(0);
  });
});
