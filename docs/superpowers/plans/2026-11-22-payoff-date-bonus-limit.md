# Payoff Date, Bonus, Interest Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a payoff month and year, add a hidden-until-asked one-time bonus box, and add a "keep interest under a limit" box that finds the payment by binary search.

**Architecture:** New pure functions (`payoffDate` in `format.ts`, `simulateWithBonus` and `paymentForInterestLimit` in a new `src/lib/plans.ts`) with unit tests. Two new section-5 components (`BonusPayment`, `InterestLimit`). The result cards and Pay extra show the date. One optional saved input `lim`.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-payoff-date-bonus-limit-design.md`

## Global Constraints

- `src/lib/debt.ts` and the parity test stay unchanged.
- Old share links and saved data without `lim` load with `lim: "3,000"`.
- All visible copy in `src/copy/index.ts`. No em/en dashes. 44 px targets, visible focus.
- Before each commit: `npm test`, `npm run typecheck`, `npm run lint` pass.

## Review Focus

- **Limit lower than even paying everything next month allows** (e.g. 0): explain that it can't be reached and show the full payoff amount, instead of looping or showing NaN. Test in Task 1 and Task 3.
- **Bonus month after method B is already paid off** (month 30 with a 24-month plan): say the plan finishes before then, with no change. Test in Task 1 and Task 4.
- **Bonus larger than the balance left:** the debt is cleared in that month, with no negative balance. Test in Task 1.
- **Method B never pays off** (fixed 400): the date is hidden, the bonus box still works (a big bonus can make it end), and the limit box still answers because it searches its own payment. Test in Task 2 and Task 4.
- **Half-typed limit or bonus fields** ("", "abc"): inline error, last valid answer stays, the other results are not frozen. Test in Task 3 and Task 4.

---

### Task 1: Pure math

**Files:**
- Modify: `src/lib/format.ts`
- Create: `src/lib/plans.ts`
- Test: `src/lib/format.test.ts`, `src/lib/plans.test.ts`

**Interfaces (produced):**
- `payoffDate(months: number, now: Date): string`, in `format.ts`. Month 1 is the month after `now`. It returns English "Month YYYY", e.g. `"November 2028"`.
- `simulateWithBonus(o: { balance: number; apr: number; p: number; amount: number; month: number }): { months: number | null; totalInterest: number | null; afterPayoff: boolean }`, in `plans.ts`. It is the same month-by-month rule as `simulate` fixed (interest = start·r, pay `min(p, due)`, paid off at ≤ 0.005, at most 1,200 months). In month `month`, `min(amount, what is left after the normal payment)` is paid on top. `afterPayoff` is true when the plan without the bonus ends before `month`. Total interest = everything paid − balance.
- `type SearchStep = { low: number; high: number; guess: number; interest: number | null; ok: boolean }`
- `paymentForInterestLimit(balance: number, apr: number, limit: number): { payment: number; months: number; interest: number; reachable: boolean; steps: SearchStep[] }`. Binary search over whole-baht `p` in `[floor(r·B)+1, ceil(B·(1+r))]` for the smallest `p` whose total interest (via `simulate` fixed) is ≤ `limit`. If even `ceil(B·(1+r))` exceeds the limit, it returns that payment with `reachable: false`. When `r = 0`, the range starts at 1.

- [ ] **Step 1: Write failing tests**
  - `payoffDate(24, new Date(2026, 10, 22))` is `"November 2028"`. `payoffDate(1, new Date(2026, 11, 5))` is `"January 2027"`.
  - `simulateWithBonus({balance:30000, apr:16, p:1500, amount:0, month:6})` gives months 24 and totalInterest ≈ 5126.95 (toBeCloseTo, 2), matching `simulate`.
  - With amount 10,000 at month 6, months < 24 and totalInterest < 5126.95.
  - With amount 100,000 at month 3, months is 3 (cleared, no negative balance).
  - With amount 5,000 at month 30, afterPayoff is true and months is 24.
  - With p 400 (never pays off alone) and amount 30,000 at month 1, months is not null.
  - `paymentForInterestLimit(30000, 16, 3000)` gives payment 2431, interest ≤ 3000, `simulate` with p 2430 has interest > 3000, reachable true, 1 ≤ steps.length ≤ 20, and the last step is ok.
  - `paymentForInterestLimit(30000, 16, 0)` gives reachable false and payment 30400.
- [ ] **Step 2: Run** `npx vitest run src/lib/format.test.ts src/lib/plans.test.ts` and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command and expect PASS.
- [ ] **Step 5: Commit** `feat: payoff date, bonus and interest-limit math`.

### Task 2: Payoff date on the results

**Files:** Modify `src/components/calculator/ResultCards.tsx`, `src/components/calculator/ExtraPayment.tsx`, `src/copy/index.ts`. Test: `src/components/calculator/CalculatorPage.test.tsx`.

**Interfaces:**
- Consumes `payoffDate`.
- A small `<p className="text-sm text-muted">` under each "Paid off in" stat with copy `results.onDate(date)` = `` `Debt-free in ${date}` ``. Hidden when `months === null`.
- "Now" is read once per render via `new Date()`. Tests set the time with `vi.setSystemTime(new Date(2026, 10, 22))`.

- [ ] **Step 1: Failing tests** (fake timers with `shouldAdvanceTime: true`, system time 2026-11-22):
  - result B shows `Debt-free in November 2028`, and result A shows `Debt-free in` + payoffDate(418).
  - After the 400 example, result B has no "Debt-free in".
- [ ] **Step 2: Run** `npx vitest run src/components/calculator/CalculatorPage.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement**, and add the same line under the Pay extra result.
- [ ] **Step 4: Run** `npm test` and expect PASS.
- [ ] **Step 5: Commit** `feat: show the payoff month and year`.

