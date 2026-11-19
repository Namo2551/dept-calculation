import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test } from "vitest";
import { Calculator } from "./Calculator";

const resultCard = (key: "A" | "B") => screen.getByTestId(`result-${key}`);

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

describe("Calculator", () => {
  test("defaults show method A and B results", async () => {
    render(<Calculator />);
    expect(await within(resultCard("B")).findByText("2 years")).toBeInTheDocument();
    expect(within(resultCard("B")).getByText("5,126.95 baht")).toBeInTheDocument();
    expect(within(resultCard("A")).getByText("34 years 10 months")).toBeInTheDocument();
  });

  test("invalid balance shows inline error and keeps last results", async () => {
    const user = userEvent.setup();
    render(<Calculator />);
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
    render(<Calculator />);
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
    render(<Calculator />);
    expect(await within(resultCard("B")).findByText("1 year 5 months")).toBeInTheDocument();
    expect(screen.getByText("Using the numbers from your link")).toBeInTheDocument();
  });

  test("server render shows a loading skeleton, not default numbers", () => {
    const html = renderToString(<Calculator />);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("34 years 10 months");
  });

  test("required payment for N months and using it as method B", async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    expect(await screen.findByText("1,469.00 baht")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use as the fixed payment (method B)" }));
    expect(screen.getByLabelText("Fixed payment per month (baht)")).toHaveValue("1,469");
  });
});
