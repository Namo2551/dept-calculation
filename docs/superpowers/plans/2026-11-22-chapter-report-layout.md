# Chapter Report Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/calculator` into a numbered report with a sticky chapter menu, tag every feature with its CPE111 chapter, and add the Ch 7 (missed payments) and Ch 13 (account status machine) sections.

**Architecture:** New pure modules `src/lib/risk.ts` (Ch 7 math + seeded simulation) and `src/lib/fsm.ts` (Ch 13 DFA). Section metadata (id, number, title, chapters) lives in one registry in copy. `ReportSection` renders each numbered section with its header (title, `ChapterTag`s, Why? button), and `ReportMenu` renders the sticky menu, or a chip bar on narrow screens, from the same registry. The calculator page composes existing section components inside `ReportSection`s.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript strict, Tailwind 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-22-chapter-report-layout-design.md`

## Global Constraints

- Debt math (`src/lib/debt.ts`), parity and existing numeric tests unchanged and green.
- Storage key `debtcalc.v1` and the hash format stay. New fields are optional, so old links and saved data without them load the defaults.
- WCAG AA contrast, visible focus, 44 px targets, reduced motion (no smooth scroll, no animated menu highlight), no em/en dashes in visible copy.
- Static export, no new dependencies.
- All visible copy in `src/copy/index.ts`.
- Chapter names exactly: Ch 1 & 5 Mathematical reasoning · Ch 2 Sums · Ch 3 Algorithms · Ch 6 Counting · Ch 7 Discrete probability · Ch 8 Recurrence relations · Ch 13 Finite-state machines.
- Before each commit: `npm test`, `npm run typecheck`, `npm run lint` pass.

## Review Focus

- **Method B never pays off** (fixed 400 ฿) with the risk section open: show the exact odds only and a sentence saying the simulation needs a plan that ends, with no NaN and no frozen tab. Test in Task 6.
- **Ch 7 inputs out of range or half-typed** ("", "60", "abc"): inline error, last valid results stay, other sections unaffected. Test in Task 2 (state) and Task 6 (UI).
- **Machine input with lowercase, spaces or other letters** ("pp m", "PXM"): lowercase and spaces are accepted; any other letter shows an inline error and the path doesn't change; more than 60 characters is rejected. Test in Task 7.
- **Old share link without q/fee** loads defaults 5 and 300 and still shows the link's other numbers. Test in Task 2.
- **Heavy simulation input** (q = 50%, payment just above the interest): stays under the 1,200-month cap per path and returns within a test timeout of 2 s. Test in Task 1.

---

### Task 1: Ch 7 and Ch 13 pure math

**Files:**
- Create: `src/lib/fsm.ts`, `src/lib/risk.ts`
- Test: `src/lib/fsm.test.ts`, `src/lib/risk.test.ts`

**Interfaces:**
- Produces (`fsm.ts`):
  - `type AccountState = "current" | "late" | "delinquent" | "default"`
  - `type Move = "P" | "M"`
  - `const START: AccountState = "current"`
  - `step(s: AccountState, m: Move): AccountState`, using the spec's table. P from current, late or delinquent goes to current; M moves one state right; default is a trap.
  - `runMachine(moves: string): AccountState[]` returns the path including the start state (length `moves.length + 1`)
  - `parseMoves(raw: string): string | null` uppercases and strips whitespace. Returns null if any other character remains or if the length is over 60; `""` is valid.
  - `endsInDefault(moves: string): boolean` is `/MMM/.test(moves)`
- Produces (`risk.ts`):
  - `missAtLeastOnce(q: number, months = 12): number`, which is `1 − (1−q)^months`
  - `expectedMisses(q: number, months = 12): number`, which is `months·q`
  - `binomialPmf(n: number, k: number, q: number): number`
  - `missBuckets(q: number, n = 12): [number, number, number, number, number]`, which gives P(0), P(1), P(2), P(3), P(4 or more)
  - `mulberry32(seed: number): () => number`
  - `type RiskSummary = { paths: number; medianMonths: number | null; p90Months: number | null; baselineMonths: number; avgExtraCost: number; defaultShare: number; unpaidShare: number }`
  - `simulateMisses(o: { balance: number; apr: number; p: number; q: number; fee: number; paths?: number; seed?: number }): RiskSummary | null`. The defaults are paths 1000 and seed 12345. It returns null when the fixed payment never reduces the debt (`p <= r·balance`). Each path runs month by month. With probability q the month is missed: no payment, interest still accrues, and the fee is added to the balance. Otherwise it pays `min(p, due)`. The FSM is stepped each month (miss = M, pay = P), and a path counts toward `defaultShare` if it ever reaches `default`. A path that isn't paid off by month 1200 counts in `unpaidShare`, and its month is `Infinity` when computing the median and p90 (null if that percentile is Infinity). `avgExtraCost` = mean over paths of (interest + fees) minus the interest of the no-miss plan (`simulate` with strategy fixed). `baselineMonths` is the no-miss months.
- Uses `simulate` from `debt.ts` for the baseline. Paid off means balance ≤ 0.005, the same as `debt.ts`.

- [ ] **Step 1: Write failing tests**
  - fsm: `step` covers all 8 table cells. `runMachine("PPMPMMM")` equals `["current","current","current","late","current","late","delinquent","default"]`. `parseMoves("pp m")` is `"PPM"`, `parseMoves("PXM")` is null, `parseMoves("P".repeat(61))` is null, `parseMoves("")` is `""`. `endsInDefault("PMMMP")` is true and `endsInDefault("MMPMM")` is false. For every string of P/M up to length 8, the last state of `runMachine(s)` is `"default"` exactly when `endsInDefault(s)` (exhaustive loop, 510 strings).
  - risk: `missAtLeastOnce(0.05)` ≈ 0.4596399 (toBeCloseTo, 6). `expectedMisses(0.05)` ≈ 0.6. `missBuckets(0.05)` ≈ [0.5403601, 0.3412801, 0.0987916, 0.0173319, 0.0022364] and it sums to 1. `binomialPmf(12, 1, 0.05)` ≈ 0.3412801.
  - risk sim: `simulateMisses({balance:30000, apr:16, p:1500, q:0, fee:300})` gives medianMonths 24, p90Months 24, avgExtraCost 0, defaultShare 0, baselineMonths 24. The same call with q 0.05 run twice gives deep-equal results. With q 0.05 the median is ≥ 24 and avgExtraCost > 0. `p: 400` returns null. A heavy case `{balance:30000, apr:16, p:420, q:0.5, fee:300}` returns within the test's 2000 ms timeout and every percentile is a number or null, never NaN.
- [ ] **Step 2: Run** `npx vitest run src/lib/fsm.test.ts src/lib/risk.test.ts` and expect FAIL (modules missing).
- [ ] **Step 3: Implement** both modules. mulberry32 is the standard 32-bit version:
  ```ts
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  ```
- [ ] **Step 4: Run** the same command and expect PASS.
- [ ] **Step 5: Commit** `feat: Ch 7 probability and Ch 13 state machine math`.

### Task 2: Ch 7 inputs in the saved state

**Files:**
- Modify: `src/lib/state.ts`, `src/lib/calc.ts`, `src/hooks/useCalculator.ts`, `src/copy/index.ts`
- Test: `src/lib/state.test.ts`, `src/lib/calc.test.ts`

**Interfaces:**
- `SingleRaw` gains `q: string` (percent of months missed) and `fee: string` (baht). Defaults are `q: "5"` and `fee: "300"`.
- `RuleKey` gains `"q" | "fee"`, with rules `q: 0 ≤ v ≤ 50` and `fee: 0 ≤ v ≤ 2000`.
- `SINGLE_KEYS` (in both `state.ts` and `calc.ts`) and `SINGLE_RULES` in `useCalculator.ts` include `q` and `fee`.
- `EXAMPLES` is typed as `Record<…, Omit<SingleRaw, "n" | "q" | "fee">>`, so examples keep the user's q/fee.
- `SingleCalc.v` gains `q: number` (percent) and `fee: number`.
- Copy: `errors.q = "The chance must be between 0 and 50 (%)"`, `errors.fee = "The late fee must be between 0 and 2,000 baht"`.

- [ ] **Step 1: Write failing tests:** `defaultState().single` equals `{ bal: "30,000", apr: "16", m: "5", floor: "0", p: "1,500", n: "24", q: "5", fee: "300" }` (update the existing assertion). A link state without q/fee loads with q "5" and fee "300" and keeps `p: "2,000"`. `validate("q", "50")` is 50, `validate("q", "60")` is null, `validate("fee", "2,000")` is 2000, `validate("fee", "-1")` is null. `computeSingle(defaultState().single).v.q` is 5.
- [ ] **Step 2: Run** `npx vitest run src/lib` and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and expect all PASS (fix any test that asserted the old exact single shape).
- [ ] **Step 5: Commit** `feat: missed-payment inputs in the saved state`.

### Task 3: Chapter tags, section registry, `ReportSection`

**Files:**
- Create: `src/components/report/ChapterTag.tsx`, `src/components/report/ReportSection.tsx`
- Modify: `src/copy/index.ts`
- Test: `src/components/report/ReportSection.test.tsx`
- (The old `Why` component's behavior moves into `ReportSection`; Task 5 deletes `Why` once the page stops using it.)

**Interfaces:**
- Copy adds `chapters: Record<ChapterKey, { label: string; name: string }>` where `type ChapterKey = "1-5" | "2" | "3" | "6" | "7" | "8" | "13"`. Labels: `"Ch 1 & 5"`, `"Ch 2"`, `"Ch 3"`, `"Ch 6"`, `"Ch 7"`, `"Ch 8"`, `"Ch 13"`. Names: `"Mathematical reasoning"`, `"Sums"`, `"Algorithms"`, `"Counting"`, `"Discrete probability"`, `"Recurrence relations"`, `"Finite-state machines"`. Export `ChapterKey` from `src/copy/index.ts`.
- Copy adds `sections: { key: SectionKey; title: string; chapters: ChapterKey[] }[]`, in this order:
  `inputs` "Your numbers" [], `results` "Results" ["8"], `chart` "Balance by month" ["8"], `yearly` "Year by year" ["2"], `plan` "Your plan" ["8","2"], `risk` "Missed payments" ["7","6"], `status` "Account status" ["13"], `table` "Month by month" ["8"], `math` "The math" ["1-5"].
  `type SectionKey` is exported. The section number is its index + 1. The element id is `sec-${key}`.
- `ChapterTag({ ch, compact = false }: { ch: ChapterKey; compact?: boolean })` renders a `<span>` with an accent outline chip. Its text is `${label} · ${name}`, or the bare number(s) when compact (`"8"`, `"1·5"`). It has `title` and `aria-label` = `"CPE111 " + label.replace("Ch", "Chapter") + ", " + name`.
- `ReportSection({ k, why, whyTopic, children }: { k: SectionKey; why?: React.ReactNode; whyTopic?: string; children: React.ReactNode })` renders `<section id={"sec-"+k} aria-labelledby={"sec-"+k+"-h"} class="scroll-mt-24">`. The header row holds: the number in muted mono, an `<h2 id=…-h>` with the title, a `ChapterTag` for each chapter, and, when `why` is given, a right-aligned small secondary button labelled `Why?`/`Hide the math` with `aria-label` `Why? ${whyTopic}`/`Hide the math: ${whyTopic}`, `aria-expanded` and `aria-controls={"sec-"+k+"-why"}`. Then come the children, then `<div id=…-why hidden={!open}>` that renders `why` only when open. Sections are separated by `border-t border-hair pt-10 mt-10` (the first one has no border).

- [ ] **Step 1: Write failing tests:** ReportSection `k="chart"` renders an h2 "Balance by month", the number "3", and a tag with accessible name "CPE111 Chapter 8, Recurrence relations". With `why={<p>proof</p>} whyTopic="the balance chart"` the proof is absent, clicking "Why? the balance chart" shows it with `aria-expanded="true"`, and a second click hides it. Without `why` there's no button. `ChapterTag ch="1-5" compact` shows text "1·5" and name "CPE111 Chapter 1 & 5, Mathematical reasoning".
- [ ] **Step 2: Run** `npx vitest run src/components/report` and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command and expect PASS.
- [ ] **Step 5: Commit** `feat: chapter tags and numbered report sections`.

### Task 4: `ReportMenu` with live summary and active section

**Files:**
- Create: `src/components/report/ReportMenu.tsx`, `src/hooks/useActiveSection.ts`
- Test: `src/components/report/ReportMenu.test.tsx`

**Interfaces:**
- Consumes: copy `sections`, `chapters`, `summary.line` / `summary.edit` (existing), `ChapterTag` (compact), `scrollToId` from `useCalculator.ts`.
- `useActiveSection(ids: string[]): string | null` uses one IntersectionObserver with `rootMargin: "-30% 0px -60% 0px"` and returns the id most recently reported as intersecting. It returns null when IntersectionObserver is missing.
- `ReportMenu()` renders two navs from the same data:
  - wide (`hidden lg:block`, sticky `top-6`): heading "On this page"; the summary line + Edit button; an `<ol>` of links `href="#sec-<key>"` with the number, title and compact tags; a footer line "Chapters used: 1·2·3·5·6·7·8·13" (copy `menu.used`).
  - narrow (`lg:hidden sticky top-0 z-10 bg-bg border-b border-hair no-print`): the summary line + Edit, and a horizontally scrollable row of chips `"<n> <title>"` with compact tags.
  - Link clicks `preventDefault` and call `scrollToId("sec-"+key)` (keeps the share hash format untouched). The active link has `aria-current="true"` and a 2 px left border (wide) or filled chip (narrow). Edit scrolls to `sec-inputs` and focuses the first input in `#tool`.
  - Both navs have `aria-label` "On this page" (wide) and "Sections" (narrow). The whole menu is `no-print`.
