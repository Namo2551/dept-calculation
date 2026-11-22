import { describe, expect, test } from "vitest";
import { simulate } from "./debt";
import { historyRows, nextStatus, planBadge, planVsActualSeries, sortDebts } from "./debts-view";
import { addMonths, buildLedger, compareToPlan, parseDate, toISODate } from "./ledger";

const debt = { start_balance: 30000, apr: 16, start_date: "2026-01-15" };
const monthly = (n: number, amount: number, first = "2026-01-20") =>
  Array.from({ length: n }, (_, i) => ({ id: "p" + i, paid_on: toISODate(addMonths(parseDate(first), i)), amount }));

describe("planBadge", () => {
  test("no plan when there is no comparison", () => {
    expect(planBadge(null)).toBe("none");
  });
  test("uses the comparison status", () => {
    const ledger = buildLedger(debt, monthly(6, 3000), "2026-07-15");
    const plan = { balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15" };
    expect(planBadge(compareToPlan(ledger, plan))).toBe("ahead");
    expect(planBadge(compareToPlan(buildLedger(debt, monthly(6, 1500), "2026-07-15"), plan))).toBe("on_track");
    expect(planBadge(compareToPlan(buildLedger(debt, monthly(6, 500), "2026-07-15"), plan))).toBe("behind");
  });
});

describe("nextStatus (automatic paid off)", () => {
  test("an active debt whose balance reaches zero becomes paid off", () => {
    expect(nextStatus("active", true)).toBe("paid_off");
  });
  test("a paid-off debt with a balance again (payment edited or deleted) becomes active", () => {
    expect(nextStatus("paid_off", false)).toBe("active");
  });
  test("no change otherwise, and archived debts are left alone", () => {
    expect(nextStatus("active", false)).toBeNull();
    expect(nextStatus("paid_off", true)).toBeNull();
    expect(nextStatus("archived", true)).toBeNull();
    expect(nextStatus("archived", false)).toBeNull();
  });
});

describe("planVsActualSeries", () => {
  const plan = { balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15" };

  test("plan from the debt's start: month 0 is the start balance, then the planned and actual month ends", () => {
    const ledger = buildLedger(debt, monthly(6, 1500), "2026-07-20");
    const s = planVsActualSeries(ledger, 30000, plan);
    const sim = simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 1500 });
    expect(s.planned[0]).toBe(30000);
    expect(s.planned.slice(1)).toEqual(sim.rows.map((r) => r.end).slice(0, s.planned.length - 1));
    expect(s.actual[0]).toBe(30000);
    expect(s.actual.slice(1, 7)).toEqual(ledger.rows.map((r) => r.end));
    expect(s.actual.at(-1)).toBe(ledger.balance); // today's balance last
    expect(s.actual).toHaveLength(8);
    expect(s.todayIndex).toBe(7);
    expect(s.len).toBe(Math.max(12, sim.months!));
  });

  test("a plan that starts later lines up with the ledger month it starts in", () => {
    const ledger = buildLedger(debt, monthly(6, 1500), "2026-07-20");
    const later = { ...plan, balance: ledger.rows[2].end, start_date: "2026-04-15" }; // 3 months in
    const s = planVsActualSeries(ledger, 30000, later);
    expect(s.actual[0]).toBe(ledger.rows[2].end);
    expect(s.actual.slice(1, 4)).toEqual(ledger.rows.slice(3).map((r) => r.end));
    expect(s.actual.at(-1)).toBe(ledger.balance);
    expect(s.planned[0]).toBe(later.balance);
  });

  test("a plan that never pays off is cut to 40 years", () => {
    const ledger = buildLedger(debt, [], "2026-03-01");
    const slow = planVsActualSeries(ledger, 30000, { ...plan, monthly_payment: 400.01 }); // about 800 months
    expect(slow.len).toBe(480);
    expect(slow.planned).toHaveLength(481);
    const stuck = planVsActualSeries(ledger, 30000, { ...plan, monthly_payment: 100 });
    expect(stuck.len).toBeLessThanOrEqual(480);
    expect(stuck.planPaysOff).toBe(false);
    expect(planVsActualSeries(ledger, 30000, plan).planPaysOff).toBe(true);
  });

  test("a plan starting this month: only today's balance on the actual line", () => {
    const ledger = buildLedger(debt, [{ paid_on: "2026-01-20", amount: 1000 }], "2026-01-25");
    const s = planVsActualSeries(ledger, 30000, plan);
    expect(s.actual).toEqual([30000, 29000]);
  });
});

describe("historyRows", () => {
  test("joins each payment with its balance after, in date order, and marks future-dated ones as pending", () => {
    const payments = [
      { id: "b", paid_on: "2026-02-20", amount: 1000, note: null },
      { id: "a", paid_on: "2026-01-20", amount: 2000, note: "first" },
      { id: "c", paid_on: "2026-03-02", amount: 500, note: null },
    ];
    const ledger = buildLedger(debt, payments, "2026-03-01");
    const rows = historyRows(payments, ledger);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows[0].balanceAfter).toBe(28000);
    expect(rows[1].balanceAfter).toBeCloseTo(30000 + 30000 * (0.16 / 12) - 2000 - 1000, 6);
    expect(rows[2].balanceAfter).toBeNull();
    expect(rows[0].note).toBe("first");
  });
});

describe("sortDebts", () => {
  test("active first, then paid off, then archived, keeping the original order inside each group", () => {
    const items = [
      { debt: { id: "1", status: "archived" } },
      { debt: { id: "2", status: "active" } },
      { debt: { id: "3", status: "paid_off" } },
      { debt: { id: "4", status: "active" } },
    ];
    expect(sortDebts(items).map((i) => i.debt.id)).toEqual(["2", "4", "3", "1"]);
  });
});
