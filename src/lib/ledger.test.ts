import { describe, expect, test } from "vitest";
import { simulate } from "./debt";
import { addMonths, buildLedger, compareToPlan, monthIndex, parseDate, projectFrom, toISODate } from "./ledger";

const debt = { start_balance: 30000, apr: 16, start_date: "2026-01-15" };

describe("dates", () => {
  test("month index counts whole months from the start date (month 1 = the first month)", () => {
    expect(monthIndex("2026-01-15", "2026-01-15")).toBe(1);
    expect(monthIndex("2026-01-15", "2026-02-14")).toBe(1);
    expect(monthIndex("2026-01-15", "2026-02-15")).toBe(2);
    expect(monthIndex("2026-01-31", "2026-02-27")).toBe(1);
    expect(monthIndex("2026-01-31", "2026-02-28")).toBe(2); // Jan 31 + 1 month = Feb 28 (clamped), as in addMonths
    expect(monthIndex("2026-01-15", "2027-01-15")).toBe(13);
    expect(monthIndex("2026-01-15", "2025-12-31")).toBe(1); // before the start counts as month 1
  });
  test("addMonths keeps the day when it can and clamps at month ends", () => {
    expect(toISODate(addMonths(parseDate("2026-01-31"), 1))).toBe("2026-02-28");
    expect(toISODate(addMonths(parseDate("2026-11-15"), 2))).toBe("2027-01-15");
  });
});

describe("buildLedger (actual balances)", () => {
  test("with payments equal to the plan, the actual months match the calculator's recurrence", () => {
    const pays = Array.from({ length: 6 }, (_, i) => ({ paid_on: toISODate(addMonths(parseDate("2026-01-20"), i)), amount: 1500 }));
    const l = buildLedger(debt, pays, "2026-07-15"); // 6 whole months done
    const sim = simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 1500 });
    expect(l.rows).toHaveLength(6);
    l.rows.forEach((row, i) => expect(row.end).toBeCloseTo(sim.rows[i].end, 6));
    expect(l.balance).toBeCloseTo(sim.rows[5].end, 6);
    expect(l.totalPaid).toBe(9000);
    expect(l.interestCharged).toBeCloseTo(sim.rows.slice(0, 6).reduce((a, r) => a + r.interest, 0), 6);
  });

  test("payments in the current, unfinished month lower the balance before interest is charged", () => {
    const l = buildLedger(debt, [{ paid_on: "2026-01-20", amount: 1000 }], "2026-01-25");
    expect(l.rows).toHaveLength(0);
    expect(l.balance).toBe(29000);
    expect(l.currentMonthPaid).toBe(1000);
  });

  test("several payments in one month add up; history is in date order with the balance after each", () => {
    const l = buildLedger(
      debt,
      [
        { paid_on: "2026-02-01", amount: 500 },
        { paid_on: "2026-01-20", amount: 1000 },
      ],
      "2026-02-20",
    );
    expect(l.rows[0].paid).toBe(1500);
    expect(l.history.map((h) => h.paid_on)).toEqual(["2026-01-20", "2026-02-01"]);
    expect(l.history[0].balanceAfter).toBe(29000);
    expect(l.history[1].balanceAfter).toBe(28500);
  });

  test("overpaying clears the debt and never goes below zero", () => {
    const l = buildLedger(debt, [{ paid_on: "2026-01-20", amount: 40000 }], "2026-03-20");
    expect(l.balance).toBe(0);
    expect(l.paidOff).toBe(true);
    expect(l.rows.every((r) => r.end >= 0)).toBe(true);
  });

  test("paying only the balance mid-month is not paid off: this month's interest is still due", () => {
    const d = { start_balance: 10000, apr: 18, start_date: "2026-11-01" };
    const short = buildLedger(d, [{ paid_on: "2026-11-10", amount: 10000 }], "2026-11-15");
    expect(short.paidOff).toBe(false);
    expect(short.payoffAmount).toBeCloseTo(150, 6); // 10,000 x 18% / 12 still owed for November
    const full = buildLedger(d, [{ paid_on: "2026-11-10", amount: 10150 }], "2026-11-15");
    expect(full.paidOff).toBe(true);
    expect(full.payoffAmount).toBe(0);
    // a month later the short payment really leaves the interest outstanding
    expect(buildLedger(d, [{ paid_on: "2026-11-10", amount: 10000 }], "2026-12-05").balance).toBeCloseTo(150, 6);
  });

  test("no payments: interest keeps adding month after month", () => {
    const l = buildLedger(debt, [], "2026-03-15");
    expect(l.rows).toHaveLength(2);
    expect(l.balance).toBeCloseTo(30000 * (1 + 16 / 1200) ** 2, 6);
  });
});

describe("compareToPlan", () => {
  const plan = { balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15" };
  test("paying more than planned is ahead; less is behind; same is on track", () => {
    const onTrack = buildLedger(debt, [{ paid_on: "2026-01-20", amount: 1500 }, { paid_on: "2026-02-20", amount: 1500 }], "2026-03-15");
    expect(compareToPlan(onTrack, plan).status).toBe("on_track");
    const ahead = buildLedger(debt, [{ paid_on: "2026-01-20", amount: 5000 }], "2026-03-15");
    const a = compareToPlan(ahead, plan);
    expect(a.status).toBe("ahead");
    expect(a.difference).toBeLessThan(0); // actual below planned
    const behind = buildLedger(debt, [], "2026-03-15");
    expect(compareToPlan(behind, plan).status).toBe("behind");
  });
  test("reports the planned balance for the same month", () => {
    const l = buildLedger(debt, [], "2026-03-15");
    const c = compareToPlan(l, plan);
    const sim = simulate({ balance: 30000, apr: 16, strategy: "fixed", p: 1500 });
    expect(c.plannedBalance).toBeCloseTo(sim.rows[1].end, 6);
  });
});

describe("projectFrom", () => {
  test("projects months, remaining interest and the debt-free month from today's balance", () => {
    const p = projectFrom(30000, 16, 1500, "2026-01-15")!;
    expect(p.months).toBe(24);
    expect(p.remainingInterest).toBeCloseTo(5126.95, 2);
    expect(p.debtFreeISO).toBe("2028-01-15");
  });
  test("a payment that doesn't beat the interest has no projection", () => {
    expect(projectFrom(30000, 16, 400, "2026-01-15")).toBeNull();
  });
  test("an empty balance is already debt-free", () => {
    expect(projectFrom(0, 16, 1500, "2026-01-15")).toEqual({ months: 0, remainingInterest: 0, debtFreeISO: "2026-01-15" });
  });
});
