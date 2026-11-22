import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { buildDashboard } from "@/lib/dashboard";
import { overviewOf } from "@/lib/overview";
import type { DebtRow, PaymentRecordRow, RepaymentScheduleRow } from "@/lib/supabase/database.types";
import { DashboardView } from "./DashboardView";

const ts = { created_at: "", updated_at: "" };
const debt = (over: Partial<DebtRow> = {}): DebtRow => ({
  id: "d1", user_id: "u", name: "Card A", kind: "credit_card", start_balance: 30000, start_date: "2026-01-15", apr: 16,
  min_pct: 5, min_amount: 500, due_day: 20, currency: "THB", status: "active", ...ts, ...over,
});
const pay = (paid_on: string, amount: number): PaymentRecordRow => ({ id: paid_on, user_id: "u", debt_id: "d1", paid_on, amount, note: null, ...ts });
const plan: RepaymentScheduleRow = { id: "s", user_id: "u", debt_id: "d1", source_plan_id: null, balance: 30000, apr: 16, monthly_payment: 1500, start_date: "2026-01-15", is_active: true, ...ts };

describe("DashboardView", () => {
  test("new users get the empty state with links to add a debt and to the calculator", () => {
    render(<DashboardView data={buildDashboard([], "2026-03-15")} />);
    expect(screen.getByRole("link", { name: "Add your first debt" })).toHaveAttribute("href", "/debts");
    expect(screen.getByRole("link", { name: "Try the calculator first" })).toHaveAttribute("href", "/calculator");
  });

  test("headline, progress bar, summary, charts and the debt list", () => {
    const o = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500)], plan, "2026-03-15");
    const { container } = render(<DashboardView data={buildDashboard([o], "2026-03-15")} />);
    expect(screen.getByRole("heading", { level: 2, name: /^Debt-free in .+, [A-Z][a-z]+ \d{4}$/ })).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Share of starting balances repaid" });
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
    expect(screen.getByText("Total outstanding")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Total debt by month/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Planned and actual/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Bar chart of total payments/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Card A/ })).toHaveAttribute("href", "/debts/d1");
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(container.textContent).not.toMatch(/[–—]/);
  });

  test("a debt that never pays off gets a clear message instead of a date", () => {
    const stuck = overviewOf(debt({ min_pct: null, min_amount: 100 }), [], null, "2026-03-15");
    render(<DashboardView data={buildDashboard([stuck], "2026-03-15")} />);
    expect(screen.getByRole("heading", { level: 2, name: /Card A never gets paid off/ })).toBeInTheDocument();
    expect(screen.getByText("Not reached at current payments")).toBeInTheDocument();
  });

  test("everything paid off", () => {
    const done = overviewOf(debt(), [pay("2026-01-20", 31000)], null, "2026-03-15");
    render(<DashboardView data={buildDashboard([done], "2026-03-15")} />);
    expect(screen.getByRole("heading", { level: 2, name: "Everything is paid off. You are debt-free." })).toBeInTheDocument();
    expect(screen.getByText("Paid off")).toBeInTheDocument();
  });
});
