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

async function setup() {
  const user = userEvent.setup();
  render(<CalcProvider><CalculatorPage /></CalcProvider>);
  await screen.findByTestId("result-B");
  const plan = within(document.getElementById("sec-plan")!);
  const fill = async (label: string, value: string) => {
    const f = plan.getByLabelText(label);
    await user.clear(f);
    await user.click(f);
    await user.paste(value);
  };
  return { user, plan, fill };
}

describe("One-time bonus", () => {
  test("is hidden until the user says they have a bonus", async () => {
    const { user, plan } = await setup();
    expect(plan.getByRole("button", { name: "I have a bonus" })).toBeInTheDocument();
    expect(plan.queryByLabelText("Bonus amount (baht)")).toBeNull();
    await user.click(plan.getByRole("button", { name: "I have a bonus" }));
    expect(plan.getByLabelText("Bonus amount (baht)")).toBeInTheDocument();
    expect(plan.getByLabelText("In month (1 = next month)")).toHaveValue("6");
  });

  test("a 10,000 baht bonus in month 6 finishes sooner", async () => {
    const { user, plan, fill } = await setup();
    await user.click(plan.getByRole("button", { name: "I have a bonus" }));
    await fill("Bonus amount (baht)", "10,000");
    expect(plan.getByText("Paid off in, with the bonus")).toBeInTheDocument();
    const sooner = plan.getByText("Months sooner").parentElement!;
    expect(sooner.textContent).toMatch(/[1-9]\d*\s+months?/); // number and unit are joined by a non-breaking space
    expect(plan.getByText("Interest saved")).toBeInTheDocument();
  });

  test("a bonus after the plan has ended says so", async () => {
    const { user, plan, fill } = await setup();
    await user.click(plan.getByRole("button", { name: "I have a bonus" }));
    await fill("Bonus amount (baht)", "5,000");
    await fill("In month (1 = next month)", "30");
    expect(plan.getByText("Method B is already paid off in 24 months, before this bonus.")).toBeInTheDocument();
  });

  test("a bad amount shows an error", async () => {
    const { user, plan, fill } = await setup();
    await user.click(plan.getByRole("button", { name: "I have a bonus" }));
    await fill("Bonus amount (baht)", "abc");
    expect(plan.getByText("Enter a bonus above 0")).toBeInTheDocument();
  });

  test("Remove hides the box and puts focus back on the button", async () => {
    const { user, plan } = await setup();
    await user.click(plan.getByRole("button", { name: "I have a bonus" }));
    await user.click(plan.getByRole("button", { name: "Remove bonus" }));
    expect(plan.queryByLabelText("Bonus amount (baht)")).toBeNull();
    expect(plan.getByRole("button", { name: "I have a bonus" })).toHaveFocus();
  });

  test("a big bonus can end a plan that never ends on its own", async () => {
    const { user, plan, fill } = await setup();
    await user.click(screen.getByRole("button", { name: "Example: fixed payment below the interest (400)" }));
    await user.click(plan.getByRole("button", { name: "I have a bonus" }));
    await fill("Bonus amount (baht)", "30,000");
    await fill("In month (1 = next month)", "1");
    expect(plan.getByText("Paid off in, with the bonus")).toBeInTheDocument();
  });
});
