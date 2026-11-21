import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import { SingleCardForm } from "@/components/calculator/SingleCardForm";
import { ChartWhy, PlanWhy, ResultsWhy } from "./pieces";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

describe("math pieces", () => {
  test("ResultsWhy shows the recurrence and the pure-percentage proof by default", async () => {
    render(<CalcProvider><ResultsWhy /></CalcProvider>);
    expect(await screen.findByTestId("math-recurrence")).toBeInTheDocument();
    expect(screen.getByTestId("proof2")).toBeInTheDocument();
  });

  test("ResultsWhy hides the pure-percentage proof when method A has a minimum in baht", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><SingleCardForm /><ResultsWhy /></CalcProvider>);
    await screen.findByTestId("math-recurrence");
    const floor = within(document.getElementById("tool")!).getByLabelText(/Minimum in baht/);
    await user.clear(floor);
    await user.type(floor, "500");
    expect(screen.getByTestId("math-recurrence")).toBeInTheDocument();
    expect(screen.queryByTestId("proof2")).not.toBeInTheDocument();
  });

  test("ChartWhy shows proof 1 with its basis step", async () => {
    render(<CalcProvider><ChartWhy /></CalcProvider>);
    const p1 = await screen.findByTestId("proof1");
    expect(within(p1).getAllByText("Basis step", { exact: false }).length).toBeGreaterThan(0);
  });

  test("PlanWhy shows the required-payment step and proof 3", async () => {
    render(<CalcProvider><PlanWhy /></CalcProvider>);
    expect(await screen.findByTestId("math-required")).toBeInTheDocument();
    expect(screen.getByTestId("proof3")).toBeInTheDocument();
  });
});
