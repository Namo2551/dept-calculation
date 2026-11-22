import { describe, expect, test } from "vitest";
import {
  actualMonthEnds,
  addYM,
  debtStatus,
  denseSeries,
  headline,
  monthlyPayments,
  plannedVsActualSeries,
  totalDebtSeries,
  ymOf,
  ymRange,
} from "./dashboard";
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

describe("calendar months", () => {
  test("ymOf, addYM and ymRange", () => {
    expect(ymOf("2026-03-15")).toBe("2026-03");
    expect(addYM("2026-11", 3)).toBe("2027-02");
    expect(addYM("2026-01", -1)).toBe("2025-12");
    expect(ymRange("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(ymRange("2027-01", "2026-12")).toEqual([]);
  });

  test("denseSeries carries the last known value forward and uses a fill value before the first point", () => {
    const points = new Map([["2026-02", 100], ["2026-04", 50]]);
    expect(denseSeries(points, ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"], 0)).toEqual([0, 100, 100, 50, 50]);
  });
});

describe("actualMonthEnds", () => {
  test("start balance in the start month, each ledger row at its end month, today's balance in this month", () => {
    const o = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500), pay("2026-03-16", 1000)], null, "2026-03-20");
    const m = actualMonthEnds(o);
    expect(m.get("2026-01")).toBe(30000);
    expect(m.get("2026-02")).toBeCloseTo(o.ledger.rows[0].end, 6);
    // The row ending 15 Mar is replaced by today's balance (after the 16 Mar payment).
    expect(m.get("2026-03")).toBeCloseTo(o.ledger.balance, 6);
    expect(o.ledger.balance).toBeCloseTo(o.ledger.rows[1].end - 1000, 6);
  });
});

describe("totalDebtSeries", () => {
  test("sums actual month-end balances up to today, then projects forward from today's balance", () => {
    const a = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500)], plan(), "2026-03-15");
    const b = overviewOf(debt({ id: "d2", start_balance: 5000, start_date: "2026-02-01", apr: 0, min_pct: null, min_amount: 1000 }), [], null, "2026-03-15");
    const s = totalDebtSeries([a, b], "2026-03-15");
    expect(s.months[0]).toBe("2026-01");
    expect(s.todayIndex).toBe(2);
    expect(s.actual).toHaveLength(3);
    expect(s.actual[0]).toBe(30000); // b did not exist yet
    expect(s.actual[1]).toBeCloseTo(a.ledger.rows[0].end + 5000, 6);
    expect(s.actual[2]).toBeCloseTo(a.ledger.balance + b.ledger.balance, 6);
    // Projection starts at today's total and reaches 0 at the latest payoff.
    expect(s.projected[0]).toBeCloseTo(s.actual[2], 6);
    expect(s.projected.at(-1)).toBeCloseTo(0, 2);
    expect(s.months).toHaveLength(s.todayIndex + s.projected.length);
    expect(s.complete).toBe(true);
    expect(s.projected.length - 1).toBe(Math.max(a.projection!.months, b.projection!.months));
  });

  test("leaves out archived debts; marks the series incomplete when a debt never pays off", () => {
    const stuck = overviewOf(debt({ min_pct: null, min_amount: 100 }), [], null, "2026-02-15");
    const archived = overviewOf(debt({ id: "x", status: "archived", start_balance: 999999 }), [], null, "2026-02-15");
    const s = totalDebtSeries([stuck, archived], "2026-02-15", 24);
    expect(s.complete).toBe(false);
    expect(s.projected).toHaveLength(25); // capped at 24 months ahead
    expect(s.actual[0]).toBe(30000);
    expect(s.projected[24]).toBeGreaterThan(30000);
  });

  test("no debts gives an empty series", () => {
    const s = totalDebtSeries([], "2026-02-15");
    expect(s.months).toEqual([]);
    expect(s.actual).toEqual([]);
  });
});