### Task 3: Keep interest under a limit (Ch 3)

**Files:** Modify `src/lib/state.ts`, `src/lib/calc.ts`, `src/hooks/useCalculator.ts`, `src/copy/index.ts`, `src/app/calculator/page.tsx`. Create `src/components/calculator/InterestLimit.tsx`. Tests: `src/lib/state.test.ts`, `src/lib/calc.test.ts`, `src/components/calculator/InterestLimit.test.tsx`.

**Interfaces:**
- `SingleRaw` gains `lim: string`, default `"3,000"`, `RuleKey` `"lim"` with rule `v >= 0`. `SINGLE_RULES` gets `lim`.
- `singleIsValid` still checks only the six card fields. `keepValid(prev, raw)` takes the card fields as before, plus `lim` from `raw` when it is valid on its own, otherwise from `prev`. `computeSingle(...).v.lim: number`.
- `applyLimitPayment()` is added to the calculator context (like `applyRequiredPayment`). It sets `p` to the found payment.
- `InterestLimit()` is a Panel (h3 `limit.heading` = "Keep total interest under a limit") with:
  - a NumberField `limit.label` = "Most interest I want to pay (baht)"
  - a big stat `limit.pay` = "Pay each month (whole baht)", plus paid-off time + `Debt-free in …`
  - when unreachable, `limit.unreachable(fee)` = `` `Even paying everything next month costs ${fee} baht of interest, so this limit can't be met.` ``
  - an `<ol aria-label="Search steps">` where each step reads `` `Try ${guess} baht: interest ${x} baht, ${ok ? "OK" : "too high"} (range ${low} to ${high})` ``
  - a button `limit.use` = "Use as the fixed payment (method B)"
  - a note `limit.note` = "Binary search: each guess halves the range of payments still possible."
- Copy `errors.lim` = "The limit must be 0 or more". Section `plan` chapters become `["8", "2", "3"]`.
- Section 5 layout: `grid gap-6 xl:grid-cols-2` holding RequiredPayment and InterestLimit, then ExtraPayment, then the bonus (Task 4).

- [ ] **Step 1: Failing tests:**
  - state: defaults include `lim: "3,000"`, and an old link without `lim` loads `"3,000"`.
  - calc: `keepValid(def, {...def, lim: "abc", bal: "50,000"})` has bal `"50,000"` and lim `"3,000"`.
  - InterestLimit (on the calculator page):
    - the box shows `2,431.00 baht` and the search list has ≥ 1 item.
    - clicking Use sets the fixed payment field to `2,431`.
    - pasting `0` shows the unreachable sentence with `400.00`.
    - pasting `abc` shows "The limit must be 0 or more" and still shows `2,431.00 baht`.
  - The `sec-plan` header has the tag "CPE111 Chapter 3, Algorithms".
- [ ] **Step 2: Run** `npx vitest run src/lib src/components/calculator/InterestLimit.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and expect PASS.
- [ ] **Step 5: Commit** `feat: keep interest under a limit with binary search`.

### Task 4: One-time bonus, hidden until asked

**Files:** Create `src/components/calculator/BonusPayment.tsx`. Modify `src/copy/index.ts`, `src/app/calculator/page.tsx`. Test: `src/components/calculator/BonusPayment.test.tsx`.

**Interfaces:**
- `BonusPayment()` uses local state only (not saved): `open: boolean`, `amount: string` (default `""`), `month: string` (default `"6"`).
  - Closed, it renders only Button `bonus.open` = "I have a bonus".
  - Open, it renders a Panel (h3 `bonus.heading` = "A one-time bonus payment") with NumberFields `bonus.amount` = "Bonus amount (baht)" and `bonus.month` = "In month (1 = next month)", plus a quiet Button `bonus.remove` = "Remove bonus". Remove closes the box, clears the amount and moves focus back to the "I have a bonus" button.
  - Validation: amount > 0 (error `bonus.amountError` = "Enter a bonus above 0"), month a whole number from 1 to 1200 (error `bonus.monthError` = "The month must be a whole number from 1 to 1200").
  - With valid inputs it shows, for method B: a big stat `bonus.paidIn` = "Paid off in, with the bonus" with time + `Debt-free in …`; then `bonus.sooner` = "Months sooner" and `bonus.saved` = "Interest saved". When `afterPayoff`, it shows `bonus.tooLate(n)` = `` `Method B is already paid off in ${n} months, before this bonus.` ``
  - With no amount yet, it shows hint `bonus.hint` = "Enter the bonus and the month you expect it."

- [ ] **Step 1: Failing tests** (calculator page, inside `#sec-plan`):
  - At first there's a button "I have a bonus" and no "Bonus amount (baht)" field.
  - After clicking it, the fields show. Pasting amount `10,000` (month stays 6) shows "Months sooner" with a value of at least 1 month.
  - Month `30` shows the too-late sentence with `24`.
  - Amount `abc` shows "Enter a bonus above 0".
  - Remove hides the fields and focuses "I have a bonus".
  - After the 400 example, amount `30,000` in month 1 shows "Paid off in, with the bonus".
- [ ] **Step 2: Run** `npx vitest run src/components/calculator/BonusPayment.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement** and place it after ExtraPayment in section 5.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and expect all pass.
- [ ] **Step 5: Browser check** at 1280 and 390 wide: the date on the cards, the bonus opening and closing, the limit box and Use button, and no horizontal scroll.
- [ ] **Step 6: Commit** `feat: one-time bonus payment, hidden until asked`.
