import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { Calculator } from "./Calculator";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

const strat = (key: "minonly" | "avalanche" | "snowball") => screen.getByTestId(`strat-${key}`);

describe("MultiCard", () => {
  test("default cards: results per strategy and the least-interest badge", async () => {
    render(<Calculator lang="th" />);
    const av = await screen.findByTestId("strat-avalanche");
    expect(within(av).getByText("1 ปี")).toBeInTheDocument();
    expect(within(av).getByText("3,390.91 บาท")).toBeInTheDocument();
    expect(within(strat("snowball")).getByText("3,827.52 บาท")).toBeInTheDocument();
    expect(within(strat("minonly")).getByText("6 ปี 7 เดือน")).toBeInTheDocument();
    const badge = "✓ ดอกเบี้ยน้อยที่สุดในการจำลองนี้";
    expect(within(av).getByText(badge)).toBeInTheDocument();
    expect(within(strat("snowball")).queryByText(badge)).toBeNull();
    expect(within(strat("minonly")).queryByText(badge)).toBeNull();
  });

  test("a budget below the minimums warns", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    const budget = await screen.findByLabelText("งบจ่ายหนี้รวมต่อเดือน (บาท)");
    await user.clear(budget);
    await user.type(budget, "1,000");
    expect(screen.getByText(/งบน้อยกว่าขั้นต่ำรวมเดือนแรก/)).toHaveTextContent("1,600.00 บาท");
  });

  test("card count stays between 2 and 5", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="th" />);
    const add = await screen.findByRole("button", { name: "+ เพิ่มบัตร" });
    await user.click(add);
    await user.click(add);
    expect(screen.getAllByLabelText("ชื่อบัตร")).toHaveLength(5);
    expect(add).toBeDisabled();
    const remove = () => screen.getAllByRole("button", { name: "ลบใบนี้" });
    await user.click(remove()[4]);
    await user.click(remove()[3]);
    await user.click(remove()[2]);
    expect(screen.getAllByLabelText("ชื่อบัตร")).toHaveLength(2);
    remove().forEach((b) => expect(b).toBeDisabled());
  });

  test("an empty card name shows as unnamed in the payoff order", async () => {
    const user = userEvent.setup();
    render(<Calculator lang="en" />);
    const name = (await screen.findAllByLabelText("Card name"))[0];
    await user.clear(name);
    expect(within(strat("avalanche")).getByText(/Unnamed/)).toBeInTheDocument();
  });
});
