import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalcProvider } from "@/components/CalcProvider";
import { Ready } from "@/components/Ready";
import { SingleCardForm } from "@/components/calculator/SingleCardForm";

const signedIn = vi.hoisted(() => ({ value: false as boolean | null }));
vi.mock("@/hooks/useSignedIn", () => ({ useSignedIn: () => signedIn.value }));

const actions = vi.hoisted(() => ({
  savePlanFromCalculator: vi.fn(),
  updatePlanFromCalculator: vi.fn(),
  loadPlanForCalculator: vi.fn(),
}));
vi.mock("@/app/(app)/plans/actions", () => actions);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/calculator",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const ID = "11111111-1111-4111-8111-111111111111";

function renderForm() {
  return render(
    <CalcProvider>
      <Ready>
        <SingleCardForm />
      </Ready>
    </CalcProvider>,
  );
}

const balance = () => within(document.getElementById("tool")!).getByLabelText("Balance (baht)") as HTMLInputElement;

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/calculator");
  signedIn.value = false;
  Object.values(actions).forEach((f) => f.mockReset());
});

describe("Save plan in the calculator", () => {
  test("signed out shows a sign-in link", async () => {
    renderForm();
    const link = await screen.findByRole("link", { name: "Sign in to save plans" });
    expect(link).toHaveAttribute("href", "/login?next=/calculator");
  });

  test("signed in saves the current inputs under a name and links to the plan", async () => {
    signedIn.value = true;
    actions.savePlanFromCalculator.mockResolvedValue({ message: 'Saved "Card A".', tone: "good", planId: ID, name: "Card A" });
    const user = userEvent.setup();
    renderForm();
    await user.click(await screen.findByRole("button", { name: "Save plan" }));
    await user.type(screen.getByLabelText("Plan name"), "Card A");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(actions.savePlanFromCalculator).toHaveBeenCalled());
    const fd = actions.savePlanFromCalculator.mock.calls[0][1] as FormData;
    expect(fd.get("name")).toBe("Card A");
    expect(fd.get("bal")).toBe("30,000");
    expect(fd.get("p")).toBe("1,500");
    expect(fd.get("n")).toBe("24");
    expect(await screen.findByText('Saved "Card A".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the plan" })).toHaveAttribute("href", `/plans/${ID}`);
    // the saved plan is now open, so its changes can be saved
    expect(screen.getByRole("button", { name: "Save changes to Card A" })).toBeInTheDocument();
  });

  test("a duplicate name shows a field error", async () => {
    signedIn.value = true;
    actions.savePlanFromCalculator.mockResolvedValue({ errors: { name: "You already have a plan with this name. Pick another name." } });
    const user = userEvent.setup();
    renderForm();
    await user.click(await screen.findByRole("button", { name: "Save plan" }));
    await user.type(screen.getByLabelText("Plan name"), "Card A");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("You already have a plan with this name. Pick another name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Plan name")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Opening a plan with ?plan=<id>", () => {
  test("loads the plan's inputs and offers to save changes to it", async () => {
    signedIn.value = true;
    history.replaceState(null, "", `/calculator?plan=${ID}`);
    actions.loadPlanForCalculator.mockResolvedValue({
      ok: true,
      id: ID,
      name: "Car loan",
      single: { bal: "10,000", apr: "12", m: "5", floor: "0", p: "1,000", n: "12", lim: "500" },
    });
    actions.updatePlanFromCalculator.mockResolvedValue({ message: 'Saved changes to "Car loan".', tone: "good", planId: ID, name: "Car loan" });
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(balance().value).toBe("10,000"));
    expect(actions.loadPlanForCalculator).toHaveBeenCalledWith(ID);
    expect(screen.getByText('Opened "Car loan" in the calculator.')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes to Car loan" }));
    await waitFor(() => expect(actions.updatePlanFromCalculator).toHaveBeenCalled());
    const fd = actions.updatePlanFromCalculator.mock.calls[0][1] as FormData;
    expect(fd.get("id")).toBe(ID);
    expect(fd.get("bal")).toBe("10,000");
    expect(await screen.findByText('Saved changes to "Car loan".')).toBeInTheDocument();
  });

  test("a plan that isn't found leaves the calculator as is", async () => {
    signedIn.value = true;
    history.replaceState(null, "", "/calculator?plan=nope");
    actions.loadPlanForCalculator.mockResolvedValue({ ok: false });
    renderForm();
    expect(await screen.findByText("Plan not found. The calculator keeps its current numbers.")).toBeInTheDocument();
    expect(balance().value).toBe("30,000");
    expect(screen.queryByRole("button", { name: /Save changes to/ })).not.toBeInTheDocument();
  });
});
