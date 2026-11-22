import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ComparePicker } from "./ComparePicker";
import { PlansTable, type PlanListItem } from "./PlansTable";

const actions = vi.hoisted(() => ({ renamePlan: vi.fn(), duplicatePlan: vi.fn(), deletePlan: vi.fn() }));
vi.mock("@/app/(app)/plans/actions", () => actions);

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const items: PlanListItem[] = [
  { id: A, name: "Card A", balance: "30,000 baht", payment: "1,500 baht", months: "2 years", updated: "22 Nov 2026" },
  { id: B, name: "Car loan", balance: "10,000 baht", payment: "1,000 baht", months: "11 months", updated: "21 Nov 2026" },
];

beforeEach(() => Object.values(actions).forEach((f) => f.mockReset()));

const row = (name: string) => screen.getByRole("row", { name: new RegExp(name) });

describe("PlansTable", () => {
  test("lists each plan with its figures and links", () => {
    render(<PlansTable items={items} />);
    const r = row("Card A");
    expect(within(r).getByText("30,000 baht")).toBeInTheDocument();
    expect(within(r).getByText("2 years")).toBeInTheDocument();
    expect(within(r).getByRole("link", { name: "Open in calculator" })).toHaveAttribute("href", `/calculator?plan=${A}`);
    expect(within(r).getByRole("link", { name: "Details" })).toHaveAttribute("href", `/plans/${A}`);
    expect(screen.getAllByRole("columnheader").length).toBe(6);
  });

  test("rename opens an inline field and posts the new name", async () => {
    actions.renamePlan.mockResolvedValue({ message: "Name saved.", tone: "good", planId: A, name: "Card A2" });
    const user = userEvent.setup();
    render(<PlansTable items={items} />);
    await user.click(within(row("Card A")).getByRole("button", { name: "Rename" }));
    const input = screen.getByLabelText("New name for Card A");
    await user.clear(input);
    await user.type(input, "Card A2");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(actions.renamePlan).toHaveBeenCalled());
    const fd = actions.renamePlan.mock.calls[0][1] as FormData;
    expect(fd.get("id")).toBe(A);
    expect(fd.get("name")).toBe("Card A2");
    expect(await screen.findByText("Name saved.")).toBeInTheDocument();
  });

  test("a rename error shows next to the field", async () => {
    actions.renamePlan.mockResolvedValue({ errors: { name: "You already have a plan with this name. Pick another name." } });
    const user = userEvent.setup();
    render(<PlansTable items={items} />);
    await user.click(within(row("Card A")).getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("You already have a plan with this name. Pick another name.")).toBeInTheDocument();
  });

  test("duplicate posts the plan id", async () => {
    actions.duplicatePlan.mockResolvedValue({ message: "Made a copy: Card A (copy).", tone: "good" });
    const user = userEvent.setup();
    render(<PlansTable items={items} />);
    await user.click(within(row("Card A")).getByRole("button", { name: "Duplicate" }));
    await waitFor(() => expect(actions.duplicatePlan).toHaveBeenCalled());
    expect((actions.duplicatePlan.mock.calls[0][1] as FormData).get("id")).toBe(A);
    expect(await screen.findByText("Made a copy: Card A (copy).")).toBeInTheDocument();
  });

  test("delete asks for a second click first", async () => {
    actions.deletePlan.mockResolvedValue({ message: "Plan deleted.", tone: "good" });
    const user = userEvent.setup();
    render(<PlansTable items={items} />);
    await user.click(within(row("Car loan")).getByRole("button", { name: "Delete" }));
    expect(actions.deletePlan).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Really delete Car loan?" }));
    await waitFor(() => expect(actions.deletePlan).toHaveBeenCalled());
    expect((actions.deletePlan.mock.calls[0][1] as FormData).get("id")).toBe(B);
  });
});

describe("ComparePicker", () => {
  test("a GET form to /plans/compare with two plan selects", () => {
    render(<ComparePicker plans={items.map(({ id, name }) => ({ id, name }))} />);
    const a = screen.getByLabelText("First plan") as HTMLSelectElement;
    const b = screen.getByLabelText("Second plan") as HTMLSelectElement;
    expect(a.name).toBe("a");
    expect(b.name).toBe("b");
    expect(a.value).toBe(A);
    expect(b.value).toBe(B);
    const form = a.closest("form")!;
    expect(form.getAttribute("action")).toBe("/plans/compare");
    expect(form.getAttribute("method")).toBe("get");
  });

  test("asks for two plans when there is only one", () => {
    render(<ComparePicker plans={[{ id: A, name: "Card A" }]} />);
    expect(screen.getByText("Save at least two plans to compare them.")).toBeInTheDocument();
    expect(screen.queryByLabelText("First plan")).not.toBeInTheDocument();
  });
});
