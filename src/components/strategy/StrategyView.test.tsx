import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { strategyCopy as C } from "@/copy/strategy";
import { formatMoney } from "@/lib/money";
import { compareStrategies, parseBudget, type StrategyDebt } from "@/lib/strategy";
import { StrategyView } from "./StrategyView";

const big: StrategyDebt = { id: "big", name: "Big card", balance: 30000, apr: 24, minPct: 5, minAmount: 500 };
const small: StrategyDebt = { id: "small", name: "Small loan", balance: 5000, apr: 12, minPct: null, minAmount: 300 };
const today = "2026-11-22";

const view = (debts: StrategyDebt[], raw?: string, plan?: string) => render(<StrategyView debts={debts} rawBudget={raw} rawPlan={plan} today={today} />);

describe("StrategyView", () => {
  test("empty state links to the debts page", () => {
    view([]);
    expect(screen.getByText(C.empty.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: C.empty.link })).toHaveAttribute("href", "/debts");
    expect(screen.queryByRole("img")).toBeNull();
  });

  test("one debt says both strategies are identical", () => {
    view([big], "3000");
    expect(screen.getByText(C.single)).toBeInTheDocument();
  });

  test("two debts: marks avalanche as recommended and explains the difference", () => {
    view([big, small], "4000");
    const cmp = compareStrategies([big, small], 4000, today);
    const av = screen.getByTestId("plan-avalanche");
    expect(within(av).getByText(C.plans.recommended)).toBeInTheDocument();
    expect(within(screen.getByTestId("plan-snowball")).queryByText(C.plans.recommended)).toBeNull();
    expect(within(av).getByText(formatMoney(cmp.plans.avalanche.totalInterest!))).toBeInTheDocument();
    expect(screen.getByText(C.compare.cheaper("Avalanche", "snowball", formatMoney(cmp.cheaper!.by)))).toBeInTheDocument();
    expect(screen.getByText(C.compare.firstSooner("Snowball", cmp.firstSooner!.months))).toBeInTheDocument();
    // payoff order with month numbers
    const items = within(screen.getByTestId("plan-snowball")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/^Small loan: month \d+, /);
  });

  test("the budget field keeps the value from the URL, and the chart is labelled", () => {
    view([big, small], "4000");
    expect(screen.getByLabelText(C.budget.label)).toHaveValue("4000");
    expect(screen.getByRole("img", { name: /Line chart of the total balance/ })).toBeInTheDocument();
  });

  test("no budget in the URL uses the suggested one (minimums rounded up to the next 100)", () => {
    view([big, small]);
    expect(screen.getByLabelText(C.budget.label)).toHaveValue("1800");
  });

  test("an invalid budget shows an error next to the field and falls back to the suggestion", () => {
    view([big, small], "-20");
    expect(screen.getByLabelText(C.budget.label)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(C.budget.errors.negative)).toBeInTheDocument();
    expect(screen.getByText(C.budget.usingFallback(formatMoney(1800)))).toBeInTheDocument();
    expect(parseBudget("-20", 1800).budget).toBe(1800);
  });

  test("a budget below the minimums shows the warning", () => {
    view([big, small], "500");
    expect(screen.getByText(C.budget.tooLow(formatMoney(1800)))).toBeInTheDocument();
  });

  test("the monthly table shows the chosen plan with a column per debt", () => {
    view([big, small], "4000", "snowball");
    const picker = screen.getByRole("navigation", { name: C.monthly.choose });
    expect(within(picker).getByRole("link", { name: C.plans.short.snowball })).toHaveAttribute("aria-current", "true");
    expect(within(picker).getByRole("link", { name: C.plans.short.avalanche })).toHaveAttribute("href", "/strategy?budget=4000&plan=avalanche#monthly");
    const table = screen.getByRole("table", { name: C.monthly.caption(C.plans.short.snowball) });
    expect(within(table).getByRole("columnheader", { name: C.monthly.pay("Small loan") })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: C.monthly.left("Big card") })).toBeInTheDocument();
    const cmp = compareStrategies([big, small], 4000, today);
    expect(within(table).getAllByRole("row")).toHaveLength(cmp.plans.snowball.months! + 1);
  });

  test("explains both methods with the CPE111 chapter tags", () => {
    view([big, small], "4000");
    expect(screen.getByText(C.methods.avalanche)).toBeInTheDocument();
    expect(screen.getByLabelText(/Chapter 3/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Chapter 8/)).toBeInTheDocument();
  });
});
