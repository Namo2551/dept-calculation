# Chapter report layout, with Ch 7 and Ch 13 sections

Date: 2026-11-22
Status: draft, waiting for owner approval
Builds on: `2026-11-21-one-page-calculator-design.md` (one page for one card, math on request, old addresses forward, share links) and `2026-11-19-paydown-multipage-design.md` (look, accessibility, constraints)
Replaces in those specs: the sticky two-column inputs layout of `/calculator`

## Intent

The owner thinks the current one-page calculator looks weird. The inputs box scrolls inside itself, the page is one long stack of identical beige boxes, the two answers are stacked, and the "Why?" buttons float on their own. They want the site to look **more professional and be easier to use**. They also want **every feature labelled with the CPE111 chapter it uses**, and two new features: **Ch 7 Discrete Probability** ("What if I miss a payment?") and **Ch 13 Modeling Computation** (an account-status finite-state machine).

Audience (my reading, not yet confirmed by the owner): mainly the CPE111 teacher and classmates, so the chapter tags are clearly visible, not hidden.

The owner picked layout **B, "report with a chapter menu"**, from three mockups (`.superpowers/brainstorm/…/layout-v2.html`).

## Goals

- `/calculator` reads like a tidy numbered report. A sticky menu on the left lists every section with its chapter, and one click jumps to that section.
- Every feature shows its chapter tag in the same style, both in the menu and on the section heading.
- Ch 7 and Ch 13 sections use the owner's own numbers, like the rest of the page.
- Nothing scrolls inside a box. Method A and Method B sit side by side.

## Non-goals

- No change to the debt math, share-link format or storage key.
- No new look. The Paydown palette, type and square corners stay.
- The Ch 13 machine models a simplified card account. It is not any real bank's rules, and the page says so.

## Anti-goals

- Chapter tags that are wrong or vague. Each tag names a real lesson from the owner's course files (checked against the lecture file names: Ch 1&5 Mathematical Reasoning, Ch 2, Ch 3 Algorithms, Ch 6 Counting, Ch 7 Discrete Probability, Ch 8 Advanced Counting, Ch 13 Modeling Computation).
- A random simulation that gives different numbers on every keystroke or in tests.
- Losing anything that works today: share links, examples, print, `?show=` jumps, the phone layout.

## Approaches considered (owner picked B)

