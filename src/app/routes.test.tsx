import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import { encodeState } from "@/lib/debt";
import { defaultState } from "@/lib/state";
import CalculatorPage from "./calculator/page";
import ChartsPage from "./charts/page";
import HomePage from "./page";
import WhyPage from "./why/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
}));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  push.mockClear();
});

describe("five routes share one provider", () => {
  test("the calculator page shows the default result B", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await within(await screen.findByTestId("result-B")).findByText("2 years")).toBeInTheDocument();
  });

  test("a payment edited on the calculator page shows on the charts page", async () => {
    const user = userEvent.setup();
    const view = render(<CalcProvider><CalculatorPage /></CalcProvider>);
    const p = await screen.findByLabelText("Fixed payment per month (baht)");
    await user.clear(p);
    await user.type(p, "2,000");
    view.rerender(<CalcProvider><ChartsPage /></CalcProvider>);
    expect(await screen.findByText("9,327.50 baht left")).toBeInTheDocument();
  });

  test("a link loaded on the home page is available on the calculator page", async () => {
    const st = defaultState();
    st.single.p = "2,000";
    history.replaceState(null, "", "/#" + encodeState(st));
    const view = render(<CalcProvider><HomePage /></CalcProvider>);
    expect(window.location.hash).toBe("");
    view.rerender(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await within(await screen.findByTestId("result-B")).findByText("1 year 5 months")).toBeInTheDocument();
  });

  test("the why page shows the proof without any click", async () => {
    render(<CalcProvider><WhyPage /></CalcProvider>);
    expect(await screen.findAllByText("Basis step", { exact: false })).not.toHaveLength(0);
  });

  test("an example in the math stays on the page (no navigation)", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><WhyPage /></CalcProvider>);
    const buttons = await screen.findAllByRole("button", { name: /Try this example/ });
    await user.click(buttons[0]);
    expect(push).not.toHaveBeenCalled();
  });

  test("copy link writes a /calculator URL with the encoded state", async () => {
    const user = userEvent.setup();
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await user.click(await screen.findByRole("button", { name: "Copy a link with my numbers" }));
    const url = await navigator.clipboard.readText();
    expect(url).toBe(`${window.location.origin}/calculator#${encodeState(defaultState())}`);
  });

  test("server render of a page shows a loading skeleton, not default numbers", () => {
    const html = renderToString(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("34 years 10 months");
  });
});
