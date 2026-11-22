import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { evaluateGoal } from "@/lib/goals";
import { overviewOf } from "@/lib/overview";
import type { DebtRow, FinancialGoalRow, PaymentRecordRow } from "@/lib/supabase/database.types";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";

// Server actions can't run in jsdom; the forms only need something to post to.
vi.mock("@/app/(app)/goals/actions", () => ({ saveGoal: vi.fn(async () => ({})), deleteGoal: vi.fn(async () => ({})) }));

const ts = { created_at: "", updated_at: "" };
const debt = (over: Partial<DebtRow> = {}): DebtRow => ({
  id: "d1", user_id: "u", name: "Card A", kind: "credit_card", start_balance: 30000, start_date: "2026-01-15", apr: 16,
  min_pct: 5, min_amount: 500, due_day: 20, currency: "THB", status: "active", ...ts, ...over,
});
const pay = (paid_on: string, amount: number): PaymentRecordRow => ({ id: paid_on, user_id: "u", debt_id: "d1", paid_on, amount, note: null, ...ts });
const goalRow = (over: Partial<FinancialGoalRow>): FinancialGoalRow => ({
  id: "g1", user_id: "u", title: "Debt-free", kind: "debt_free_by", debt_id: null, target_date: "2026-12-31", target_amount: null, target_pct: null, achieved_at: null, ...ts, ...over,
});

const debts = [{ id: "7f1c2a4e-1b2c-4d3e-8f90-123456789abc", name: "Card A" }];

describe("GoalForm", () => {
  test("shows only the fields for the chosen goal type", async () => {
    const user = userEvent.setup();
    render(<GoalForm debts={debts} />);
    expect(screen.getByLabelText("Target date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Which debt")).toBeNull();
    await user.selectOptions(screen.getByLabelText("Goal type"), "debt_paid_by");
    expect(screen.getByLabelText("Which debt")).toHaveValue(debts[0].id);
    await user.selectOptions(screen.getByLabelText("Goal type"), "reduce_total_pct");
    expect(screen.getByLabelText("Reduce by (%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Target date (optional)")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Goal type"), "reduce_total_to");
    expect(screen.getByLabelText("Reduce to (baht)")).toBeInTheDocument();
  });

  test("a preset fills in the form", async () => {
    const user = userEvent.setup();
    const presets = [{ label: "Reduce total debt by 50%", values: { title: "Reduce total debt by 50%", kind: "reduce_total_pct", debtId: "", targetDate: "", targetPct: "50", targetAmount: "" } }];
    render(<GoalForm debts={debts} presets={presets} />);
    await user.click(screen.getByRole("button", { name: "Reduce total debt by 50%" }));
    expect(screen.getByLabelText("Goal name")).toHaveValue("Reduce total debt by 50%");
    expect(screen.getByLabelText("Goal type")).toHaveValue("reduce_total_pct");
    expect(screen.getByLabelText("Reduce by (%)")).toHaveValue("50");
  });

  test("delete needs a second click", async () => {
    const user = userEvent.setup();
    const o = overviewOf(debt(), [], null, "2026-03-15");
    const g = goalRow({});
    render(<GoalCard goal={g} e={evaluateGoal(g, [o], "2026-03-15")} asOf="2026-03-15" currency="THB" debts={debts} />);
    await user.click(screen.getByRole("button", { name: "Delete: Debt-free" }));
    expect(screen.getByRole("button", { name: "Click again to delete: Debt-free" })).toHaveAttribute("type", "submit");
  });
});

describe("GoalCard", () => {
  test("progress bar, status, required monthly payment and history charts", () => {
    const o = overviewOf(debt(), [pay("2026-01-20", 1500), pay("2026-02-20", 1500)], null, "2026-03-15");
    const g = goalRow({ target_date: "2026-12-31" });
    const { container } = render(<GoalCard goal={g} e={evaluateGoal(g, [o], "2026-03-15")} asOf="2026-03-15" currency="THB" debts={debts} />);
    expect(screen.getByRole("progressbar", { name: "Progress toward Debt-free" })).toBeInTheDocument();
    expect(screen.getByText("Falling behind")).toBeInTheDocument();
    expect(screen.getByText("Needed each month to hit the date")).toBeInTheDocument();
    expect(screen.getByText(/About .+ more a month than now\./)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Bar chart of payments per month toward this goal/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Balance of the debts in this goal/ })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|[–—]/);
  });

  test("an achieved goal shows its achieved date and no required payment", () => {
    const o = overviewOf(debt(), [pay("2026-01-20", 31000)], null, "2026-03-15");
    const g = goalRow({ achieved_at: "2026-03-15T08:00:00Z" });
    render(<GoalCard goal={g} e={evaluateGoal(g, [o], "2026-03-15")} asOf="2026-03-15" currency="THB" debts={debts} />);
    expect(screen.getByText("Achieved")).toBeInTheDocument();
    expect(screen.getByText("Achieved on 15 Mar 2026")).toBeInTheDocument();
    expect(screen.queryByText("Needed each month to hit the date")).toBeNull();
  });
});
