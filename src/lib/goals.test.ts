import { describe, expect, test } from "vitest";
import { requiredPayment } from "./debt";
import {
  achievedAtChange,
  evaluateGoal,
  goalProgress,
  goalScope,
  goalTarget,
  monthsUntil,
  projectedReachISO,
  reduceByPctTarget,
  requiredForDate,
  type GoalLike,
} from "./goals";
import { overviewOf } from "./overview";
import type { DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "./supabase/database.types";

const ts = { created_at: "", updated_at: "" };
const debt = (over: Partial<DebtRow> = {}): DebtRow => ({
  id: "d1", user_id: "u", name: "Card A", kind: "credit_card", start_balance: 30000, start_date: "2026-01-15", apr: 16,
  min_pct: 5, min_amount: 500, due_day: 20, currency: "THB", status: "active", ...ts, ...over,
});
const pay = (paid_on: string, amount: number, debt_id = "d1"): PaymentRecordRow => ({ id: debt_id + paid_on, user_id: "u", debt_id, paid_on, amount, note: null, ...ts });
const plan = (over: Partial<RepaymentScheduleRow> = {}): RepaymentScheduleRow => ({
  id: "s", user_id: "u", debt_id: "d1", source_plan_id: null, balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15", is_active: true, ...ts, ...over,
});
const goal = (over: Partial<GoalLike>): GoalLike => ({ kind: "debt_free_by", debt_id: null, target_date: null, target_pct: null, target_amount: null, achieved_at: null, ...over });

const AS_OF = "2026-03-15";
const a = () => overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500)], plan(), AS_OF);
const b = () => overviewOf(debt({ id: "d2", name: "Loan B", start_balance: 10000, apr: 0, min_pct: null, min_amount: 1000 }), [], null, AS_OF);

describe("small helpers", () => {
  test("reduce-by-% target amount", () => {
    expect(reduceByPctTarget(40000, 50)).toBe(20000);
    expect(reduceByPctTarget(40000, 100)).toBe(0);
    expect(reduceByPctTarget(30000, 12.5)).toBe(26250);
  });

  test("progress = (start - current) / (start - target), clamped to 0..1", () => {
    expect(goalProgress(40000, 30000, 20000)).toBe(0.5);
    expect(goalProgress(40000, 30000, 0)).toBe(0.25);
    expect(goalProgress(40000, 45000, 0)).toBe(0);
    expect(goalProgress(40000, 10000, 20000)).toBe(1);
    // Target at or above the start: reached only once the balance is at or below it.
    expect(goalProgress(10000, 9000, 15000)).toBe(1);
    expect(goalProgress(0, 0, 0)).toBe(1);
  });

  test("monthsUntil counts whole months between two dates", () => {
    expect(monthsUntil("2026-11-22", "2027-05-22")).toBe(6);
    expect(monthsUntil("2026-11-22", "2027-05-21")).toBe(5);
    expect(monthsUntil("2026-11-22", "2026-11-30")).toBe(0);
    expect(monthsUntil("2026-11-22", "2026-10-01")).toBeLessThan(0);
  });

  test("goal scope: one debt for debt_paid_by, all non-archived debts otherwise", () => {
    const archived = overviewOf(debt({ id: "x", status: "archived" }), [], null, AS_OF);
    const items = [a(), b(), archived];
    expect(goalScope(goal({ kind: "debt_paid_by", debt_id: "d2" }), items).map((i) => i.debt.id)).toEqual(["d2"]);
    expect(goalScope(goal({ kind: "reduce_total_pct", target_pct: 50 }), items).map((i) => i.debt.id)).toEqual(["d1", "d2"]);
  });

  test("goal target per kind", () => {
    expect(goalTarget(goal({ kind: "debt_free_by" }), 40000)).toBe(0);
    expect(goalTarget(goal({ kind: "debt_paid_by", debt_id: "d1" }), 40000)).toBe(0);
    expect(goalTarget(goal({ kind: "reduce_total_pct", target_pct: 25 }), 40000)).toBe(30000);
    expect(goalTarget(goal({ kind: "reduce_total_to", target_amount: 5000 }), 40000)).toBe(5000);
  });
});

describe("requiredForDate", () => {
  test("per debt requiredPayment on today's balance and APR, summed", () => {
    const items = [a(), b()];
    const r = requiredForDate(items, AS_OF, "2026-09-15")!;
    expect(r.months).toBe(6);
    expect(r.perDebt).toHaveLength(2);
    expect(r.perDebt[0].amount).toBeCloseTo(requiredPayment(items[0].ledger.balance, 16, 6).exact, 6);
    expect(r.perDebt[1].amount).toBeCloseTo(10000 / 6, 6);
    expect(r.total).toBeCloseTo(r.perDebt[0].amount + r.perDebt[1].amount, 6);
  });

  test("null when the date is less than a month away or past; paid-off debts need nothing", () => {
    expect(requiredForDate([a()], AS_OF, "2026-04-01")).toBeNull();
    const paid = overviewOf(debt(), [pay("2026-01-20", 31000)], null, AS_OF);
    expect(requiredForDate([paid], AS_OF, "2027-01-01")!.total).toBe(0);
  });
});