- Copy: `menu: { title: "On this page", narrow: "Sections", used: "Chapters used: 1·2·3·5·6·7·8·13" }`.

- [ ] **Step 1: Write failing tests** (stub IntersectionObserver as in `SummaryBar.test.tsx`, render inside `CalcProvider` with `SingleCardForm` and a `<section id="sec-results">`):
  - the "On this page" nav lists 9 links in order, the first is "Your numbers", and the "Missed payments" link contains compact tags "7" and "6".
  - the summary line `30,000 ฿ · 16% · A 5% · B 1,500 ฿` is shown without any scrolling.
  - after the observer reports `sec-results` intersecting, the "Results" link has `aria-current="true"`.
  - clicking the "Results" link calls `scrollIntoView` on `#sec-results` and leaves `location.hash` empty.
  - clicking Edit focuses "Balance (baht)".
- [ ] **Step 2: Run** `npx vitest run src/components/report/ReportMenu.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command and expect PASS.
- [ ] **Step 5: Commit** `feat: sticky chapter menu with live input summary`.

### Task 5: Reassemble `/calculator` as the report

**Files:**
- Modify: `src/app/calculator/page.tsx`, `src/components/calculator/{ResultCards,CompareBars,BalanceChart,YearlyChart,RequiredPayment,ExtraPayment,SingleCardForm}.tsx`, `src/components/calculator/ShowTarget.tsx`, `src/hooks/useCalculator.ts`, `src/app/globals.css`, `src/copy/index.ts`
- Delete: `src/components/calculator/SummaryBar.tsx` + test, `src/components/ui/Why.tsx` + test
- Test: `src/components/calculator/CalculatorPage.test.tsx`, `src/app/routes.test.tsx`, `src/components/calculator/Review.test.tsx`

**Interfaces:**
- Consumes: Tasks 3–4. Tasks 6 and 7 later fill `risk` and `status`. Until then those two sections render a placeholder paragraph (copy `soon`), which Tasks 6–7 replace.
- Page: `PageIntro` with intro `"One card, two ways to pay. Each section shows the CPE111 chapter it uses."`, then the grid `lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12` with `<aside class="report-aside no-print"><ReportMenu/></aside>` and `<div class="report-main min-w-0">` holding the 9 `ReportSection`s:
  - `inputs`: `SingleCardForm` (without its own Panel title, with a 5-field grid `sm:grid-cols-2 xl:grid-cols-3`; the method A/B fieldsets stay). The example/share/print/reset buttons form one toolbar row.
  - `results` (why `ResultsWhy`, topic `copy.why.results`): `ResultCards` with the grid `sm:grid-cols-2` at every width ≥ 640, then `CompareBars`.
  - `chart` (why `ChartWhy`): `BalanceChart` without its PanelTitle and without `id="chart-sec"`.
  - `yearly`: `YearlyChart`, with its heading as an h3.
  - `plan` (why `PlanWhy`): `RequiredPayment` and `ExtraPayment` side by side at `xl`, headings as h3.
  - `risk`, `status`: placeholders.
  - `table`: `MonthlyTable`.
  - `math`: `FullMath` (details keeps `id="math"`).
- Headings: `ResultCards` card titles become h3; `PanelTitle` in these components is called with `as="h3"`.
- `runExample` scrolls to `sec-results` (was `results-sec`).
- `ShowTarget`: for any `show` value that is a `SectionKey`, scroll to `sec-<show>`. For `math` it also opens `#math` (existing toggle logic). Unknown values just clear the query.
- Print CSS: `.report-aside` hidden; `.report-main` full width; drop the old `.calc-grid`/`.calc-aside` rules.

