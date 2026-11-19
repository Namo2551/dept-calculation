# Credit Card Debt Calculator (เครื่องคิดเลขหนี้บัตรเครดิต)

A Thai-language web page that answers one question: **"If I only pay the minimum, when will my credit card debt be gone?"**

The top half of the page is a working calculator for your own numbers. The bottom half explains the math behind the results with **recurrence relations** and **mathematical induction** (Discrete Math).

## Quick start

No install or build step is needed.

```sh
# Open the app
open index.html        # macOS. Or just double-click the file.

# Run the tests (requires Node.js)
node test.js
```

## Features

- **Two payment methods for one card**
  - **Method A:** pay a percentage of the remaining balance, with an optional minimum in baht
  - **Method B:** pay the same amount every month
- **Results:** months until the debt is gone, total interest paid, and a sentence comparing the two methods
- **Balance chart** with a month slider and month-by-month playback
- **Yearly breakdown** of principal vs. interest
- **"Pay off in N months":** the monthly payment you would need
- **"Pay extra" slider:** see how extra payments shorten the payoff time
- **Monthly table** that you can export to CSV
- **Several cards:** compare **avalanche** (highest APR first), **snowball** (smallest balance first) and **minimum only**, within one monthly budget
- **Save and share:** your numbers are kept in the URL hash (as a share link) and in localStorage. You can also print the page or save it as PDF.

## Example

A 30,000 baht balance at 16% APR:

| Strategy | Time to pay off | Total interest |
|---|---|---|
| 5% minimum | 34 years 10 months | 10,909.08 ฿ |
| 10% minimum | 14 years 5 months | 4,615.38 ฿ |
| 5% minimum, at least 500 ฿ | 4 years 5 months | 8,980.60 ฿ |
| Fixed 1,500 ฿/month | 2 years | 5,126.95 ฿ |
| Fixed 400 ฿/month | Never (only covers interest) | — |

## The math

With monthly rate `r = APR / 12`:

- **Recurrence:** `B(k) = (1 + r)·B(k−1) − payment(k)`
- **Closed form, fixed payment `p`:** `Bn = (1+r)^n·B0 − p·((1+r)^n − 1) / r`
- **Closed form, percentage `m` with no minimum in baht:** `Bn = B0·(1 + r − m)^n`

Three results, proved by induction on the page:

1. The closed form for fixed payments is correct for every `n`.
2. A pure percentage payment never brings the balance to exactly zero.
3. If the payment is no more than the first month's interest (`p ≤ r·B0`), the debt never decreases.

## Project structure

| File | Purpose |
|---|---|
| `core.js` | Calculations only, with no page code. Available as `window.DebtCore` in the browser and via `require()` in Node. |
| `index.html` | The page: HTML, CSS and the script that draws the page and handles input. Loads `core.js`. |
| `test.js` | 604 tests written without a test framework. Exits with code 1 if any test fails. |

### Main `core.js` functions

| Function | Description |
|---|---|
| `simulate(o)` | Month-by-month simulation for one card (`strategy: 'pct'` or `'fixed'`) |
| `simulateMulti(o)` | Simulation for several cards (`'avalanche'`, `'snowball'`, `'minonly'`) |
| `requiredPayment(balance, apr, n)` | Monthly payment needed to pay off the balance in `n` months |
| `closedFormFixed` / `closedFormPct` | Closed-form balance after `n` months |
| `verifyClosedForm(o, maxMonths)` | Largest difference between the closed form and the simulation |
| `inductionStepDemo(o)` | Checks one induction step with real numbers |
| `splitByYear(rows)` | Principal and interest paid in each year |
| `formatBaht`, `monthsToText`, `toCsv`, `encodeState`, `decodeState` | Formatting, CSV export and share-link helpers |

### Implementation notes

- A balance of 0.005 baht or less counts as paid off.
- Simulations stop after 1200 months (100 years), or after 120 months when the payment never reduces the debt.
- Values are not rounded during the calculation. They are rounded only for display.
- The code is ES5 throughout, so it runs in any browser without a build step.

## Disclaimer

This is an educational estimate. Real credit cards may calculate interest differently (for example, daily accrual, fees or changing rates), so check with your card issuer before making financial decisions.
