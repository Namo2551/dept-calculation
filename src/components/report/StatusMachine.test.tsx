import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import { StatusMachine } from "./StatusMachine";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/calculator" }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/calculator");
});

async function setup() {
  const user = userEvent.setup();
  render(<CalcProvider><StatusMachine /></CalcProvider>);
  await screen.findByRole("button", { name: "Pay (P)" });
  const path = () => within(screen.getByRole("list", { name: "Path through the machine" })).getAllByRole("listitem").map((li) => li.textContent);
  const active = () => document.querySelector("[data-state][data-active='true']")?.getAttribute("data-state");
  return { user, path, active };
}

describe("Account status machine (Ch 13)", () => {
  test("starts at Current with only month 0 on the path", async () => {
    const { path, active } = await setup();
    expect(path()).toEqual(["Month 0: Current"]);
    expect(active()).toBe("current");
  });

  test("three misses in a row reach Default", async () => {
    const { user, path, active } = await setup();
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Miss (M)" }));
    expect(path().at(-1)).toBe("Month 3: Default");
    expect(active()).toBe("default");
    expect(screen.getByText("✓ contains MMM")).toBeInTheDocument();
  });

  test("a typed month string is read with lowercase and spaces", async () => {
    const { user, path } = await setup();
    await user.type(screen.getByLabelText("Months as P and M"), "pp m");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(path()).toEqual(["Month 0: Current", "Month 1: Current", "Month 2: Current", "Month 3: Late"]);
    expect(screen.getByText("✗ no MMM")).toBeInTheDocument();
  });

  test("other letters show an error and keep the path", async () => {
    const { user, path } = await setup();
    await user.click(screen.getByRole("button", { name: "Miss (M)" }));
    await user.type(screen.getByLabelText("Months as P and M"), "PXM");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByText("Use only P and M, up to 60 months")).toBeInTheDocument();
    expect(path()).toEqual(["Month 0: Current", "Month 1: Late"]);
  });

  test("Reset returns to Current", async () => {
    const { user, path, active } = await setup();
    await user.click(screen.getByRole("button", { name: "Miss (M)" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(path()).toEqual(["Month 0: Current"]);
    expect(active()).toBe("current");
  });

  test("the transition table has a row per state", async () => {
    await setup();
    const table = screen.getByRole("table", { name: "Transition table" });
    expect(within(table).getAllByRole("row")).toHaveLength(5); // header + 4 states
  });

  test("the paid-off note uses method B's months", async () => {
    await setup();
    expect(screen.getByText(/Method B needs 24 paid months to reach Paid off/)).toBeInTheDocument();
  });
});
