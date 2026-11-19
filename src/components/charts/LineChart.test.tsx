import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LineChart } from "./LineChart";

const series = [
  { data: [30000, 20000, 10000, 0], color: "var(--series-a)", label: "A", at: 1, dy: -10 },
  { data: [30000, 25000, 20000, 15000], color: "var(--series-b)", dash: "9 6", label: "B", at: 2, dy: 22 },
];

describe("LineChart", () => {
  test("renders an accessible svg with dashed series", () => {
    const { container } = render(<LineChart len={3} ymax={30000} series={series} aria="Balance by month" lang="th" />);
    expect(screen.getByRole("img", { name: "Balance by month" })).toBeInTheDocument();
    expect(container.querySelector('path[stroke-dasharray="9 6"]')).not.toBeNull();
  });

  test("a zero maximum never prints NaN or Infinity", () => {
    const flat = [{ data: [0, 0, 0], color: "var(--series-a)", label: "A", at: 1, dy: -10 }];
    const { container } = render(<LineChart len={2} ymax={0} series={flat} aria="flat" lang="en" />);
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  test("x-axis labels follow the language", () => {
    const long = [{ data: Array.from({ length: 419 }, (_, k) => 30000 - k * 70), color: "var(--series-a)", label: "A", at: 10, dy: -10 }];
    const th = render(<LineChart len={418} ymax={30000} series={long} aria="th" lang="th" />);
    expect(th.container.textContent).toContain("10 ปี");
    th.unmount();
    const en = render(<LineChart len={418} ymax={30000} series={long} aria="en" lang="en" />);
    expect(en.container.textContent).toContain("10 yr");
  });
});
