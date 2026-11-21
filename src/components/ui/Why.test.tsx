import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { Why } from "./Why";

const setup = () => render(<Why id="why-x" topic="the chart"><p>secret math</p></Why>);

describe("Why", () => {
  test("starts closed with the math not rendered", () => {
    setup();
    const btn = screen.getByRole("button", { name: "Why? the chart" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveAttribute("aria-controls", "why-x");
    expect(screen.queryByText("secret math")).not.toBeInTheDocument();
  });

  test("a click opens it and a second click closes it", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Why? the chart" }));
    const btn = screen.getByRole("button", { name: "Hide the math: the chart" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(btn).toHaveTextContent("Hide the math");
    expect(screen.getByText("secret math")).toBeInTheDocument();
    await user.click(btn);
    expect(screen.queryByText("secret math")).not.toBeInTheDocument();
  });

  test("Enter on the focused button toggles it", async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole("button", { name: "Why? the chart" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("secret math")).toBeInTheDocument();
  });
});
