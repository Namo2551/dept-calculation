import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Calculator } from "./Calculator";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});
afterEach(() => vi.restoreAllMocks());

async function openTable(lang: "th" | "en") {
  const user = userEvent.setup();
  render(<Calculator lang={lang} />);
  const box = (await screen.findByText(lang === "th" ? "ตารางทีละเดือน" : "Month-by-month table")).closest("details")!;
  return { user, box };
}

describe("MonthlyTable", () => {
  test("rows render only while open; method B has 24 rows", async () => {
    const { user, box } = await openTable("th");
    expect(box).toHaveAttribute("id", "tableBox");
    expect(box.querySelectorAll("tbody tr").length).toBe(0);
    await user.click(within(box).getByText("ตารางทีละเดือน"));
    expect(box.querySelectorAll("tbody tr").length).toBe(418);
    await user.click(within(box).getByRole("radio", { name: "วิธี B: จ่ายคงที่" }));
    const rows = box.querySelectorAll("tbody tr");
    expect(rows.length).toBe(24);
    expect(rows[23].querySelectorAll("td")[3]).toHaveTextContent("626.95");
  });

  test("CSV download has a BOM, the language's header and the method in its name", async () => {
    let blob: Blob | null = null;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return "blob:test";
    });
    URL.revokeObjectURL = vi.fn();
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    const { user, box } = await openTable("en");
    await user.click(within(box).getByText("Month-by-month table"));
    await user.click(within(box).getByRole("radio", { name: "Method B: fixed payment" }));
    await user.click(within(box).getByRole("button", { name: "Download as CSV" }));
    expect(names).toEqual(["debt-B.csv"]);
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM (Blob.text() would strip it)
    expect((await blob!.text()).split("\n")[0]).toBe("Month,Start balance,Interest,Payment,End balance");
  });
});
