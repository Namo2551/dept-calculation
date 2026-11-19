import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { Calculator } from "@/components/calculator/Calculator";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

const byTestId = (id: string) => screen.getByTestId(id);

describe("MathExplainer", () => {
  test("recurrence walk matches the closed form at month 3; slider stops at 23", async () => {
    render(<Calculator lang="th" />);
    const walk = await screen.findByTestId("walk");
    const slider = within(walk).getByRole("slider");
    expect(slider).toHaveAttribute("max", "23");
    expect(slider).toHaveValue("3");
    expect(within(walk).getAllByText("26,655.80 บาท")).toHaveLength(2);
    expect(within(walk).getByText("✓ เท่ากัน")).toBeInTheDocument();
  });

  test("induction ladder at k = 11 reaches the closed form at 12", async () => {
    render(<Calculator lang="th" />);
    const ladder = await screen.findByTestId("ladder");
    fireEvent.change(within(ladder).getByRole("slider"), { target: { value: "11" } });
    expect(within(byTestId("ladder-3")).getByText(/15,787\.66/)).toBeInTheDocument();
    expect(within(ladder).getByText(/^✓ ② เท่ากับ ③/)).toBeInTheDocument();
  });

  test("proof 3 reacts to whether the payment covers the interest", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    expect(await screen.findByTestId("proof3")).toHaveTextContent("ไม่เข้าเงื่อนไข");
    await user.click(screen.getAllByRole("button", { name: "ตัวอย่าง: จ่ายคงที่ต่ำกว่าดอกเบี้ย (400)" })[0]);
    expect(byTestId("proof3")).toHaveTextContent("เข้าเงื่อนไข (p ≤ r·B0) หนี้ไม่ลด");
  });

  test("English names the induction steps", async () => {
    render(<Calculator lang="en" />);
    const proof1 = await screen.findByTestId("proof1");
    expect(proof1).toHaveTextContent("Basis step");
    expect(proof1).toHaveTextContent("Inductive step");
  });
});
