import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import MultiPage from "@/app/multi/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

const strat = (key: "minonly" | "avalanche" | "snowball") => screen.getByTestId(`strat-${key}`);

describe("MultiCard", () => {
  test("the page says Several cards once and links to the one-card calculator", async () => {
    render(<CalcProvider><MultiPage /></CalcProvider>);
    await screen.findByTestId("strat-avalanche");
    expect(screen.getAllByRole("heading", { name: /Several cards/ })).toHaveLength(1);
    expect(screen.getByText("Split one monthly budget across 2 to 5 cards. The calculator tries 3 payoff strategies.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See one card in detail" })).toHaveAttribute("href", "/calculator");
  });

  test("strategy results are h2 sections under a tagged heading", async () => {
    render(<CalcProvider><MultiPage /></CalcProvider>);
    await screen.findByTestId("strat-avalanche");
    const res = document.getElementById("multiRes")!;
    expect(within(res).queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(within(res).getAllByRole("heading", { level: 2 }).length).toBe(3);
    const wins = screen.getByRole("heading", { level: 2, name: "Which strategy wins" });
    const row = wins.parentElement!;
    expect(within(row).getByLabelText("CPE111 Chapter 3, Algorithms")).toBeInTheDocument();
    expect(within(row).getByLabelText("CPE111 Chapter 8, Recurrence relations")).toBeInTheDocument();
  });

  test("cards are rows, not panels inside a panel", async () => {
    render(<CalcProvider><MultiPage /></CalcProvider>);
    await screen.findByTestId("strat-avalanche");
    const multi = document.getElementById("multi")!;
    expect(multi.classList.contains("inset-card")).toBe(false);
  });

  test("default cards: results per strategy and the least-interest badge", async () => {
    render(<CalcProvider><MultiPage /></CalcProvider>);
    const av = await screen.findByTestId("strat-avalanche");
    expect(within(av).getByText("1 year")).toBeInTheDocument();
    expect(within(av).getByText("3,390.91 baht")).toBeInTheDocument();
    expect(within(strat("snowball")).getByText("3,827.52 baht")).toBeInTheDocument();
    expect(within(strat("minonly")).getByText("6 years 7 months")).toBeInTheDocument();
    const badge = "✓ Least interest in this simulation";
    expect(within(av).getByText(badge)).toBeInTheDocument();
    expect(within(strat("snowball")).queryByText(badge)).toBeNull();
    expect(within(strat("minonly")).queryByText(badge)).toBeNull();
  });

  test("a budget below the minimums warns", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><MultiPage /></CalcProvider>);
    const budget = await screen.findByLabelText("Total monthly budget (baht)");
    await user.clear(budget);
    await user.type(budget, "1,000");
    expect(screen.getByText(/The budget is below the combined first-month minimums/)).toHaveTextContent("1,600.00 baht");
  });

  test("card count stays between 2 and 5", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><MultiPage /></CalcProvider>);
    const add = await screen.findByRole("button", { name: "+ Add a card" });
    await user.click(add);
    await user.click(add);
    expect(screen.getAllByLabelText("Card name")).toHaveLength(5);
    expect(add).toBeDisabled();
    const remove = () => screen.getAllByRole("button", { name: "Remove this card" });
    await user.click(remove()[4]);
    await user.click(remove()[3]);
    await user.click(remove()[2]);
    expect(screen.getAllByLabelText("Card name")).toHaveLength(2);
    remove().forEach((b) => expect(b).toBeDisabled());
  });

  test("an empty card name shows as unnamed in the payoff order", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><MultiPage /></CalcProvider>);
    const name = (await screen.findAllByLabelText("Card name"))[0];
    await user.clear(name);
    expect(within(strat("avalanche")).getByText(/Unnamed/)).toBeInTheDocument();
  });
});
