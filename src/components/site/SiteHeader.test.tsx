import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SiteHeader } from "./SiteHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/charts",
}));

const labels = ["Calculator", "Charts", "Several cards", "Why it happens"];

function menuPanel() {
  const button = screen.getByRole("button", { name: "Menu" });
  const id = button.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  return { button, panel: document.getElementById(id!) };
}

describe("SiteHeader", () => {
  test("marks the current page link with aria-current", () => {
    render(<SiteHeader />);
    const charts = screen.getAllByRole("link", { name: "Charts" });
    expect(charts.length).toBeGreaterThan(0);
    for (const a of charts) expect(a).toHaveAttribute("aria-current", "page");
    for (const a of screen.getAllByRole("link", { name: "Calculator" })) expect(a).not.toHaveAttribute("aria-current");
  });

  test("the menu button opens a panel with all four links", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const { button } = menuPanel();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(menuPanel().panel).toBeNull();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const { panel } = menuPanel();
    expect(panel).not.toBeNull();
    for (const name of labels) expect(within(panel!).getByRole("link", { name })).toBeInTheDocument();
    expect(within(panel!).getByRole("link", { name: "Open the calculator" })).toHaveAttribute("href", "/calculator");
  });

  test("Escape closes the menu and focuses the menu button", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const { button } = menuPanel();
    await user.click(button);
    within(menuPanel().panel!).getByRole("link", { name: "Charts" }).focus();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(menuPanel().panel).toBeNull();
    expect(button).toHaveFocus();
  });

  test("a link click closes the menu and focuses the menu button", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const { button } = menuPanel();
    await user.click(button);
    const panel = menuPanel().panel!;
    // jsdom cannot load another document; stop the browser navigation, Link still runs its onClick.
    panel.addEventListener("click", (e) => e.preventDefault());
    await user.click(within(panel).getByRole("link", { name: "Why it happens" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  test("every header link and button is at least 44px tall", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const header = screen.getByRole("banner");
    const targets = [...within(header).getAllByRole("link"), ...within(header).getAllByRole("button")];
    expect(targets.length).toBeGreaterThan(10);
    for (const el of targets) expect(el.className).toMatch(/(^|\s)(min-h-11|h-11|h-12)(\s|$)/);
  });
});
