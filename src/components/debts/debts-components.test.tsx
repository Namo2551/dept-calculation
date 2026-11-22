import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { buildLedger } from "@/lib/ledger";
import { overviewOf } from "@/lib/overview";
import type { DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "@/lib/supabase/database.types";

vi.mock("@/app/(app)/debts/actions", () => {
  const noop = vi.fn(async () => ({}));
  return { createDebt: noop, updateDebt: noop, setDebtStatus: noop, deleteDebt: noop, addPayment: noop, updatePayment: noop, deletePayment: noop, startSchedule: noop };
});
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const { ConfirmSubmit } = await import("./ConfirmSubmit");
const { DebtCard } = await import("./DebtCard");
const { DebtForm, newDebtDefaults, formKey } = await import("./DebtForm");
const { DebtManage } = await import("./DebtManage");
const { PaymentHistory } = await import("./PaymentHistory");
const { PlanVsActual } = await import("./PlanVsActual");
const { StartTrackingForm } = await import("./StartTrackingForm");
const { DebtSummary } = await import("./DebtSummary");

const ts = { created_at: "", updated_at: "" };
const debt: DebtRow = {
  id: "d1",
  user_id: "u1",
  name: "Visa card",
  kind: "credit_card",
  start_balance: 30000,
  start_date: "2026-01-15",
  apr: 16,
  min_pct: 5,
  min_amount: 500,
  due_day: 25,
  currency: "THB",
  status: "active",
  ...ts,
};
const pay = (id: string, paid_on: string, amount: number): PaymentRecordRow => ({ id, user_id: "u1", debt_id: "d1", paid_on, amount, note: null, ...ts });
const schedule: RepaymentScheduleRow = { id: "s1", user_id: "u1", debt_id: "d1", source_plan_id: null, balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15", is_active: true, ...ts };

describe("ConfirmSubmit", () => {
  test("needs a second click: the first shows the warning and the real submit", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <ConfirmSubmit label="Delete debt" confirmLabel="Yes, delete it" cancelLabel="Cancel" warning="Payments go too." />
      </form>,
    );
    expect(screen.queryByRole("button", { name: "Yes, delete it" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete debt" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Payments go too.");
    expect(screen.getByRole("button", { name: "Yes, delete it" })).toHaveAttribute("type", "submit");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Delete debt" })).toBeInTheDocument();
  });
});

describe("DebtForm", () => {
  test("new debts default to today, a credit card and the 5% or 500 baht minimum", () => {
    render(<DebtForm mode="add" initial={newDebtDefaults("2026-11-22")} />);
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-11-22");
    expect(screen.getByLabelText("Type")).toHaveValue("credit_card");
    expect(screen.getByLabelText("Minimum payment (% of balance)")).toHaveValue("5");
    expect(screen.getByLabelText("Minimum payment amount (baht)")).toHaveValue("500");
    expect(screen.getByRole("button", { name: "Add debt" })).toBeInTheDocument();
  });
  test("formKey changes after every result so the fields remount", () => {
    expect(formKey(undefined)).toBe("initial");
    expect(formKey({ values: { a: "1" } })).not.toBe(formKey({ values: { a: "2" } }));
    expect(formKey({ done: 1 })).not.toBe(formKey({ done: 2 }));
  });
});

describe("DebtCard and DebtSummary", () => {
  test("the card shows the ledger balance, minimum due, due day and plan badge", () => {
    const o = overviewOf(debt, [pay("p1", "2026-01-20", 2000)], schedule, "2026-01-25");
    render(<DebtCard o={o} />);
    expect(screen.getByRole("link", { name: "Visa card" })).toHaveAttribute("href", "/debts/d1");
    expect(screen.getByText("28,000.00 baht")).toBeInTheDocument();
    expect(screen.getByText("1,400.00 baht")).toBeInTheDocument(); // 5% of 28,000
    expect(screen.getByText("Day 25 of the month")).toBeInTheDocument();
    expect(screen.getByText(/Ahead of plan/)).toBeInTheDocument();
  });
  test("a debt without a plan says no plan, and the summary names the minimum as its basis", () => {
    const o = overviewOf(debt, [], null, "2026-01-25");
    render(
      <>
        <DebtCard o={o} />
        <DebtSummary o={o} />
      </>,
    );
    expect(screen.getByText(/No plan/)).toBeInTheDocument();
    expect(screen.getByText(/Based on the minimum of 1,500.00 baht a month/)).toBeInTheDocument();
  });
});

describe("PaymentHistory", () => {
  test("lists payments with the balance after each, and a future-dated one as pending", () => {
    const payments = [pay("p1", "2026-01-20", 2000), pay("p2", "2026-02-02", 1000)];
    const ledger = buildLedger(debt, payments, "2026-02-01");
    const rows = [
      { id: "p1", paid_on: "2026-01-20", amount: 2000, note: "first", balanceAfter: ledger.history[0].balanceAfter },
      { id: "p2", paid_on: "2026-02-02", amount: 1000, note: null, balanceAfter: null },
    ];
    render(<PaymentHistory rows={rows} debtId="d1" startDate="2026-01-15" today="2026-02-01" currency="THB" />);
    const table = screen.getByRole("table");
    const [, r1, r2] = within(table).getAllByRole("row");
    expect(r1).toHaveTextContent("20 Jan 2026");
    expect(r1).toHaveTextContent("28,000.00 baht");
    expect(r1).toHaveTextContent("first");
    expect(r2).toHaveTextContent("Counts from 2 Feb 2026");
    expect(within(table).getAllByRole("columnheader").map((h) => h.getAttribute("scope"))).toEqual(["col", "col", "col", "col", "col"]);
  });
  test("edit opens a form filled with the payment", async () => {
    const user = userEvent.setup();
    render(<PaymentHistory rows={[{ id: "p1", paid_on: "2026-01-20", amount: 2000, note: "x", balanceAfter: 28000 }]} debtId="d1" startDate="2026-01-15" today="2026-02-01" currency="THB" />);
    await user.click(screen.getByRole("button", { name: /Edit/ }));
    const form = screen.getByRole("form", { name: "Edit payment of 20 Jan 2026" });
    expect(within(form).getByLabelText("Amount (baht)")).toHaveValue("2000");
    expect(within(form).getByLabelText("Date paid")).toHaveValue("2026-01-20");
  });
  test("empty history says so", () => {
    render(<PaymentHistory rows={[]} debtId="d1" startDate="2026-01-15" today="2026-02-01" currency="THB" />);
    expect(screen.getByText("No payments recorded yet.")).toBeInTheDocument();
  });
});

describe("DebtManage", () => {
  test("delete warns that the payments are deleted too", async () => {
    const user = userEvent.setup();
    render(<DebtManage id="d1" status="active" paymentCount={3} />);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as paid off" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete debt" }));
    expect(screen.getByRole("alert")).toHaveTextContent("also deletes its 3 recorded payments");
  });
  test("archived debts offer unarchive", () => {
    render(<DebtManage id="d1" status="archived" paymentCount={0} />);
    expect(screen.getByRole("button", { name: "Unarchive" })).toBeInTheDocument();
  });
});

