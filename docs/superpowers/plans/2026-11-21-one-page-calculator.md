# One-Page Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/calculator`, `/charts` and `/why` into one two-column page where the inputs stay visible and the math opens only on request.

**Architecture:** `/calculator` becomes a two-column grid (sticky inputs aside + results column) of the existing sections. `MathExplainer` is split into named pieces. Each piece appears under its section inside a new `Why` disclosure, and the full set appears in a closed "full math" `<details>` at the end. `/charts` and `/why` become client redirects that use a `?show=` query, because the hash is reserved for share state.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript strict, Tailwind 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-21-one-page-calculator-design.md`

## Global Constraints

- Math, parity and numeric tests (`src/lib/*.test.ts`) stay unchanged and green.
- localStorage key `debtcalc.v1` and the hash state format don't change; old `/#{state}` and `/calculator#{state}` links still load.
- Two columns at ≥ 1024 px (`lg:`); aside about 360 px; one column below.
- WCAG AA contrast, visible focus, 44 px targets, reduced motion (no smooth scroll), no em/en dashes in visible copy.
- Static export (`output: "export"`): no server redirects, no `next.config` redirects.
- All visible copy goes in `src/copy/index.ts` (or `src/copy/math.tsx` for math), not inline in components.
- Before every commit: `npm test`, `npm run typecheck`, `npm run lint` all pass.

## Review Focus

- **Sticky aside taller than the window** (small laptop at 1024×640 with an error message showing): the aside must scroll on its own (`max-h` + `overflow-y-auto`), never cut off fields. Test in Task 3.
- **`/why` or `/charts` opened with a share hash** (`/why#{state}`): the numbers must still load, so the redirect keeps the hash. Test in Task 5.
- **`?show=` with an unknown value, or `show=math` on a page that's still loading**: no crash, no scroll before the sections exist, query removed. Test in Task 5.
- **Pure-percentage proof under "Why?" when method A has a minimum in baht**: Proof 2 is shown only when `v.floor` is 0, as the spec says. Test in Task 1.
- **"Try this example" inside the full math**: updates numbers and stays on `/calculator` (except `exMulti`, which still goes to `/multi`). Test in Task 3.

---

### Task 1: Split `MathExplainer` into pieces

**Files:**
- Create: `src/components/math/pieces.tsx`
- Modify: `src/components/math/MathExplainer.tsx`
- Test: `src/components/math/pieces.test.tsx`

**Interfaces:**
- Produces (all client components, no props, read `useCalc()`):
  `RecurrenceStep` (today's Step 1 card, `data-testid="math-recurrence"`),
  `ClosedFormProof` (Proof 1 + `InductionLadder`, `data-testid="proof1"`),
  `PctProof` (Proof 2, `data-testid="proof2"`),
  `InterestOnlyProof` (Proof 3, `data-testid="proof3"`),
  `RequiredPaymentStep` (Step 3 card, `data-testid="math-required"`),
  `RealExamples` (the "try this example" list), `MathSummary` (summary + vocabulary grid).
  Also `ResultsWhy` = `RecurrenceStep` + `PctProof` only when `single.v.floor === 0`; `ChartWhy` = `ClosedFormProof`; `PlanWhy` = `RequiredPaymentStep` + `InterestOnlyProof`.
- `MathExplainer` keeps its export and renders the same content as today in the same order, composed from the pieces.

- [ ] **Step 1: Write failing tests** in `pieces.test.tsx` (render each inside `CalcProvider`, wait for ready):
  - `ResultsWhy` shows `math-recurrence` and `proof2` with defaults (default floor is 0; check `defaultState()` and set `floor` to "0" through the field if it isn't).
  - `ResultsWhy` hides `proof2` after the "Minimum in baht" field is set to `500`.
  - `ChartWhy` shows `proof1` and the text "Basis step".
  - `PlanWhy` shows `math-required` and `proof3`.
- [ ] **Step 2: Run** `npx vitest run src/components/math` and expect FAIL (module not found).
- [ ] **Step 3: Implement `pieces.tsx`** by moving JSX out of `MathExplainer` unchanged. The shared `Card`/`H3` helpers move with it. Proof 1/2/3 each become their own `Card`. Then rewrite `MathExplainer` as intro paragraph + the pieces. In `RealExamples` the button now does `runExample(id)` and calls `router.push("/multi")` only for `exMulti` (no push otherwise; `runExample` already scrolls to `results-sec`).
- [ ] **Step 4: Run** `npx vitest run src/components/math` and expect PASS, including the existing `MathExplainer.test.tsx`.
- [ ] **Step 5: Commit** `refactor: split math explainer into reusable pieces`.

### Task 2: `Why` disclosure

**Files:**
- Create: `src/components/ui/Why.tsx`
- Modify: `src/copy/index.ts` (add `why: { show: "Why?", hide: "Hide the math" }`)
- Test: `src/components/ui/Why.test.tsx`

**Interfaces:**
- Produces: `Why({ id, topic, children }: { id: string; topic: string; children: React.ReactNode })`. It's a secondary `sm` button with label `Why?` / `Hide the math` and `aria-label` `"Why? " + topic` / `"Hide the math: " + topic`, plus `aria-expanded` and `aria-controls={id}`. The panel is `<div id={id} hidden={!open}>`, and children render only when open. The wrapper has class `why` so print can hide closed panels (closed = `hidden`, which print already omits).

- [ ] **Step 1: Write failing tests:** starts closed (`aria-expanded="false"`, child text absent); click opens (child present, label "Hide the math"); second click closes; Enter key on the focused button toggles.
- [ ] **Step 2: Run** `npx vitest run src/components/ui/Why.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement `Why`.**
- [ ] **Step 4: Run** the same command and expect PASS.
- [ ] **Step 5: Commit** `feat: Why disclosure for on-request math`.

### Task 3: Two-column `/calculator`

**Files:**
- Modify: `src/app/calculator/page.tsx`, `src/components/calculator/SingleCardForm.tsx`, `src/copy/index.ts`
- Create: `src/components/math/FullMath.tsx`
- Test: `src/components/calculator/CalculatorPage.test.tsx` (extend)

**Interfaces:**
- Consumes: Task 1 pieces, Task 2 `Why`.
- Produces: `FullMath()` = `<details id="math" className="inset-card ...">` with `<summary>` text `copy.fullMath` = `"The full math, step by step"`, containing `<MathExplainer />`. Closed by default. Element id `math` is used by Task 5.
- Page intro text: `"One card, two ways to pay, every result on one page."`

Layout (inside `<Ready>`):
```
<div class="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10 lg:items-start">
  <aside class="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"> <SingleCardForm/> </aside>
  <div class="grid gap-8">  ResultCards · CompareBars · Why(results) · BalanceChart · Why(chart) · YearlyChart ·
                            RequiredPayment · ExtraPayment · Why(plan) · MonthlyTable · FullMath </div>
</div>
```
Why ids/topics: `why-results` "the results", `why-chart` "the balance chart", `why-plan` "debt-free in N months".
`SingleCardForm` at `lg` stacks its fields in one column (`sm:grid-cols-2` becomes `sm:grid-cols-2 lg:grid-cols-1`, both grids), so they fit 360 px.

- [ ] **Step 1: Write failing tests** (extend `CalculatorPage.test.tsx`):
  - the page shows `result-B` "2 years" **and** the heading "Balance by month" **and** the "Monthly table" section together.
  - no element with `data-testid="proof1"` is visible before any click; clicking the `Why? the balance chart` button shows `proof1`.
  - the `#math` details element exists and is not `open`.
  - in the full math, clicking the first "Try this example" button calls no router push and changes `result-B` (example 1's result, read from the existing example test).
  - the aside has the `lg:overflow-y-auto` class (guards the tall-aside case).
- [ ] **Step 2: Run** `npx vitest run src/components/calculator/CalculatorPage.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement** the page, `FullMath`, the form column change and the copy.
- [ ] **Step 4: Run** `npm test` and expect PASS, except the `routes.test.tsx` cases rewritten in Task 5.
- [ ] **Step 5: Check in the browser** at 1280×800 and 1024×640: the aside stays put while the right column scrolls, and typing a balance updates the chart without scrolling.
- [ ] **Step 6: Commit** `feat: one-page calculator with sticky inputs and on-request math`.

### Task 4: Phone summary bar

**Files:**
- Create: `src/components/calculator/SummaryBar.tsx`
- Modify: `src/app/calculator/page.tsx`, `src/copy/index.ts`
- Test: `src/components/calculator/SummaryBar.test.tsx`

**Interfaces:**
- Produces: `SummaryBar()`. It observes `#tool` with `IntersectionObserver`. When `#tool` isn't intersecting, it renders a `lg:hidden` bar that's `sticky top-0 z-10 bg-bg border-b border-hair no-print`. The bar holds a text line from `copy.summary.line(bal, apr, a, b)`, for example `"30,000 ฿ · 16% · A 5% · B 1,500 ฿"` (use `formatBahtShort`; A shows `m%`, plus ` min 500 ฿` when floor > 0), and an `Edit` button (copy `summary.edit = "Edit"`). Edit scrolls to `#tool` (no smooth scroll under reduced motion) and focuses the first input in it.
- If `IntersectionObserver` is missing, render nothing.

- [ ] **Step 1: Write failing tests** with a stubbed `IntersectionObserver` that stores its callback:
  - nothing renders while `#tool` is intersecting.
  - after the callback reports `isIntersecting: false`, the text `30,000 ฿ · 16% · A 5% · B 1,500 ฿` shows.
  - clicking Edit focuses the "Balance (baht)" input.
  - with `IntersectionObserver` undefined, nothing renders and nothing throws.
- [ ] **Step 2: Run** `npx vitest run src/components/calculator/SummaryBar.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement**, and render `<SummaryBar />` first inside the calculator page's `<Ready>`.
- [ ] **Step 4: Run** the same command and expect PASS.
- [ ] **Step 5: Check in the browser** at 390×844: scroll past the form, the bar appears, Edit returns to the inputs.
- [ ] **Step 6: Commit** `feat: sticky summary bar on narrow screens`.

### Task 5: Old addresses, `?show=`, header and footer

**Files:**
- Create: `src/components/calculator/ShowTarget.tsx`
- Modify: `src/app/charts/page.tsx`, `src/app/why/page.tsx`, `src/app/calculator/page.tsx`, `src/copy/index.ts` (nav, footer), `src/app/routes.test.tsx`, `src/components/site/SiteHeader.test.tsx`
- Delete: nothing (`MathExplainer` stays, used by `FullMath`)

**Interfaces:**
- Produces: `RedirectTo({ to }: { to: string })`, a client component in `ShowTarget.tsx`. On mount it calls `router.replace(to + window.location.hash)` and renders a `Skeleton`. `/charts` renders `<RedirectTo to="/calculator?show=chart" />` and `/why` renders `<RedirectTo to="/calculator?show=math" />`. Each keeps a `metadata` title.
- Produces: `ShowTarget()`, rendered inside the calculator page's `<Ready>`. In an effect once, it reads `new URLSearchParams(location.search).get("show")`:
  - `chart` scrolls to `chart-sec`.
  - `math` sets `(document.getElementById("math") as HTMLDetailsElement).open = true` and scrolls to `math`.
  - Any other value does nothing.
  - In every case where `show` was present, it removes the query with `history.replaceState(null, "", location.pathname + location.hash)` inside try/catch. Scroll uses the same helper as `useCalculator` (export `scrollToId` from `src/hooks/useCalculator.ts` if it isn't exported).
- Nav links: `[{ href: "/calculator", label: "Calculator" }, { href: "/multi", label: "Several cards" }]`. Footer Tools: Calculator, Several cards. Footer Learn: `{ href: "/calculator?show=math", label: "The math" }`, How it works, FAQ.

- [ ] **Step 1: Rewrite/write failing tests:**
  - `routes.test.tsx`: drop the Charts/Why page renders. Add "`/charts` replaces itself with `/calculator?show=chart`" (mock `useRouter().replace`, assert the call). Add "`/why` opened at `/why#abc` replaces with `/calculator?show=math#abc`". Add "with `?show=math` the `#math` details opens and the query is removed". Add "with `?show=nonsense` nothing opens and the query is removed". Keep "a link loaded on the home page is available on the calculator page".
  - `SiteHeader.test.tsx`: the main nav has exactly two links, "Calculator" and "Several cards".
- [ ] **Step 2: Run** `npx vitest run src/app src/components/site` and expect FAIL.
- [ ] **Step 3: Implement** `ShowTarget.tsx`, the two redirect pages and the copy changes.
- [ ] **Step 4: Run** `npm test` and expect all PASS.
- [ ] **Step 5: Check** `npm run build` succeeds, and `/why` and `/charts` exist in `out/`.
- [ ] **Step 6: Commit** `feat: forward old charts and why pages, two-link header`.

### Task 6: `/multi` clean-up and print

**Files:**
- Modify: `src/app/multi/page.tsx`, `src/components/calculator/MultiCard.tsx`, `src/copy/index.ts`, `src/app/globals.css`
- Test: `src/components/calculator/MultiCard.test.tsx` (extend)

**Interfaces:**
- `/multi` intro becomes `"Split one monthly budget across 2 to 5 cards. The calculator tries 3 payoff strategies."` and `multi.heading` + `multi.hint` are removed from copy and from `MultiCard`. `MultiCard` renders a plain `<section id="multi">` (no outer `Panel`). Cards are rows separated by `border-t border-hair` with `py-5`, and the results grid keeps its inset cards. At the end of the page: a link `"See one card in detail"` to `/calculator` (copy `multi.detailLink`).
- Print (`@media print` in `globals.css`): the calculator grid becomes one column, the aside isn't sticky and has no max-height/overflow, and `SummaryBar` is hidden (it's already `no-print`).

- [ ] **Step 1: Write failing tests:** `/multi` page shows the heading "Several cards" exactly once (`getAllByRole("heading", { name: /Several cards/ })` length 1); the link "See one card in detail" points to `/calculator`.
- [ ] **Step 2: Run** `npx vitest run src/components/calculator/MultiCard.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement** and add the print rules.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run lint` and expect all PASS.
- [ ] **Step 5: Browser pass** at 1280, 1024 and 390 wide on `/calculator` and `/multi`, plus print preview of `/calculator` with one Why? open.
- [ ] **Step 6: Commit** `feat: tidy several cards page and one-column print`.
