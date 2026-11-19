import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { defaultState } from "@/lib/state";
import { CalcProvider } from "@/components/CalcProvider";
import WhyPage from "@/app/why/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

const byTestId = (id: string) => screen.getByTestId(id);

describe("MathExplainer", () => {
  test("recurrence walk matches the closed form at month 3; slider stops at 23", async () => {
    render(<CalcProvider><WhyPage /></CalcProvider>);
    const walk = await screen.findByTestId("walk");
    const slider = within(walk).getByRole("slider");
    expect(slider).toHaveAttribute("max", "23");
    expect(slider).toHaveValue("3");
    expect(within(walk).getAllByText("26,655.80 baht")).toHaveLength(2);
    expect(within(walk).getByText("✓ Equal")).toBeInTheDocument();
  });

  test("induction ladder at k = 11 reaches the closed form at 12", async () => {
    render(<CalcProvider><WhyPage /></CalcProvider>);
    const ladder = await screen.findByTestId("ladder");
    fireEvent.change(within(ladder).getByRole("slider"), { target: { value: "11" } });
    expect(within(byTestId("ladder-3")).getByText(/15,787\.66/)).toBeInTheDocument();
    expect(within(ladder).getByText(/^✓ ② equals ③/)).toBeInTheDocument();
  });

  test("proof 3 reacts to whether the payment covers the interest", async () => {
    const { unmount } = render(<CalcProvider><WhyPage /></CalcProvider>);
    expect(await screen.findByTestId("proof3")).toHaveTextContent("condition not met");
    // the 400 example lives on the calculator page: seed it the way a returning visitor would have saved it
    const st = defaultState();
    st.single.p = "400";
    localStorage.setItem("debtcalc.v1", JSON.stringify(st));
    unmount();
    render(<CalcProvider><WhyPage /></CalcProvider>);
    expect(await screen.findByTestId("proof3")).toHaveTextContent("condition met (p ≤ r·B0), the debt never goes down");
  });

  test("induction steps are named", async () => {
    render(<CalcProvider><WhyPage /></CalcProvider>);
    const proof1 = await screen.findByTestId("proof1");
    expect(proof1).toHaveTextContent("Basis step");
    expect(proof1).toHaveTextContent("Inductive step");
  });
});