- [ ] **Step 1: Update and write failing tests:**
  - CalculatorPage: there are exactly 9 h2 section headings, in registry order. The `sec-results` section shows `result-A` and `result-B`, and their common parent grid has class `sm:grid-cols-2`. There's no element with `overflow-y-auto` on the inputs (`#tool` closest `aside` is null). "Why? the balance chart" is inside the `sec-chart` header and reveals `proof1`. The page has no "Why?" button outside a section header.
  - routes: `?show=yearly` scrolls `#sec-yearly` (spy `scrollIntoView`) and clears the query. `?show=math` still opens `#math`. `/charts` still forwards to `?show=chart`.
  - Review.test: the anchor test uses `#sec-results`.
- [ ] **Step 2: Run** `npx vitest run src/components/calculator src/app` and expect FAIL.
- [ ] **Step 3: Implement** and delete SummaryBar and Why with their tests.
- [ ] **Step 4: Run** `npm test` and expect PASS.
- [ ] **Step 5: Browser check** at 1280×800, 1024×768 and 390×844: the menu is sticky and never scrolls inside itself, the active link follows the scroll, Edit works, A and B sit side by side ≥ 640 px, and there's no horizontal page scroll.
- [ ] **Step 6: Commit** `feat: calculator as a numbered report with a chapter menu`.

