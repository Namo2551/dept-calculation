import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { ChapterTag } from "./ChapterTag";
import { ReportSection } from "./ReportSection";

describe("ReportSection", () => {
  test("shows its number, title and chapter tag", () => {
    render(<ReportSection k="chart"><p>chart here</p></ReportSection>);
    const sec = document.getElementById("sec-chart")!;
    expect(within(sec).getByRole("heading", { level: 2, name: "Balance by month" })).toBeInTheDocument();
    expect(within(sec).getByText("3")).toBeInTheDocument();
    expect(within(sec).getByLabelText("CPE111 Chapter 8, Recurrence relations")).toBeInTheDocument();
    expect(sec).toHaveAttribute("aria-labelledby", "sec-chart-h");
  });

  test("the Why? button in the header opens and closes the math", async () => {
    const user = userEvent.setup();
    render(<ReportSection k="chart" why={<p>proof</p>} whyTopic="the balance chart"><p>chart here</p></ReportSection>);
    expect(screen.queryByText("proof")).not.toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Why? the balance chart" });
    expect(btn.closest("header")).not.toBeNull();
    expect(btn).toHaveAttribute("aria-controls", "sec-chart-why");
    await user.click(btn);
    expect(screen.getByText("proof")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide the math: the balance chart" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Hide the math: the balance chart" }));
    expect(screen.queryByText("proof")).not.toBeInTheDocument();
  });

  test("no Why? button without math", () => {
    render(<ReportSection k="inputs"><p>inputs</p></ReportSection>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("a section can carry two chapter tags", () => {
    render(<ReportSection k="risk"><p>risk</p></ReportSection>);
    expect(screen.getByLabelText("CPE111 Chapter 7, Discrete probability")).toBeInTheDocument();
    expect(screen.getByLabelText("CPE111 Chapter 6, Counting")).toBeInTheDocument();
  });
});

describe("ChapterTag", () => {
  test("full and compact forms", () => {
    render(<><ChapterTag ch="8" /><ChapterTag ch="1-5" compact /></>);
    expect(screen.getByText("Ch 8 · Recurrence relations")).toBeInTheDocument();
    const compact = screen.getByLabelText("CPE111 Chapter 1 & 5, Mathematical reasoning");
    expect(compact).toHaveTextContent("1·5");
  });
});
