import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import CalculatorPage from "@/app/calculator/page";

const resultCard = (key: "A" | "B") => screen.getByTestId(`result-${key}`);

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/", useSearchParams: () => new URLSearchParams(window.location.search) }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  push.mockClear();
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

  test("heading, intro and nowrap figures", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Calculator");
    expect(screen.getByText("One card, two ways to pay, every result on one page.")).toBeInTheDocument();
    expect(within(resultCard("A")).getByText("34 years 10 months").textContent).toContain("34 years 10 months");
    expect(within(resultCard("B")).getByText("5,126.95 baht").closest(".whitespace-nowrap")).not.toBeNull();
  });

  test("results, balance chart and monthly table are on the same page", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await within(await screen.findByTestId("result-B")).findByText("2 years")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Balance by month" })).toBeInTheDocument();
    expect(screen.getByText("Month-by-month table")).toBeInTheDocument();
  });

  test("the math is hidden until a Why? button opens it", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    expect(screen.queryByTestId("proof1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Why? the balance chart" }));
    expect(screen.getByTestId("proof1")).toBeVisible();
  });

  test("the full math is a closed details element at the end", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    const math = document.getElementById("math") as HTMLDetailsElement;
    expect(math.tagName).toBe("DETAILS");
    expect(math.open).toBe(false);
    expect(within(math).getByText("The full math, step by step")).toBeInTheDocument();
  });

  test("an example in the full math updates the results without leaving the page", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    const math = document.getElementById("math") as HTMLDetailsElement;
    await user.click(within(math).getByText("The full math, step by step"));
    const buttons = within(math).getAllByRole("button", { name: "Try this example" });
    await user.click(buttons[1]); // the fixed-400 example
    expect(within(resultCard("B")).getByText("Never")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  test("the inputs column scrolls on its own when taller than the window", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    const aside = document.getElementById("tool")!.closest("aside")!;
    expect(aside.className).toContain("lg:sticky");
    expect(aside.className).toContain("lg:overflow-y-auto");
  });
});
