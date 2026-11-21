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
    expect(within(risk.getByText("Average extra cost (runs that pay off)").parentElement!).getByText("0.00 baht")).toBeInTheDocument();
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

  test("an empty chance does not freeze the other results", async () => {
    const user = userEvent.setup();
    const risk = await riskSection();
    await user.clear(risk.getByLabelText("Chance of missing a month (%)"));
    const bal = screen.getByLabelText("Balance (baht)");
    await user.clear(bal);
    await user.click(bal);
    await user.paste("50,000");
    expect(within(screen.getByTestId("result-B")).queryByText("2 years")).toBeNull();
    expect(JSON.parse(localStorage.getItem("debtcalc.v1")!).single.bal).toBe("50,000");
  });

  test("a share link with a bad chance keeps its other numbers", async () => {
    const st = { single: { bal: "30,000", apr: "16", m: "5", floor: "0", p: "2,000", n: "24", q: "abc", fee: "300" },
      multi: { budget: "3,000", cards: [{ name: "A", balance: "20,000", apr: "24", m: "5", floor: "200" }, { name: "B", balance: "8,000", apr: "18", m: "5", floor: "200" }] } };
    history.replaceState(null, "", "/calculator#" + encodeURIComponent(JSON.stringify(st)));
    const risk = await riskSection();
    expect(within(screen.getByTestId("result-B")).getByText("1 year 5 months")).toBeInTheDocument();
    expect(risk.getByText("46.0%")).toBeInTheDocument(); // the bad chance falls back to the default 5%
  });

  test("a slow plan shows how many runs never pay off, and a sane extra cost", async () => {
    const user = userEvent.setup();
    const risk = await riskSection();
    const p = screen.getByLabelText("Fixed payment per month (baht)");
    await user.clear(p);
    await user.click(p);
    await user.paste("450");
    const never = risk.getByText("Never pay off within 100 years").parentElement!;
    expect(never.textContent).toMatch(/\d+\.\d%/);
    const extra = risk.getByText("Average extra cost (runs that pay off)").parentElement!;
    expect(extra.textContent!.replace(/\D/g, "").length).toBeLessThan(9); // not a billion-baht figure
  });

  test("simulation stats stack on phones instead of overflowing", async () => {
    const risk = await riskSection();
    const grid = risk.getByText("1 in 10 take longer than").parentElement!.parentElement!;
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className.split(" ")).not.toContain("grid-cols-2");
  });

  test("when method B never pays off there is nothing to simulate, but the odds stay", async () => {
    const user = userEvent.setup();
    const risk = await riskSection();
    await user.click(screen.getByRole("button", { name: "Example: fixed payment below the interest (400)" }));
    expect(risk.getByText("Method B never pays off, so there is nothing to simulate. Raise the fixed payment above the monthly interest.")).toBeInTheDocument();
    expect(risk.getByText("46.0%")).toBeInTheDocument();
  });
});