describe("StartTrackingForm", () => {
  test("offers saved plans with a fixed payment, and switches to a monthly payment", async () => {
    const user = userEvent.setup();
    const plans = [
      { id: "a", name: "Fast", fixed_payment: 3000 },
      { id: "b", name: "Percent only", fixed_payment: 0 },
    ];
    render(<StartTrackingForm debtId="d1" plans={plans} startBalance={30000} startDate="2026-01-15" currency="THB" isReset={false} />);
    const select = screen.getByLabelText("Saved plan");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Fast (3,000.00 baht a month)"]);
    await user.click(screen.getByLabelText("From a monthly payment"));
    expect(screen.getByLabelText("Monthly payment (baht)")).toBeInTheDocument();
    expect(screen.getByText(/Starts from 30,000.00 baht on 15 Jan 2026/)).toBeInTheDocument();
  });
  test("with no saved plans it starts on the monthly payment", () => {
    render(<StartTrackingForm debtId="d1" plans={[]} startBalance={30000} startDate="2026-01-15" currency="THB" isReset />);
    expect(screen.getByLabelText("Monthly payment (baht)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start new baseline" })).toBeInTheDocument();
  });
});

describe("PlanVsActual", () => {
  test("an accessible chart naming the planned and today's balance", () => {
    render(<PlanVsActual planned={[30000, 28900, 27800, 26700]} actual={[30000, 28400, 27000]} len={12} todayIndex={2} currency="THB" />);
    expect(screen.getByRole("img", { name: /Planned now 27,800 baht, actual today 27,000 baht/ })).toBeInTheDocument();
  });
});
