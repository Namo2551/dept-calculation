import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { encodeState } from "@/lib/debt";
import { defaultState } from "@/lib/state";
import { Calculator } from "./Calculator";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

describe("Nav", () => {
  test("Thai page links to English with the current numbers", async () => {
    render(<Calculator lang="th" />);
    await screen.findByTestId("result-B");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en#" + encodeState(defaultState("th")));
  });

  test("English page links back to Thai and keeps edited numbers", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="en" />);
    const p = await screen.findByLabelText("Fixed payment per month (baht)");
    await user.clear(p);
    await user.type(p, "2,000");
    const expected = defaultState("en");
    expected.single.p = "2,000";
    expect(screen.getByRole("link", { name: "ไทย" })).toHaveAttribute("href", "/#" + encodeState(expected));
  });

  test("section links exist and the why link opens the explainer", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    await screen.findByTestId("result-B");
    const nav = screen.getByRole("navigation");
    for (const id of ["tool", "results-sec", "chart-sec", "multi", "why"]) expect(nav.querySelector(`a[href="#${id}"]`)).not.toBeNull();
    const why = document.getElementById("why") as HTMLDetailsElement;
    expect(why.open).toBe(false);
    await user.click(nav.querySelector('a[href="#why"]')!);
    expect(why.open).toBe(true);
  });
});