describe("projectedReachISO", () => {
  test("the month the summed projected balance reaches the target", () => {
    // Loan B: 10,000 at 0% paying its 1,000 minimum: 0 after 10 months, 5,000 after 5.
    expect(projectedReachISO([b()], 0, AS_OF)).toBe("2027-01-15");
    expect(projectedReachISO([b()], 5000, AS_OF)).toBe("2026-08-15");
    expect(projectedReachISO([b()], 20000, AS_OF)).toBe(AS_OF);
  });

  test("null when the balance never gets there", () => {
    const stuck = overviewOf(debt({ min_pct: null, min_amount: 100 }), [], null, AS_OF);
    expect(projectedReachISO([stuck], 0, AS_OF)).toBeNull();
  });
});

describe("evaluateGoal", () => {
  test("debt-free by a date: on track when the projected date is on or before the target", () => {
    const items = [a(), b()];
    const latest = [items[0].projection!.debtFreeISO, items[1].projection!.debtFreeISO].sort().at(-1)!;
    const onTrack = evaluateGoal(goal({ kind: "debt_free_by", target_date: latest }), items, AS_OF);
    expect(onTrack.status).toBe("on_track");
    expect(onTrack.projectedISO).toBe(latest);
    expect(onTrack.start).toBe(40000);
    expect(onTrack.current).toBeCloseTo(items[0].ledger.balance + 10000, 6);
    expect(onTrack.progress).toBeCloseTo((40000 - onTrack.current) / 40000, 6);
    expect(onTrack.currentBasis).toBeCloseTo(1500 + 1000, 6);
    expect(onTrack.required).not.toBeNull();

    const behind = evaluateGoal(goal({ kind: "debt_free_by", target_date: "2026-12-31" }), items, AS_OF);
    expect(behind.status).toBe("behind");
    expect(behind.required!.total).toBeGreaterThan(behind.currentBasis);
  });

  test("pay off one debt by a date", () => {
    const e = evaluateGoal(goal({ kind: "debt_paid_by", debt_id: "d2", target_date: "2027-03-15" }), [a(), b()], AS_OF);
    expect(e.start).toBe(10000);
    expect(e.status).toBe("on_track");
    expect(e.required!.total).toBeCloseTo(10000 / 12, 6);
  });

  test("reduce by % with no date: on track if the projection ever reaches the target; achieved once reached", () => {
    const e = evaluateGoal(goal({ kind: "reduce_total_pct", target_pct: 50 }), [b()], AS_OF);
    expect(e.target).toBe(5000);
    expect(e.status).toBe("on_track");
    expect(e.required).toBeNull();
    const paid = overviewOf(debt({ id: "d2", start_balance: 10000, apr: 0 }), [pay("2026-02-01", 6000, "d2")], null, AS_OF);
    const done = evaluateGoal(goal({ kind: "reduce_total_pct", target_pct: 50 }), [paid], AS_OF);
    expect(done.status).toBe("achieved");
    expect(done.progress).toBe(1);
  });

  test("reduce to an amount with a date uses the same on-track rule", () => {
    const e = evaluateGoal(goal({ kind: "reduce_total_to", target_amount: 5000, target_date: "2026-07-01" }), [b()], AS_OF);
    expect(e.projectedISO).toBe("2026-08-15");
    expect(e.status).toBe("behind");
  });

  test("no debts in scope", () => {
    expect(evaluateGoal(goal({ kind: "debt_free_by", target_date: "2027-12-31" }), [], AS_OF).status).toBe("no_debts");
    expect(evaluateGoal(goal({ kind: "debt_paid_by", debt_id: "gone", target_date: "2027-12-31" }), [b()], AS_OF).status).toBe("no_debts");
  });
});

describe("achievedAtChange", () => {
  test("sets the date when first reached, clears it when no longer reached, otherwise no change", () => {
    expect(achievedAtChange(null, true, "2026-03-15T00:00:00Z")).toBe("2026-03-15T00:00:00Z");
    expect(achievedAtChange("2026-01-01T00:00:00Z", true, "2026-03-15T00:00:00Z")).toBeUndefined();
    expect(achievedAtChange("2026-01-01T00:00:00Z", false, "2026-03-15T00:00:00Z")).toBeNull();
    expect(achievedAtChange(null, false, "2026-03-15T00:00:00Z")).toBeUndefined();
  });
});
