import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import CalculatorPage from "@/app/calculator/page";

const resultCard = (key: "A" | "B") => screen.getByTestId(`result-${key}`);

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

describe("Calculator page", () => {
  test("defaults show method A and B results", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await within(resultCard("B")).findByText("2 years")).toBeInTheDocument();
    expect(within(resultCard("B")).getByText("5,126.95 baht")).toBeInTheDocument();
    expect(within(resultCard("A")).getByText("34 years 10 months")).toBeInTheDocument();
  });

  test("invalid balance shows inline error and keeps last results", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    const bal = within(document.getElementById("tool")!).getByLabelText("Balance (baht)");
    await user.clear(bal);
    await user.type(bal, "abc");
    expect(bal).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("The balance must be a number greater than 0")).toBeInTheDocument();
    expect(within(resultCard("B")).getByText("2 years")).toBeInTheDocument();
  });

  test("the 400 example warns that the debt never decreases", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await user.click(await screen.findByRole("button", { name: "Example: fixed payment below the interest (400)" }));
    const b = resultCard("B");
    expect(within(b).getByText(/the debt never goes down/)).toHaveTextContent("400.00 baht");
    expect(within(b).getByText("Never")).toBeInTheDocument();
  });

  test("an old share link loads its numbers", async () => {
    const st = {
      single: { bal: "30,000", apr: "16", m: "5", floor: "0", p: "2,000", n: "24" },
      multi: { budget: "3,000", cards: [
        { name: "Card A", balance: "20,000", apr: "24", m: "5", floor: "200" },
        { name: "Card B", balance: "8,000", apr: "18", m: "5", floor: "200" },
      ] },
    };
    history.replaceState(null, "", "/#" + encodeURIComponent(JSON.stringify(st)));
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await within(resultCard("B")).findByText("1 year 5 months")).toBeInTheDocument();
    expect(screen.getByText("Using the numbers from your link")).toBeInTheDocument();
  });

  test("required payment for N months and using it as method B", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await screen.findByText("1,469.00 baht")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use as the fixed payment (method B)" }));
    expect(screen.getByLabelText("Fixed payment per month (baht)")).toHaveValue("1,469");
  });

  test("heading, intro, nowrap figures and the closing chart link", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Calculator");
    expect(screen.getByText("Compare paying the minimum with a fixed amount each month.")).toBeInTheDocument();
    expect(within(resultCard("A")).getByText("34 years 10 months").closest(".whitespace-nowrap")).not.toBeNull();
    expect(within(resultCard("B")).getByText("5,126.95 baht").closest(".whitespace-nowrap")).not.toBeNull();
    const link = screen.getByRole("link", { name: "See it on a chart" });
    expect(link).toHaveAttribute("href", "/charts");
    const links = screen.getAllByRole("link");
    expect(links[links.length - 1]).toBe(link);
  });
});
