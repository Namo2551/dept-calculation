# One-page calculator: Calculator, Charts and Why merged

Date: 2026-11-21
Status: draft, waiting for owner approval
Builds on: `2026-11-19-paydown-multipage-design.md` (look, math, tests, share links, accessibility rules carry over)
Supersedes in that spec: the separate `/charts` and `/why` pages

## Intent

The owner finds it tiring to switch pages when Calculator, Charts and "Why it happens" all show the same numbers. They want those three on **one page**. The math should appear **only for people who want it**: closed by default, opened on request.

This also gives the next features a home. Ch. 7 (missed-payment probability) and Ch. 13 (account-status state machine) will be added as sections on this page, in their own spec after this one.

## Goals

- You can change a number and see every result that depends on it without leaving the page or scrolling back to the inputs.
- The math is one click away from the result it explains, and hidden otherwise.
- Fewer header links, and each one is a separate tool.

## Non-goals

- No changes to the math, the numbers, or the share-link and localStorage formats.
- The home landing page (Task 8 of the multi-page plan) is not part of this. It stays a placeholder until that task runs, and gets updated to describe two tools, not four.
- No new look. The Paydown palette, type and square corners stay as they are.
- Several cards (`/multi`) keeps its own page and inputs. Only small clean-ups there (below).

## Anti-goals (a failure even if it works)

- Any math visible by default to someone who didn't ask for it.
- On a phone, losing your place, or having no quick way back to the inputs.
- Breaking an old share link or an old `/charts` or `/why` bookmark.

## Approaches considered

| Approach | Summary | Trade-off |
|---|---|---|
| **A. Side-by-side (chosen by owner)** | Inputs stay visible in a left column on wide screens; results, charts and table scroll in the right column. Each section has a "Why?" button that opens only its own math in place. | Narrower results column; charts must fit about 760 px |
| B. One long page | Inputs on top, then results, charts, table, and a closed "Show the math" section at the end | Simplest, but changing a number means scrolling back up: the same jumping in a smaller form |
| C. Tabs | Inputs on top, then tabs: Results / Charts / Table / Math | Still switching views, only inside one page |

## The page: `/calculator`

### Wide screens (≥ 1024 px): two columns

```
[ header: Paydown   Calculator   Several cards          (Open the calculator) ]

Calculator
One card, two ways to pay, every result on one page.

┌ Your numbers ──────┐   Results: A 34 yrs 10 mo  |  B 2 yrs        [Why? ▸]
│ Balance            │   How long each method takes (compare bars)
│ Interest per year  │   Balance by month (chart, playback, slider) [Why? ▸]
│ Method A ...       │   What each year is made of (yearly bars)
│ Method B ...       │   Debt-free in N months  |  Pay extra       [Why? ▸]
│ Examples · Share   │   Monthly table + CSV (closed by default)
│ Print · Reset      │   ▸ The full math, step by step (closed)
└ sticky ────────────┘
```

- Left column about 360 px, **sticky**. If it's taller than the window, it scrolls on its own.
- Right column takes the rest of the 1200 px container. Section order is as drawn.
- The examples, share, print and reset buttons move into the bottom of the left column, so they stay with the inputs.

### Narrow screens (< 1024 px): one column

- Inputs first, then the sections in the same order.
- Once the inputs scroll off screen, a slim **sticky summary bar** appears at the top, for example `30,000 ฿ · 16% · A 5% · B 1,500 ฿   [Edit]`. Edit scrolls back to the inputs and focuses the first field.

### "Why?" buttons (math on request)

Each "Why?" is a disclosure button (`aria-expanded`). It opens a panel under its section and shows only the matching part of today's `MathExplainer`:

| Section | Opens |
|---|---|
| Results A/B | Step 1: the recurrence, with the month-by-month walk (`RecurrenceWalk`). Proof 2 too, when A uses a pure percentage ("never exactly zero"). |
| Balance chart | Step 3: the closed form, and Proof 1 with the induction staircase (`InductionLadder`) |
| Debt-free in N months / Pay extra | Proof 3: when the payment only covers interest, the debt never shrinks |

At the end of the page, **"The full math, step by step"** is a closed section holding the whole explainer as it is today: summary, vocabulary and "try this example" buttons. Those buttons now fill the numbers in and scroll to the results, with no page change.

Open/closed state isn't saved or shared. Everything starts closed on each visit, except in the redirect case below.

## Header, footer, old addresses

- Header links: **Calculator**, **Several cards**. "Charts" and "Why it happens" are removed.
- Footer "Tools": Calculator, Several cards. Footer "Learn": "The math" links to the calculator with the full math open.
- `/charts` and `/why` stay as tiny pages that replace themselves with `/calculator?show=chart` and `/calculator?show=math`, since the static export can't do server redirects. `show=chart` scrolls to the balance chart. `show=math` opens "The full math" and scrolls to it. The query is then removed from the address.
- The **hash stays reserved for share state**, so section jumps use the `show` query and not `#chart` / `#why`. Old `/#{state}` and `/calculator#{state}` links still load as before.

## Several cards (`/multi`), small clean-up

- Drop the repeated heading. The page title "Several cards" stays, and the panel title "Several cards: which one to pay first?" goes, with its sentence merged into the page intro.
- Each card becomes one row with a hairline between cards, not a panel inside a panel.
- At the end of the page, a single "See one card in detail" link to `/calculator`.

## Print

Prints as one column: inputs summary, results, charts, table. Open "Why?" panels print. Closed ones don't. No sticky elements, no buttons.

## Constraints carried over

- All math, parity and numeric tests stay unchanged and green.
- localStorage key `debtcalc.v1` and the hash state format don't change.
- WCAG AA contrast, visible focus, 44 px targets, reduced motion (no smooth scroll when reduced motion is on), no em/en dashes in visible copy.
- Static export.

## Tests that change

- `routes.test.tsx`: "five routes" becomes the calculator page showing results and chart together. "The why page shows the proof without any click" becomes "the proof is hidden until Why? or The full math is opened". "Try this example" stays on the same page and updates the results.
- `/charts` and `/why` redirect to the right `show` value, and an incoming `show` opens and scrolls to the right section.
- The header has exactly two page links.

## Left to the builder

Exact column widths and gaps within the spacing scale; the summary bar's wording and when it appears (an IntersectionObserver on the form is fine); how `MathExplainer` is split into reusable pieces; the "Why?" button's style (secondary outline button, small size); the `/multi` row layout details.
