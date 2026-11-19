import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test } from "vitest";
import { Calculator } from "./Calculator";

const resultCard = (key: "A" | "B") => screen.getByTestId(`result-${key}`);

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

describe("Calculator (Thai)", () => {
  test("defaults show method A and B results", async () => {
    render(<Calculator lang="th" />);
    expect(await within(resultCard("B")).findByText("2 ปี")).toBeInTheDocument();
    expect(within(resultCard("B")).getByText("5,126.95 บาท")).toBeInTheDocument();
    expect(within(resultCard("A")).getByText("34 ปี 10 เดือน")).toBeInTheDocument();
  });

  test("invalid balance shows inline error and keeps last results", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    await screen.findByTestId("result-B");
    const bal = within(document.getElementById("tool")!).getByLabelText("ยอดหนี้ (บาท)");
    await user.clear(bal);
    await user.type(bal, "abc");
    expect(bal).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("ยอดหนี้ต้องเป็นตัวเลขมากกว่า 0")).toBeInTheDocument();
    expect(within(resultCard("B")).getByText("2 ปี")).toBeInTheDocument();
  });

  test("the 400 example warns that the debt never decreases", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    await user.click(await screen.findByRole("button", { name: "ตัวอย่าง: จ่ายคงที่ต่ำกว่าดอกเบี้ย (400)" }));
    const b = resultCard("B");
    expect(within(b).getByText(/หนี้จะไม่ลดเลย/)).toHaveTextContent("400.00 บาท");
    expect(within(b).getByText("ไม่หมด")).toBeInTheDocument();
  });

  test("an old share link loads its numbers", async () => {
    const st = {
      single: { bal: "30,000", apr: "16", m: "5", floor: "0", p: "2,000", n: "24" },
      multi: { budget: "3,000", cards: [
        { name: "บัตร A", balance: "20,000", apr: "24", m: "5", floor: "200" },
        { name: "บัตร B", balance: "8,000", apr: "18", m: "5", floor: "200" },
      ] },
    };
    history.replaceState(null, "", "/#" + encodeURIComponent(JSON.stringify(st)));
    render(<Calculator lang="th" />);
    expect(await within(resultCard("B")).findByText("1 ปี 5 เดือน")).toBeInTheDocument();
    expect(screen.getByText("ใช้ตัวเลขจากลิงก์แล้ว")).toBeInTheDocument();
  });

  test("server render shows a loading skeleton, not default numbers", () => {
    const html = renderToString(<Calculator lang="th" />);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("34 ปี 10 เดือน");
  });

  test("required payment for N months and using it as method B", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    expect(await screen.findByText("1,469.00 บาท")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ใช้เป็นยอดจ่ายคงที่ (วิธี B)" }));
    expect(screen.getByLabelText("จ่ายคงที่ต่อเดือน (บาท)")).toHaveValue("1,469");
  });
});

describe("Calculator (English)", () => {
  test("shows English results", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="en" />);
    expect(await within(resultCard("B")).findByText("2 years")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Example: fixed payment below the interest (400)" }));
    expect(within(resultCard("B")).getByText("Never")).toBeInTheDocument();
  });
});