| Approach | Summary | Trade-off |
|---|---|---|
| A. Answer first, inputs in one bar | All 5 inputs in a sticky bar across the top; A and B side by side; sections in pairs | Most "app-like"; the chapter story is less visible |
| **B. Report with a chapter menu (chosen)** | Sticky left menu of numbered sections with chapter tags; inputs as section 1 | Reads like a report, good for the teacher; inputs are only at the top (solved by the menu's live summary, below) |
| C. Today's layout, cleaned up | Short left inputs panel, "more options" fold | Smallest change; still a two-panel calculator, not a report |

## `/calculator` layout

### Wide screens (≥ 1024 px)

```
[ Paydown        Calculator   Several cards   The math                      ]

 ON THIS PAGE              Calculator
 30,000 ฿ · 16% [Edit]     One card, two ways to pay. Each section shows the CPE111 chapter it uses.
 ─────────────
 1 Your numbers            1  Your numbers
 2 Results       [8]          Balance [30,000]  Interest/yr [16]
 3 Balance chart [8]          A: min % [5]  A: min ฿ [0]    B: fixed [1,500]
 4 Year by year  [2]          Examples · Copy link · Print · Reset
 5 Your plan     [8]       2  Results                                [Ch 8]
 6 Missed pays   [7]          ┌ A · 5% minimum ─────┐ ┌ B · 1,500 ฿ a month ┐
 7 Account status[13]         │ 34 years 10 months  │ │ 2 years             │
 8 Month by month[8]          └─────────────────────┘ └─────────────────────┘
 9 The math     [1·5]         How long each method takes (bars) · [Why? Ch 8]
 ─────────────             3  Balance by month                       [Ch 8]
 Chapters used: 1·2·3·5·      … each section: number, title, tag, content, Why? in its header …
 6·7·8·13
```

- **Menu (left, about 220 px, sticky).** Top: a live one-line summary of the inputs, with an **Edit** button that jumps to section 1 and focuses Balance. This is the old phone summary bar, moved here and always shown, so changing a number is one click from anywhere. Below it, the numbered section links, each with its chapter number chip. The section in view is highlighted (`aria-current="true"`), and a link click scrolls there. At the bottom, "Chapters used" lists the chapters on the page. The menu never scrolls inside itself; it is short enough by design (9 links).
- **Main column.** Numbered sections, each with a header row: `number · title · chapter tag · Why?` (the Why? button sits in the header, not floating between boxes). Sections are separated by space and a hairline, and only the content that needs a card gets one. That breaks up the wall of identical boxes.
- **Section 1, Your numbers.** All inputs in a compact grid (balance, interest, A min %, A min ฿, B fixed, and N for the plan section), then the examples and the share, print and reset actions in one toolbar row.
- **Section 2, Results.** A and B side by side at every width ≥ 640 px, with the compare bars under them.

### Narrow screens (< 1024 px)

- The menu becomes a **sticky horizontal bar** under the header. It shows the input summary with Edit, and a scrollable row of section chips (`2 Results 8`, `3 Chart 8`, …). Tapping a chip jumps to that section. This replaces the current `SummaryBar`.
- Sections stack in the same order.

### Chapter tags

One `ChapterTag` component. It is an orange outline chip with the text `Ch 8 · Recurrence relations` on section headers, and just `8` in the menu. It has a `title` and an accessible name with the full lesson name (for example "CPE111 Chapter 8, Advanced Counting: recurrence relations"). Tags come from one table in copy, so they can't drift apart:

| Section | Tag(s) | Why that chapter |
|---|---|---|
| 2 Results | Ch 8 Recurrence relations | each month's balance comes from last month's |
| 3 Balance by month | Ch 8 Recurrence relations; Why? opens Ch 5 induction proof | closed form proved by induction |
| 4 Year by year | Ch 2 Sums | each bar is a sum of 12 monthly terms |
| 5 Your plan (debt-free in N months, pay extra) | Ch 8 Solving recurrences, Ch 2 Geometric sum | payment from setting B<sub>n</sub> = 0 |
| 6 Missed payments | Ch 7 Discrete probability, Ch 6 Counting | complement rule, expected value, binomial C(12,k) |
| 7 Account status | Ch 13 Finite-state machines | states and transitions on Pay/Miss |
| 8 Month by month (table) | Ch 8 Recurrence relations | the sequence B<sub>0</sub>, B<sub>1</sub>, … |
| 9 The math | Ch 1 & 5 Mathematical reasoning | proofs by induction |
| `/multi` page | Ch 3 Algorithms (greedy) | avalanche and snowball are greedy choices |

## Section 6: Missed payments (Ch 7)

Inputs: **chance of missing a month** `q` (0 to 50%, default 5%) and **late fee** (0 to 2,000 baht, default 300). Both are saved and shared like the other inputs (a new optional field in the state; old links without it get the defaults).

Shown, all for method B (the fixed plan). If B never pays off, the section says so and shows only the exact odds.
- **Chance of missing at least once in a year:** `1 − (1 − q)^12` (complement rule)
- **Expected missed months in a year:** `12q` (expected value)
- **Binomial bar chart** of 0, 1, 2, 3, 4+ missed months in a year: `C(12,k)·q^k·(1−q)^(12−k)`. The formula is shown, with the k = 1 term worked out using the owner's q.
- **Simulation** of 1,000 paths using method B. In a missed month no payment is made, interest still accrues, and the late fee is added to the balance. It reports the median and 90th-percentile payoff month, the average extra interest and fees, and the share of paths that ever reach Default (from section 7's machine).
- The random generator is **seeded** (fixed seed, for example mulberry32(12345)) so the numbers are stable between renders and in tests, and the page says "1,000 simulated paths, same every time". A simulation is capped at the existing 1,200-month limit.

## Section 7: Account status (Ch 13)

A deterministic finite-state machine (DFA) over the input alphabet {P (pay), M (miss)}:

| State | on P | on M |
|---|---|---|
| Current (start) | Current | Late |
| Late | Current | Delinquent |
| Delinquent | Current | Default |
| Default (trap) | Default | Default |

- **Diagram:** inline SVG with four circles and labelled arrows. Default has a double ring as the state the language question is about. The current state is filled in.
- **Input:** a Pay button, a Miss button, a text field that accepts a string of P and M (up to 60 characters, other characters rejected with an inline error), and Reset. The path is shown as a row of state chips, one per month.
- **Language note:** "The machine ends in Default exactly when the input contains MMM: the regular language (P|M)\*MMM(P|M)\*."
- **Paid off** is shown outside the machine: it notes how many P months method B needs (from section 2) and says that a real account also leaves this machine when the balance reaches zero.
- A one-line disclaimer: simplified model, real banks' rules differ.
- Section 6's simulation reuses this machine's transition function, which links the two chapters.

## Other pages

- **Header:** Calculator · Several cards · The math (`/calculator?show=math`). The "Open the calculator" button is hidden on `/calculator` itself.
- **`/multi`:** same section header style and a `Ch 3 Algorithms` tag on the strategy results. The strategy headings become h2 (fixes the h1 → h3 skip from the last review). No menu, because the page is short.
- **Home `/`:** replace the placeholder with a short landing: headline, one sentence, "Open the calculator", and a **"Chapters in this project"** table (chapter, what it does here, link to the section). Each link uses `/calculator?show=<section>`.
- **`?show=`** accepts every section id (`results`, `chart`, `yearly`, `plan`, `risk`, `status`, `table`, `math`). `chart` and `math` keep working.

## Constraints carried over

- Math, parity and existing numeric tests unchanged and green; the share-link and storage formats stay readable (the new Ch 7 fields are optional).
- WCAG AA contrast, visible focus, 44 px targets, reduced motion (no smooth scroll; the menu highlight doesn't animate), and no em/en dashes in visible copy.
- Static export. All new logic is pure functions in `src/lib/` with unit tests (binomial, complement, expected value, seeded RNG, simulation, DFA).
- Print: the menu is hidden, sections print in order, open Why? panels print, the binomial chart and the DFA diagram print. The table stays off paper (owner's earlier ruling stands unless they say otherwise).

## Left to the builder

Exact widths and spacing within the scale; the active-section detection method (IntersectionObserver is fine); SVG layout of the DFA diagram; wording of section intros; how the binomial bars and the simulation summary are laid out inside section 6; the home page's exact copy.
