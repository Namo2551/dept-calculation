// Regression tests for findings from the whole-branch review.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { encodeState } from "@/lib/debt";
import { defaultState } from "@/lib/state";
import { Calculator } from "./Calculator";

const scrolled: string[] = [];
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  scrolled.length = 0;
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.id);
  });
});
afterEach(() => vi.restoreAllMocks());

describe("review fixes", () => {
  test("a section anchor in the URL scrolls there once the calculator has loaded", async () => {
    history.replaceState(null, "", "/#multi");
    render(<Calculator lang="th" />);
    await screen.findByTestId("result-B");
    await waitFor(() => expect(scrolled).toContain("multi"));
  });

  test("saved numbers are the last valid ones, so a reload shows matching results", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    const tool = within(await screen.findByTestId("tool-panel"));
    const bal = tool.getByLabelText("ยอดหนี้ (บาท)");
    await user.clear(bal);
    await user.type(bal, "45,000");
    const apr = tool.getByLabelText("ดอกเบี้ยต่อปี (%)");
    await user.clear(apr); // invalid: empty
    const saved = JSON.parse(localStorage.getItem("debtcalc.v1")!);
    expect(saved.single.bal).toBe("45,000");
    expect(saved.single.apr).toBe("16");
  });

  test("the language link carries the last valid numbers, not a half-typed field", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    const tool = within(await screen.findByTestId("tool-panel"));
    await user.clear(tool.getByLabelText("ดอกเบี้ยต่อปี (%)"));
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en#" + encodeState(defaultState("th")));
  });

  test("an invalid section in a loaded link falls back to defaults in both the form and the results", async () => {
    const st = defaultState("th");
    st.single.bal = "45,000";
    st.single.apr = "";
    history.replaceState(null, "", "/#" + encodeState(st));
    render(<Calculator lang="th" />);
    const tool = within(await screen.findByTestId("tool-panel"));
    expect(tool.getByLabelText("ยอดหนี้ (บาท)")).toHaveValue("30,000");
    expect(tool.getByLabelText("ดอกเบี้ยต่อปี (%)")).toHaveValue("16");
  });

  test("numbers loaded from a link are not reloaded over later edits: the state hash is removed", async () => {
    const st = defaultState("th");
    st.single.bal = "45,000";
    history.replaceState(null, "", "/#" + encodeState(st));
    render(<Calculator lang="th" />);
    await screen.findByTestId("result-B");
    expect(window.location.hash).toBe("");
    expect(JSON.parse(localStorage.getItem("debtcalc.v1")!).single.bal).toBe("45,000");
  });

  test("nav links meet the 44px touch target", async () => {
    render(<Calculator lang="th" />);
    await screen.findByTestId("result-B");
    screen.getByRole("navigation").querySelectorAll("a").forEach((a) => expect(a.className).toContain("min-h-11"));
  });
});
