import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import { SingleCardForm } from "./SingleCardForm";
import { SummaryBar } from "./SummaryBar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

let report: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    report = cb;
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  report = null;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

const LINE = "30,000 ฿ · 16% · A 5% · B 1,500 ฿";
const page = () => render(<CalcProvider><SummaryBar /><SingleCardForm /></CalcProvider>);

describe("SummaryBar", () => {
  test("shows nothing while the inputs are on screen", async () => {
    page();
    await screen.findByTestId("tool-panel");
    act(() => report?.([{ isIntersecting: true }]));
    expect(screen.queryByText(LINE)).not.toBeInTheDocument();
  });

  test("shows the numbers once the inputs scroll away", async () => {
    page();
    await screen.findByTestId("tool-panel");
    act(() => report?.([{ isIntersecting: false }]));
    expect(screen.getByText(LINE)).toBeInTheDocument();
  });

  test("Edit puts the focus on the balance field", async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    page();
    await screen.findByTestId("tool-panel");
    act(() => report?.([{ isIntersecting: false }]));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Balance (baht)")).toHaveFocus();
  });

  test("without IntersectionObserver it renders nothing and does not throw", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    page();
    await screen.findByTestId("tool-panel");
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