### Task 6: Section 6, Missed payments (Ch 7)

**Files:**
- Create: `src/components/report/RiskSection.tsx`, `src/components/report/BinomialBars.tsx`
- Modify: `src/app/calculator/page.tsx`, `src/copy/index.ts`
- Test: `src/components/report/RiskSection.test.tsx`

**Interfaces:**
- Consumes: Task 1 `missAtLeastOnce`, `expectedMisses`, `missBuckets`, `binomialPmf`, `simulateMisses`; Task 2 `state.single.q/fee`, `setSingle("q"|"fee", …)`, `errors.q/fee`, `single.v`.
- `RiskSection()`:
  - Two `NumberField`s: "Chance of missing a month (%)" (`q`) and "Late fee (baht)" (`fee`).
  - Three stats (use `Stat`):
    - "Chance of missing at least once in a year", formatted `pct1` with one decimal, e.g. `46.0%`
    - "Expected missed months in a year", e.g. `0.6`
    - "Formula", showing `1 − (1 − 0.05)¹² = 0.460`
  - `BinomialBars({ buckets }: { buckets: number[] })`: an SVG bar chart with labels `0, 1, 2, 3, 4+` and percentages on top of each bar (`54.0%, 34.1%, 9.9%, 1.7%, 0.2%`). It has `role="img"` and an `aria-label` listing the five values.
  - The worked term: `P(1 miss) = C(12,1)·0.05¹·0.95¹¹ = 12 × 0.05 × 0.5688 = 0.341`.
  - The simulation block (`useMemo` on v.bal, v.apr, v.p, v.q, v.fee) shows:
    - "1,000 simulated years of method B (same every time)"
    - "Usually debt-free after" with the median (as `monthsToText`) and "+N months" versus the baseline
    - "1 in 10 take longer than" with p90
    - "Average extra cost" with `avgExtraCost` in baht
    - "Reach Default at least once" with `defaultShare` as a percent
    - When `simulateMisses` returns null: the copy `risk.noSim` = `"Method B never pays off, so there is nothing to simulate. Raise the fixed payment above the monthly interest."` (the exact odds still show)
  - A footnote copy `risk.model`: `"Model: in a missed month nothing is paid, interest still grows and the late fee is added to the balance."`

