import { render, screen, waitFor, within } from "@testing-library/react";
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
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/", useSearchParams: () => new URLSearchParams(window.location.search),
}));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  push.mockClear();
  replace.mockClear();
});

describe("pages share one provider", () => {
  test("the calculator page shows the default result B", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    expect(await within(await screen.findByTestId("result-B")).findByText("2 years")).toBeInTheDocument();
  });

  test("/charts replaces itself with the calculator's chart section", async () => {
    render(<CalcProvider><ChartsPage /></CalcProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith("/calculator?show=chart", { scroll: false });
  });

  test("/why keeps a section anchor when it forwards to the math", async () => {
    history.replaceState(null, "", "/why#abc");
    render(<CalcProvider><WhyPage /></CalcProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith("/calculator?show=math#abc", { scroll: false });
  });

  test("?show=math opens the full math and removes the query", async () => {
    history.replaceState(null, "", "/calculator?show=math");
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    await waitFor(() => expect((document.getElementById("math") as HTMLDetailsElement).open).toBe(true));
    expect(window.location.search).toBe("");
  });

  test("?show=math arriving while already on the calculator opens the math", async () => {
    const view = render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    history.pushState(null, "", "/calculator?show=math");
    view.rerender(<CalcProvider><CalculatorPage /></CalcProvider>);
    await waitFor(() => expect((document.getElementById("math") as HTMLDetailsElement).open).toBe(true));
    expect(window.location.search).toBe("");
  });

  test("/why with a share link loads the numbers and forwards without them in the address", async () => {
    const st = defaultState();
    st.single.p = "2,000";
    history.replaceState(null, "", "/why#" + encodeState(st));
    render(<CalcProvider><WhyPage /></CalcProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith("/calculator?show=math", { scroll: false });
    expect(JSON.parse(localStorage.getItem("debtcalc.v1")!).single.p).toBe("2,000");
  });

  test("?show=<section> scrolls to that section and clears the query", async () => {
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this.id);
    });
    history.replaceState(null, "", "/calculator?show=yearly");
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    await waitFor(() => expect(scrolled).toContain("sec-yearly"));
    expect(window.location.search).toBe("");
  });

  test("?show=nonsense opens nothing and removes the query", async () => {
    history.replaceState(null, "", "/calculator?show=nonsense");
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    await screen.findByTestId("result-B");
    await waitFor(() => expect(window.location.search).toBe(""));
    expect((document.getElementById("math") as HTMLDetailsElement).open).toBe(false);
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