describe("plannedVsActualSeries", () => {
  test("null without any plan", () => {
    expect(plannedVsActualSeries([overviewOf(debt(), [], null, "2026-03-15")], "2026-03-15")).toBeNull();
  });

  test("planned balances from the schedule versus actual balances, only for debts with a plan", () => {
    const a = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1000)], plan(), "2026-03-15");
    const b = overviewOf(debt({ id: "d2", start_balance: 5000 }), [], null, "2026-03-15");
    const s = plannedVsActualSeries([a, b], "2026-03-15")!;
    expect(s.months[0]).toBe("2026-01");
    expect(s.planned[0]).toBe(30000);
    expect(s.planned[1]).toBeCloseTo(30000 * (1 + 0.16 / 12) - 1500, 6);
    expect(s.planned.at(-1)).toBeCloseTo(0, 2);
    expect(s.actual).toHaveLength(s.todayIndex + 1);
    expect(s.actual[1]).toBeCloseTo(a.ledger.rows[0].end, 6); // b is not included
    expect(s.actual[2]).toBeGreaterThan(s.planned[2]); // paid less than planned in February
  });
});

describe("monthlyPayments", () => {
  test("last 12 calendar months: paid per month and the planned (or minimum) payment", () => {
    const a = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1000), pay("2026-02-25", 200), pay("2026-03-05", 700)], plan(), "2026-03-10");
    const rows = monthlyPayments([a], "2026-03-10");
    expect(rows).toHaveLength(12);
    expect(rows.at(-1)!.ym).toBe("2026-03");
    expect(rows[0].ym).toBe("2025-04");
    expect(rows.at(-1)!.paid).toBe(700);
    expect(rows.at(-2)!.paid).toBe(1200);
    expect(rows.at(-3)).toEqual({ ym: "2026-01", paid: 1500, planned: 1500 });
    expect(rows.at(-1)!.planned).toBe(1500);
    expect(rows[0]).toEqual({ ym: "2025-04", paid: 0, planned: 0 }); // before the debt existed
  });

  test("without a plan the planned amount is the minimum due on the balance when that month's billing month starts", () => {
    const o = overviewOf(debt(), [pay("2026-01-20", 10000)], null, "2026-02-20");
    const rows = monthlyPayments([o], "2026-02-20", 2);
    expect(rows[0]).toEqual({ ym: "2026-01", paid: 10000, planned: 1500 });
    // February's billing month starts on 15 Feb, from the balance the January month ended with.
    expect(rows[1].planned).toBeCloseTo(0.05 * o.ledger.rows[0].end, 6);
  });

  test("ignores future-dated payments and archived debts; paid-off debts plan nothing", () => {
    const a = overviewOf(debt(), [pay("2026-01-20", 40000), pay("2026-04-01", 999)], null, "2026-03-10");
    const archived = overviewOf(debt({ id: "x", status: "archived" }), [pay("2026-03-01", 50, "x")], null, "2026-03-10");
    const rows = monthlyPayments([a, archived], "2026-03-10", 3);
    expect(rows.map((r) => r.paid)).toEqual([40000, 0, 0]);
    expect(rows[2].planned).toBe(0);
  });
});

describe("debtStatus and headline", () => {
  test("status badge per debt", () => {
    expect(debtStatus(overviewOf(debt(), [], null, "2026-03-15"))).toBe("no_plan");
    expect(debtStatus(overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500)], plan(), "2026-03-15"))).toBe("on_track");
    expect(debtStatus(overviewOf(debt(), [pay("2026-01-20", 5000)], plan(), "2026-03-15"))).toBe("ahead");
    expect(debtStatus(overviewOf(debt(), [], plan(), "2026-03-15"))).toBe("behind");
    expect(debtStatus(overviewOf(debt(), [pay("2026-01-20", 31000)], plan(), "2026-02-15"))).toBe("paid_off");
  });

  test("headline: empty, paid off, never, or months and date", () => {
    expect(headline([])).toEqual({ kind: "empty" });
    expect(headline([overviewOf(debt(), [pay("2026-01-20", 31000)], null, "2026-02-15")])).toEqual({ kind: "paid_off" });
    const stuck = overviewOf(debt({ name: "Stuck", min_pct: null, min_amount: 100 }), [], null, "2026-02-15");
    expect(headline([stuck])).toEqual({ kind: "never", names: ["Stuck"] });
    const a = overviewOf(debt(), [], plan(), "2026-01-20");
    const h = headline([a]);
    expect(h).toEqual({ kind: "date", months: a.projection!.months, iso: a.projection!.debtFreeISO });
  });
});