- [ ] **Step 1: Write failing tests** (render the calculator page and query inside `#sec-risk`):
  - the defaults show `46.0%`, `0.6`, the bars' aria-label contains `54.0%` and `34.1%`, and the worked term contains `0.341`.
  - the simulation block shows "Usually debt-free after" and "Reach Default at least once".
  - setting q to `0` shows `0.0%` and "Average extra cost" `0.00 baht`.
  - typing q `60` shows the error "The chance must be between 0 and 50 (%)" and the odds stay at `46.0%`.
  - the 400 example (Method B never pays off) shows `risk.noSim` and still shows `46.0%`.
- [ ] **Step 2: Run** `npx vitest run src/components/report/RiskSection.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement** and replace the `risk` placeholder.
- [ ] **Step 4: Run** `npm test` and expect PASS.
- [ ] **Step 5: Commit** `feat: Ch 7 missed payments section`.

### Task 7: Section 7, Account status machine (Ch 13)

**Files:**
- Create: `src/components/report/StatusMachine.tsx`
- Modify: `src/app/calculator/page.tsx`, `src/copy/index.ts`
- Test: `src/components/report/StatusMachine.test.tsx`

**Interfaces:**
- Consumes: Task 1 `step`, `runMachine`, `parseMoves`, `endsInDefault`, `START`; `single.B.months` for the paid-off note.
- `StatusMachine()` keeps local state `moves: string` (default `""`) and `draft: string` for the text field:
  - Buttons "Pay (P)", "Miss (M)" and "Reset". Pay/Miss append, and are disabled at 60 moves.
  - Text field "Months as P and M", with an Apply button. On apply, `parseMoves(draft)`: null shows the inline error `"Use only P and M, up to 60 months"` and leaves `moves` unchanged; otherwise it sets `moves`.
  - An SVG diagram with 4 circles (Current, Late, Delinquent, Default with a double ring) and labelled arrows: `M` rightward, `P` back to Current from Late and Delinquent, `P` self-loop on Current, and a `P,M` self-loop on Default. The current state circle is filled (`aria-current`-like via `data-active="true"`). It has `role="img"` and an `aria-label` describing the current state.
  - The path, as an ordered list of chips: Month 0 Current, Month 1 …
  - A transition table (`<table>`) matching the spec.
  - The language note, copy `status.language`: `"The machine ends in Default exactly when the input contains MMM: the regular language (P|M)*MMM(P|M)*."` It shows `✓ contains MMM` / `✗ no MMM` for the current moves.
  - The paid-off note: `"Method B needs ${n} paid months to reach Paid off; a real account also leaves this machine when the balance reaches zero."` (or the never-pays-off variant).
  - The disclaimer, copy `status.disclaimer`: `"Simplified model for the course; real banks use their own rules."`

- [ ] **Step 1: Write failing tests:** it starts at Current with the path showing only Month 0. Clicking Miss, Miss, Miss gives a path ending in "Default", with Default `data-active="true"` and `✓ contains MMM`. Applying `"pp m"` gives the path Current, Current, Current, Late. Applying `"PXM"` shows the error and keeps the previous path. Reset returns to Current. The table has 4 body rows. The paid-off note contains `24 paid months` with defaults.
- [ ] **Step 2: Run** `npx vitest run src/components/report/StatusMachine.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement** and replace the `status` placeholder.
- [ ] **Step 4: Run** `npm test` and expect PASS.
- [ ] **Step 5: Commit** `feat: Ch 13 account status machine`.

