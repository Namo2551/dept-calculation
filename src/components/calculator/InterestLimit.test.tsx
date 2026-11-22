import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CalculatorPage from "@/app/calculator/page";
import { CalcProvider } from "@/components/CalcProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/calculator",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/calculator");
});

async function limitBox() {
  render(<CalcProvider><CalculatorPage /></CalcProvider>);
  await screen.findByTestId("result-B");
  return within(screen.getByTestId("limit-box"));
}

async function setLimit(user: ReturnType<typeof userEvent.setup>, box: Awaited<ReturnType<typeof limitBox>>, value: string) {
  const f = box.getByLabelText("Most interest I want to pay (baht)");
  await user.clear(f);
  await user.click(f);
  await user.paste(value);
}

describe("Keep interest under a limit (Ch 3)", () => {
  test("finds 2,431 baht a month for a 3,000 baht limit and lists the search", async () => {
    const box = await limitBox();
    expect(box.getByText("2,431.00 baht")).toBeInTheDocument();
    expect(within(box.getByRole("list", { name: "Search steps" })).getAllByRole("listitem").length).toBeGreaterThanOrEqual(1);
  });

  test("Use copies the payment into method B", async () => {
    const user = userEvent.setup();
    const box = await limitBox();
    await user.click(box.getByRole("button", { name: "Use this payment as method B" }));
    expect(screen.getByLabelText("Fixed payment per month (baht)")).toHaveValue("2,431");
  });

  test("an impossible limit is explained", async () => {
    const user = userEvent.setup();
    const box = await limitBox();
    await setLimit(user, box, "0");
    expect(box.getByText(/Even paying everything next month costs 400\.00 baht of interest/)).toBeInTheDocument();
  });

  test("a half-typed limit shows an error and keeps the last answer", async () => {
    const user = userEvent.setup();
    const box = await limitBox();
    await setLimit(user, box, "abc");
    expect(box.getByText("The limit must be 0 or more")).toBeInTheDocument();
    expect(box.getByText("2,431.00 baht")).toBeInTheDocument();
  });

  test("section 5 is tagged with Ch 3", async () => {
    await limitBox();
    const header = document.querySelector("#sec-plan > header")!;
    expect(within(header as HTMLElement).getByLabelText("CPE111 Chapter 3, Algorithms")).toBeInTheDocument();
  });
});
