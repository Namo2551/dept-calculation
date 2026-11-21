import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import { SingleCardForm } from "@/components/calculator/SingleCardForm";
import { ReportMenu } from "./ReportMenu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

let report: ((entries: { isIntersecting: boolean; target: Element }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { isIntersecting: boolean; target: Element }[]) => void) {
    report = cb;
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/calculator");
  report = null;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

const page = () =>
  render(
    <CalcProvider>
      <ReportMenu />
      <section id="sec-inputs"><SingleCardForm /></section>
      <section id="sec-results">results</section>
    </CalcProvider>,
  );

const wide = () => screen.getByRole("navigation", { name: "On this page" });

describe("ReportMenu", () => {
  test("lists the nine sections in order with their chapter numbers", async () => {
    page();
    await screen.findByTestId("tool-panel");
    const links = within(wide()).getAllByRole("link");
    expect(links).toHaveLength(9);
    expect(links[0]).toHaveTextContent("Your numbers");
    expect(links[1]).toHaveAttribute("href", "#sec-results");
    const risk = links[5];
    expect(risk).toHaveTextContent("Missed payments");
    expect(within(risk).getByLabelText("CPE111 Chapter 7, Discrete probability")).toHaveTextContent("7");
    expect(within(risk).getByLabelText("CPE111 Chapter 6, Counting")).toHaveTextContent("6");
    expect(within(wide()).getByText("Chapters used: 1·2·3·5·6·7·8·13")).toBeInTheDocument();
  });

  test("shows the input summary without scrolling", async () => {
    page();
    await screen.findByTestId("tool-panel");
    expect(within(wide()).getByText("30,000 ฿ · 16% · A 5% · B 1,500 ฿")).toBeInTheDocument();
  });

  test("marks the section in view as current", async () => {
    page();
    await screen.findByTestId("tool-panel");
    act(() => report?.([{ isIntersecting: true, target: document.getElementById("sec-results")! }]));
    expect(within(wide()).getByRole("link", { name: /Results/ })).toHaveAttribute("aria-current", "true");
    expect(within(wide()).getByRole("link", { name: /Your numbers/ })).not.toHaveAttribute("aria-current");
  });

  test("a link scrolls to its section and leaves the address hash alone", async () => {
    const user = userEvent.setup();
    page();
    await screen.findByTestId("tool-panel");
    await user.click(within(wide()).getByRole("link", { name: /Results/ }));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.contexts.at(-1)).toBe(document.getElementById("sec-results"));
    expect(window.location.hash).toBe("");
  });

  test("Edit puts the focus on the balance field", async () => {
    const user = userEvent.setup();
    page();
    await screen.findByTestId("tool-panel");
    await user.click(within(wide()).getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Balance (baht)")).toHaveFocus();
  });

  test("the narrow bar has the same sections as chips", async () => {
    page();
    await screen.findByTestId("tool-panel");
    const narrow = screen.getByRole("navigation", { name: "Sections" });
    expect(within(narrow).getAllByRole("link")).toHaveLength(9);
  });
});