### Task 8: Header, Several cards tag, home page

**Files:**
- Modify: `src/components/site/SiteHeader.tsx`, `src/copy/index.ts`, `src/components/calculator/MultiCard.tsx`, `src/app/page.tsx`
- Test: `src/components/site/SiteHeader.test.tsx`, `src/components/calculator/MultiCard.test.tsx`, `src/app/routes.test.tsx` (home)

**Interfaces:**
- Nav links: Calculator `/calculator`, Several cards `/multi`, The math `/calculator?show=math`. The "Open the calculator" button isn't rendered when `pathname === "/calculator"` (wide and menu panel).
- `/multi`: the strategy headings become h2, and above the results grid a row "Which strategy wins" (h2) with `ChapterTag ch="3"` and `ChapterTag ch="8"`.
- Home `/`: headline `"When does your card debt end?"`, sentence `"A calculator for one card or several, with the CPE111 discrete math behind every number."`, a primary button "Open the calculator", and a table "Chapters in this project" with columns Chapter, What it does here, Section. One row per chapter in the order 1&5, 2, 3, 6, 7, 8, 13. Each Section cell links to `/calculator?show=<key>` (Ch 3 links to `/multi`). The "what it does" copy lives in copy `home.rows`.

- [ ] **Step 1: Write failing tests:**
  - header: with pathname `/calculator`, the nav links are `["Calculator", "Several cards", "The math"]` and there's no "Open the calculator" link; with pathname `/multi` the button is present. Update the 44 px count test accordingly.
  - multi: `getAllByRole("heading", { level: 3 })` inside `#multiRes` is empty; "Which strategy wins" has the tags "CPE111 Chapter 3, Algorithms" and "CPE111 Chapter 8, Recurrence relations".
  - home: the table has 7 body rows; the Ch 7 row links to `/calculator?show=risk` and the Ch 13 row to `/calculator?show=status`; the share-link-on-home test still passes.
- [ ] **Step 2: Run** `npx vitest run src/components/site src/components/calculator/MultiCard.test.tsx src/app` and expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and expect all pass, with `/`, `/calculator`, `/multi`, `/charts`, `/why` in `out/`.
- [ ] **Step 5: Browser pass** on `/`, `/calculator` (all 9 sections, Why? buttons, Ch 7 inputs, machine buttons) and `/multi` at 1280 and 390 wide.
- [ ] **Step 6: Commit** `feat: chapter links on home, header and several cards`.
