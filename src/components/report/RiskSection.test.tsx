import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CalculatorPage from "@/app/calculator/page";
import { CalcProvider } from "@/components/CalcProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/calculator",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/calculator");
});

async function riskSection() {
  render(<CalcProvider><CalculatorPage /></CalcProvider>);
  await screen.findByTestId("result-B");
  return within(document.getElementById("sec-risk")!);
}

describe("Missed payments section (Ch 7)", () => {
  test("shows the exact odds for a 5% chance", async () => {
    const risk = await riskSection();
    expect(risk.getByText("46.0%")).toBeInTheDocument();
    expect(risk.getByText("0.6")).toBeInTheDocument();
    expect(risk.getByText("1 − (1 − 0.05)¹² = 0.460")).toBeInTheDocument();
    const bars = risk.getByRole("img", { name: /missed months/ });
    expect(bars.getAttribute("aria-label")).toContain("54.0%");
    expect(bars.getAttribute("aria-label")).toContain("34.1%");
    expect(risk.getByText("P(1 miss) = C(12,1)·0.05¹·0.95¹¹ = 12 × 0.05 × 0.5688 = 0.341")).toBeInTheDocument();
  });

  test("shows the simulation of method B", async () => {
    const risk = await riskSection();
    expect(risk.getByText("1,000 simulated runs of method B, each until it is paid off (same every time)")).toBeInTheDocument();
    expect(risk.getByText("Usually debt-free after")).toBeInTheDocument();
    expect(risk.getByText("Reach Default at least once")).toBeInTheDocument();
  });

  test("a 0% chance means no extra cost", async () => {
    const user = userEvent.setup();
    const risk = await riskSection();
    const q = risk.getByLabelText("Chance of missing a month (%)");
    await user.clear(q);
    await user.type(q, "0");
    expect(within(risk.getByText("Chance of missing at least once in a year").parentElement!).getByText("0.0%")).toBeInTheDocument();
    expect(within(risk.getByText("Average extra cost").parentElement!).getByText("0.00 baht")).toBeInTheDocument();
  });

  test("an out-of-range chance shows an error and keeps the last odds", async () => {
    const user = userEvent.setup();
    const risk = await riskSection();
    const q = risk.getByLabelText("Chance of missing a month (%)");
    await user.clear(q);
    await user.click(q);
    await user.paste("60"); // in one go: typing would pass through the valid "6"
    expect(risk.getByText("The chance must be between 0 and 50 (%)")).toBeInTheDocument();
    expect(risk.getByText("46.0%")).toBeInTheDocument();
  });

  test("when method B never pays off there is nothing to simulate, but the odds stay", async () => {
    const user = userEvent.setup();
    const risk = await riskSection();
    await user.click(screen.getByRole("button", { name: "Example: fixed payment below the interest (400)" }));
    expect(risk.getByText("Method B never pays off, so there is nothing to simulate. Raise the fixed payment above the monthly interest.")).toBeInTheDocument();
    expect(risk.getByText("46.0%")).toBeInTheDocument();
  });
});
