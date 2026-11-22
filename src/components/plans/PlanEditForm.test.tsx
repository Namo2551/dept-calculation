import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { DebtPlanRow } from "@/lib/supabase/database.types";
import { DeletePlanButton } from "./DeletePlanButton";
import { PlanEditForm } from "./PlanEditForm";

const actions = vi.hoisted(() => ({ updatePlan: vi.fn(), deletePlan: vi.fn() }));
vi.mock("@/app/(app)/plans/actions", () => actions);

const plan: DebtPlanRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u",
  debt_id: null,
  name: "Card A",
  balance: 30000,
  apr: 16,
  min_pct: 5,
  min_floor: 0,
  fixed_payment: 1500,
  target_months: 24,
  interest_limit: 3000,
  bonus_amount: 5000,
  bonus_month: 6,
  start_date: "2026-11-22",
  currency: "THB",
  notes: "Pay early",
  created_at: "",
  updated_at: "",
};

beforeEach(() => Object.values(actions).forEach((f) => f.mockReset()));

describe("PlanEditForm", () => {
  test("shows every field filled in and posts them", async () => {
    actions.updatePlan.mockResolvedValue({ message: "Changes saved.", tone: "good" });
    const user = userEvent.setup();
    render(<PlanEditForm plan={plan} />);
    expect(screen.getByLabelText("Plan name")).toHaveValue("Card A");
    expect(screen.getByLabelText("Balance (baht)")).toHaveValue("30,000");
    expect(screen.getByLabelText("Bonus payment (baht, optional)")).toHaveValue("5,000");
    expect(screen.getByLabelText("Bonus in month (optional)")).toHaveValue("6");
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-11-22");
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue("Pay early");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(actions.updatePlan).toHaveBeenCalled());
    const fd = actions.updatePlan.mock.calls[0][1] as FormData;
    expect(fd.get("id")).toBe(plan.id);
    expect(fd.get("fixed_payment")).toBe("1,500");
    expect(fd.get("notes")).toBe("Pay early");
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
  });

  test("shows server field errors next to the inputs", async () => {
    actions.updatePlan.mockResolvedValue({ errors: { balance: "The balance must be a number greater than 0", bonus_month: "Add the month of the bonus, or clear the amount" }, values: { balance: "abc" } });
    const user = userEvent.setup();
    render(<PlanEditForm plan={{ ...plan, bonus_amount: null, bonus_month: null, notes: null }} />);
    expect(screen.getByLabelText("Bonus payment (baht, optional)")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("The balance must be a number greater than 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Balance (baht)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Balance (baht)")).toHaveValue("abc");
    expect(screen.getByText("Add the month of the bonus, or clear the amount")).toBeInTheDocument();
  });
});

describe("DeletePlanButton", () => {
  test("needs a second click and then deletes, going back to the list", async () => {
    actions.deletePlan.mockResolvedValue({});
    const user = userEvent.setup();
    render(<DeletePlanButton id={plan.id} />);
    await user.click(screen.getByRole("button", { name: "Delete this plan" }));
    expect(actions.deletePlan).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Click again to delete this plan for good" }));
    await waitFor(() => expect(actions.deletePlan).toHaveBeenCalled());
    const fd = actions.deletePlan.mock.calls[0][1] as FormData;
    expect(fd.get("id")).toBe(plan.id);
    expect(fd.get("redirectTo")).toBe("/plans");
  });
});
