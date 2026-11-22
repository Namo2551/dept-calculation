import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { BarChart } from "./BarChart";

const bars = [
  { label: "Jan", value: 1500, marker: 1500 },
  { label: "Feb", value: 800, marker: 1500 },
  { label: "Mar", value: 0, marker: 1200 },
];

describe("BarChart", () => {
  test("an accessible svg with one bar per month and a marker for each planned value", () => {
    const { container } = render(<BarChart bars={bars} aria="Payments per month" />);
    expect(screen.getByRole("img", { name: "Payments per month" })).toBeInTheDocument();
    expect(container.querySelectorAll("rect[data-bar]")).toHaveLength(3);
    expect(container.querySelectorAll("line[data-marker]")).toHaveLength(3);
    expect(container.textContent).toContain("Feb");
  });

  test("all zeros never print NaN or Infinity, and bars without a marker draw none", () => {
    const { container } = render(<BarChart bars={[{ label: "Jan", value: 0 }, { label: "Feb", value: 0 }]} aria="flat" />);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(container.querySelectorAll("line[data-marker]")).toHaveLength(0);
  });
});
