# Payoff date, one-time bonus, interest limit

Date: 2026-11-22
Status: approved by the owner ("Yes please")
Builds on: `2026-11-22-chapter-report-layout-design.md` (the 7-section report; the Ch 7 and Ch 13 sections were removed at the owner's request)

## Intent

The owner wants three practical additions that are easy to use: a real payoff date, a one-time bonus payment that stays hidden until the user says they have one, and a way to keep total interest under a limit.

## Approaches

There's one sensible way: each feature reuses the existing month-by-month simulation and sits in the section it belongs to. Changing the main results or charts for the bonus was set aside because it would mix a "what if" into the main answer, the same reason "Pay extra" is kept in its own box.

## Design

1. **Payoff date (Ch 8).** Each result card (A and B) and the "Pay extra" result show the month and year next to the duration, e.g. `2 years · March 2029`. The date counts from the current month: month 1 is next month. If a plan never ends, no date is shown.
2. **One-time bonus (Ch 8), section 5.** At first only a button shows: "I have a bonus". Clicking it reveals a box with Bonus amount (baht, > 0), In month (whole number 1 to 1200), and a "Remove bonus" link that hides the box again (keyboard focus returns to the button). The box shows, for method B with the bonus: paid off in (with date), months sooner, and interest saved. A bonus month after method B has already paid off says so. It doesn't change the main results or charts and isn't saved or shared.
3. **Keep interest under a limit (Ch 3 binary search), section 5.** One input: "Most interest I want to pay (baht)", default 3,000. Output: the smallest whole-baht fixed monthly payment whose total interest is ≤ the limit, with its paid-off time and date, and the list of search steps (low, high, guess, its interest, "too high" or "OK"). A "Use as the fixed payment (method B)" button. A limit of 0 is allowed (the answer is paying everything in month 1). The limit is part of the saved and shared inputs as an optional field `lim` (old links get 3,000), validated on its own so a bad limit never freezes the other results.
4. **Section 5** gets the Ch 3 · Algorithms tag (tags: Ch 8, Ch 2, Ch 3). Layout: "Debt-free in N months" and "Keep interest under a limit" side by side at xl, then "Pay extra", then the bonus button or box.

## Constraints

The existing debt math and parity test are unchanged (new logic lives in new pure functions with unit tests). Same look, accessibility and copy rules as before; static export.

## Left to the builder

Exact wording of the bonus and limit copy, the step list's layout, and how many search steps to show (all of them; at most about 20 for the payment range).
