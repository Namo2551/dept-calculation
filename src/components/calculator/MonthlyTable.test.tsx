import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import CalculatorPage from "@/app/calculator/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams(window.location.search) }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});
afterEach(() => vi.restoreAllMocks());

async function openTable() {
  const user = userEvent.setup();
  render(<CalcProvider><CalculatorPage /></CalcProvider>);
  const summary = await screen.findByText("Month-by-month table");
  const box = summary.closest("details")!;
  await user.click(summary);
  return { user, box };
}

describe("MonthlyTable", () => {
  test("the table starts closed with no rows rendered", async () => {
    render(<CalcProvider><CalculatorPage /></CalcProvider>);
    const box = (await screen.findByText("Month-by-month table")).closest("details")!;
    expect(box).not.toHaveAttribute("open");
    expect(box.querySelectorAll("tbody tr").length).toBe(0);
  });

  test("rows render once opened; method B has 24 rows", async () => {
    const { user, box } = await openTable();
    expect(box).toHaveAttribute("id", "tableBox");
    expect(box).toHaveAttribute("open");
    expect(box.querySelectorAll("tbody tr").length).toBe(418);
    await user.click(within(box).getByRole("radio", { name: "Method B: fixed payment" }));
    const rows = box.querySelectorAll("tbody tr");
    expect(rows.length).toBe(24);
    expect(rows[23].querySelectorAll("td")[3]).toHaveTextContent("626.95");
  });

  test("CSV download has a BOM, the header and the method in its name", async () => {
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
    const { user, box } = await openTable();
    await user.click(within(box).getByRole("radio", { name: "Method B: fixed payment" }));
    await user.click(within(box).getByRole("button", { name: "Download as CSV" }));
    expect(names).toEqual(["debt-B.csv"]);
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM (Blob.text() would strip it)
    expect((await blob!.text()).split("\n")[0]).toBe("Month,Start balance,Interest,Payment,End balance");
  });
});
