# Paydown Multi-page Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-page bilingual calculator into an English-only, five-page site ("Paydown") with a landing page, in the brief's warm-paper, sharp-cornered look.

**Architecture:** One root layout holds a client `CalcProvider` that runs `useCalculator()` once, so every page reads the same live numbers. Pages under `src/app/` are thin server files that compose existing section components. The look lives in `src/app/globals.css` tokens plus the `src/components/ui` primitives, so sections restyle mostly through those.

**Tech Stack:** Next.js 16.4 static export, React 19, TypeScript strict, Tailwind CSS 4.3, Vitest 5 + Testing Library, `next/font/google` (Host Grotesk, IBM Plex Mono), `simple-icons` (tool marks), Playwright 1.50.1 (dev-only, screenshots).

**Spec:** `docs/superpowers/specs/2026-11-19-paydown-multipage-design.md` (approved opening: `docs/superpowers/specs/2026-11-19-paydown-opening-prototype.html`)

## Global Constraints

- Branch `feat/paydown-multipage`. Commit after each task; end commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- English only. No Thai strings, routes or `lang` parameters remain after Task 1 (Thai card names inside old share links are user data and still load).
- Math is untouched: `src/lib/debt.ts`, `src/lib/parity.test.ts`, `tests/fixtures/legacy-core.cjs` must not change, and `src/lib/debt.test.ts` keeps every numeric assertion.
- Storage key `debtcalc.v1`; hash format `encodeURIComponent(JSON.stringify(state))`; only last-valid inputs are saved/shared; a loaded link's hash is removed after loading; old `/#{state}` links still load.
- Tokens (exact): page `#ede3d1`; surface `#e4dac9`; hairline `#cec5b3`; text `#000000`; muted `#373737`; accent `#92400e`; primary fill `#3b2a1a`; primary label `#fcfcfd`; inverse ground `#141314`; inverse text `#fcfcfd`; inverse muted `#bdb6aa`; inverse accent `#e8a873`; good `#2f5d1e`; bad `#9b1c1c`; series A `#3b2a1a` solid; series B `#92400e` dashed `"9 6"`; chart grid `#cec5b3`; focus outline 2px solid `#92400e`, offset 2px.
- Type: display Host Grotesk weight 500 (also 400/600 loaded), body IBM Plex Mono 400/500/600 at 16px/1.6. h1 67px/1.02, letter-spacing -0.025em at ≥ 900px; 50px/1.04 below. `text-wrap: balance` on headings. Numbers use tabular figures and never break inside a figure (`white-space: nowrap` on figure spans).
- Shape: border-radius 0 everywhere. Buttons: height 48px (compact 44px), square, primary = filled `#3b2a1a`, secondary = transparent with 1px `#3b2a1a` border. All touch targets ≥ 44px.
- Layout: container max 1200px + 24px side margin; band padding top/bottom 96/64px at ≥ 900px, 64/48px below; one page background; no divider lines between bands; cards are inset (surface fill + 1px hairline, no shadow). No box-shadows anywhere.
- No em-dash or en-dash characters in visible copy. Middle dot `·` at most once per line.
- Single light theme (no dark-mode tokens). Print: white background, no nav/buttons/sliders/footer, black text.
- `prefers-reduced-motion` disables transitions and count-up animation.
- Do not add analytics, cookies, external network calls at runtime, or invented reviews/customers. Scenario people are labelled "Illustrative scenario".

## Review Focus

1. **Moving between pages keeps numbers**: type on `/calculator`, click "Charts" in the header (client navigation), the chart uses the typed numbers with no loading flash. Pinned in Task 2.
2. **Old share links on the home page** (`/#{state}`) load into the shared state and show on `/calculator`. Pinned in Task 2.
3. **Header on a 390px phone**: menu button opens a panel with all links, Escape and link clicks close it, focus is managed. Pinned in Task 3.
4. **The hero mini calculator edits the same saved numbers** as `/calculator` and shows a skeleton (not defaults) before load. Pinned in Task 8.
5. **No orphans or broken figures** at 1440 and 390 on every page (e.g. "34 yrs 10 mo" never splits). Checked in Task 9's browser pass.

---

### Task 1: Remove Thai; single English root

**Files:**
- Delete: `src/app/(th)/`, `src/app/(en)/`, `src/i18n/th.ts`, `src/i18n/math.th.tsx`, `src/i18n/types.ts`, `src/i18n/index.ts`, `src/components/calculator/Nav.tsx`, `src/components/calculator/Nav.test.tsx`
- Move: `src/i18n/en.ts` → `src/copy/index.ts`, `src/i18n/math.en.tsx` → `src/copy/math.tsx`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Modify: `src/lib/format.ts`, `src/lib/state.ts`, `src/lib/chart.ts`, their tests, `src/hooks/useCalculator.ts`, every component that takes or passes `lang`, `src/app/RootShell.tsx` (merge into layout and delete), `src/app/opengraph-image.png` (move the English one here; delete the Thai one)

**Interfaces:**
- Produces: `export const copy` and `export type Copy = typeof copy` from `@/copy` (the former English dictionary, same key names: `copy.form`, `copy.results`, `copy.math`, ...). `useCalculator()` takes no arguments and still returns `t` (now `copy`). `formatBaht`, `monthsToText(n)`, `durationText(sim)`, `compareSentence(a, b, params)`, `explainFirstMonths(o, count)`, `toCsv(rows)` (English only). `defaultState()`, `newCard(index)`, `loadState({ hash, storage })`. `xTickLabel(k, step)`.

- [ ] **Step 1: Update tests first.** In `format.test.ts`, `state.test.ts`, `chart.test.ts`, `calc.test.ts` and the component tests, delete Thai-language cases and change calls to the new signatures (`monthsToText(418)` → `"34 years 10 months"`, `defaultState()` card names `Card A/B/C`, `xTickLabel(24, 12)` → `"2 yr"`). Component tests render `<Calculator />` with English labels. Delete `Nav.test.tsx` (the nav is rebuilt in Task 3).
- [ ] **Step 2: Run to verify failure.** `npx vitest run` fails on the changed signatures.
- [ ] **Step 3: Implement.** Remove every `lang` parameter and Thai branch; `src/app/layout.tsx` sets `<html lang="en">`, loads fonts as before (temporarily IBM Plex Sans Thai is replaced by IBM Plex Sans 400/500/600/700 so Latin text still renders until Task 2), metadata `title: { default: "Paydown: when does your card debt end?", template: "%s | Paydown" }`, `metadataBase: siteUrl`; `src/app/page.tsx` renders `<Calculator />` for now.
- [ ] **Step 4: Verify.** `npx vitest run` passes; `npm run typecheck`, `npm run lint` clean; `grep -rn "[ก-๙]" src` prints only test fixtures for old share links (Thai card names) if any; `npm run build` emits `out/index.html` and no `out/en*`.
- [ ] **Step 5: Commit.** `refactor: English only, single root layout`

---

### Task 2: Shared state provider and the five routes

**Files:**
- Create: `src/components/CalcProvider.tsx`, `src/app/calculator/page.tsx`, `src/app/charts/page.tsx`, `src/app/multi/page.tsx`, `src/app/why/page.tsx`, `src/components/PageIntro.tsx`, `src/app/routes.test.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/calculator/CalcContext.tsx`, `src/components/calculator/Calculator.tsx` (delete after its sections are distributed), `src/hooks/useCalculator.ts`, `src/components/math/MathExplainer.tsx`, existing component tests (render the page component under `CalcProvider`)

**Interfaces:**
- Consumes: Task 1's `useCalculator()`, `copy`.
- Produces:
  - `<CalcProvider>{children}</CalcProvider>` (`'use client'`): calls `useCalculator()` once and provides it via `CalcContext`; `useCalc()` unchanged.
  - `<Ready fallback?>{children}</Ready>`: renders `<Skeleton>` until `useCalc().ready`, then children.
  - `<PageIntro title="..." intro="..." />`: page h1 + one-line intro, used at the top of every tool page.
  - Routes: `/calculator` = SingleCardForm, ResultCards, CompareBars, RequiredPayment, ExtraPayment; `/charts` = BalanceChart, YearlyChart, MonthlyTable (table open by default); `/multi` = MultiCard; `/why` = MathExplainer rendered as a plain section (not a collapsed `<details>`; the `#why` click listener is removed). Each page exports `metadata.title` ("Calculator", "Charts", "Several cards", "Why it happens").
  - `runExample(id)` keeps updating numbers only; buttons that leave the page use `next/link` or `useRouter().push`: example buttons on `/why` go to `/calculator#results-sec` (ex1/ex2/ex400) or `/multi` (exMulti).
  - `shareUrl` builds from `window.location.origin + "/calculator"`.

- [ ] **Step 1: Write the failing tests** in `routes.test.tsx` (mock `next/navigation`): rendering `<CalcProvider><CalculatorPage/></CalcProvider>` shows "2 years" in result B; changing the fixed payment to `2,000` and then rendering `<ChartsPage/>` inside the same provider shows the month-12 readout for B as `9,327.50 baht left` (computed by `simulate`; it was 15,787.66 at 1,500); with `location.hash` set to an old-format link whose `p` is `"2,000"`, `<CalcProvider><HomePage/></CalcProvider>` followed by `<CalculatorPage/>` shows "1 year 5 months"; `<WhyPage/>` shows "Basis step" without clicking anything; the copy-link action writes a URL ending in `/calculator#` + encoded state.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** Root layout: `<CalcProvider>` wraps `{children}` (header and footer come in Task 3). Home `src/app/page.tsx` is a placeholder (h1 + link to `/calculator`) until Task 8.
- [ ] **Step 4: Verify.** `npx vitest run`, typecheck, lint, build (`out/calculator.html`, `out/charts.html`, `out/multi.html`, `out/why.html`, `out/index.html`).
- [ ] **Step 5: Commit.** `feat: shared calculator state across five routes`

---

### Task 3: The Paydown look, primitives, header and footer

**Files:**
- Modify: `src/app/globals.css` (replace tokens and utilities), `src/app/layout.tsx` (fonts), `src/components/ui/*` (Panel, Button, ToggleGroup, NumberField, RangeField, Skeleton), `src/components/calculator/Stat.tsx`
- Create: `src/components/site/SiteHeader.tsx`, `src/components/site/SiteFooter.tsx`, `src/components/site/Wordmark.tsx`, `src/components/site/SiteHeader.test.tsx`
- Delete: `src/components/calculator/Footer.tsx`, `src/components/calculator/Hero.tsx` (home is rebuilt in Task 8)

**Interfaces:**
- Produces:
  - CSS tokens as Tailwind theme colors: `bg`, `surface`, `hair`, `ink`, `muted`, `accent`, `btn`, `on-btn`, `inv`, `on-inv`, `inv-muted`, `inv-accent`, `good`, `bad`, `series-a`, `series-b`; fonts `font-display`, `font-mono` (body default mono). Utilities: `.inset-card` (surface fill + 1px hairline), `.band` (section padding per Global Constraints), `.container-page` (1200px + 24px margins). The neumorphic utilities `raised`, `raised-sm`, `pressed`, `pressed-sm`, `hatch-b` are removed; every use is replaced (`raised` panels become plain bands or `.inset-card`; `pressed` wells become `.inset-card` or bordered inputs). B bars keep a hatched pattern in series B.
  - `<Button variant="primary" | "secondary" | "quiet" size="md" | "sm" href?>`: renders `next/link` when `href` is set.
  - `<Wordmark />`: 22px square in `#3b2a1a` with a 6px `#92400e` base strip + "Paydown" in Host Grotesk 600 21px; links to `/`.
  - `<SiteHeader />` (`'use client'`): 76px tall; wordmark left; links "Calculator", "Charts", "Several cards", "Why it happens" (IBM Plex Mono 500 14px; current page marked with a 1px underline and `aria-current="page"` via `usePathname`); primary compact button "Open the calculator" → `/calculator`. Below 900px: links and button hide, a 44px square menu button (`aria-expanded`, `aria-controls`) opens a full-width panel listing the links and the button; Escape or a link click closes it and focus returns to the menu button.
  - `<SiteFooter />`: Paydown blurb ("A free calculator that shows how long card debt really lasts, and why."), three link columns (Tools: Calculator, Charts, Several cards; Learn: Why it happens, How it works = `/#how`, FAQ = `/#faq`; Project: "Source on GitHub" = `https://github.com/Namo2551/dept-calculation`, "README" = that repo's README), social: GitHub icon link only, the model-limitations note (the five existing limitation lines condensed into one sentence), "© 2026 Paydown. Educational estimate, not financial advice."
  - Layout: `<SiteHeader/>` above and `<SiteFooter/>` below `{children}` inside `<CalcProvider>`.

- [ ] **Step 1: Write the failing tests** in `SiteHeader.test.tsx` (mock `usePathname` to `/charts`): the "Charts" link has `aria-current="page"`; at 390px (`window.innerWidth` + a `matchMedia` stub is not needed, test the menu button directly) clicking the menu button sets `aria-expanded="true"` and shows all four links; pressing Escape closes it and focuses the menu button; every header link and button has class `min-h-11` or height ≥ 44 via class `h-11`/`h-12`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** the tokens, fonts (`Host_Grotesk` weights 400/500/600 variable `--font-display`; `IBM_Plex_Mono` 400/500/600 `--font-mono`), primitives, header and footer. Restyle every existing section only through primitives and the removed-utility replacements so all pages render in the new look (detailed page layout comes in Tasks 4-7).
- [ ] **Step 4: Verify.** `npx vitest run`, typecheck, lint, build; `grep -rn "raised\|pressed\|hatch-b\|rounded-" src` returns nothing except `rounded-none` if used.
- [ ] **Step 5: Commit.** `feat: Paydown look, header and footer`

---

### Task 4: `/calculator` page

**Files:** Modify `src/app/calculator/page.tsx`, `SingleCardForm.tsx`, `ResultCards.tsx`, `CompareBars.tsx`, `RequiredPayment.tsx`, `ExtraPayment.tsx`; add tests to `src/components/calculator/Calculator.test.tsx`.

- [ ] **Step 1: Failing tests:** the page has one h1 "Calculator" with intro "Compare paying the minimum with a fixed amount each month."; result figures ("34 years 10 months", "5,126.95 baht") are inside elements with class `whitespace-nowrap`; the page ends with a link "See it on a chart" → `/charts`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** Layout at ≥ 900px: two columns, form (inset card) on the left 5/12, results on the right 7/12 (A and B side by side inside one inset card separated by a hairline, as in the hero frame); compare bars and the comparison sentence below in a full-width band; "debt-free in N months" and "pay extra" as two inset cards side by side; examples as secondary buttons; share/print/reset as quiet text buttons. Phone: single column, results directly after the form.
- [ ] **Step 4: Verify** tests, typecheck, lint.
- [ ] **Step 5: Commit.** `feat: calculator page`

### Task 5: `/charts` page

**Files:** Modify `src/app/charts/page.tsx`, `BalanceChart.tsx`, `YearlyChart.tsx`, `MonthlyTable.tsx`, `src/components/charts/LineChart.tsx`; tests in `MonthlyTable.test.tsx`.

- [ ] **Step 1: Failing tests:** h1 "Charts" with intro "Watch the balance fall month by month, and where each year's payments go."; the monthly table is visible without a click (no `<details>`) and shows 418 rows for method A; the chart and table share a method toggle per section as before; page ends with a link "Paying off several cards?" → `/multi`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** Charts sit in inset cards; series A `#3b2a1a` solid, series B `#92400e` dashed; label halos use the surface color; ToggleGroup restyled as square segmented controls; the table uses tabular figures, right-aligned numeric columns, a sticky header on the surface color, max height 480px with scroll.
- [ ] **Step 4: Verify.**
- [ ] **Step 5: Commit.** `feat: charts page`

### Task 6: `/multi` page

**Files:** Modify `src/app/multi/page.tsx`, `MultiCard.tsx`; tests in `MultiCard.test.tsx`.

- [ ] **Step 1: Failing tests:** h1 "Several cards" with intro "Enter 2 to 5 cards and one monthly budget, then compare three ways to pay."; the three strategy results render as three columns at ≥ 900px with the least-interest one marked by a 2px `#3b2a1a` top border and the label "Least interest"; existing behaviours (2-5 cards, budget warning, unnamed card) still pass; page ends with "Why does this happen?" → `/why`.
- [ ] **Step 2-5:** run red, implement, verify, commit `feat: several cards page`.

### Task 7: `/why` page

**Files:** Modify `src/app/why/page.tsx`, `src/components/math/*`, `src/copy/math.tsx`; tests in `MathExplainer.test.tsx`.

- [ ] **Step 1: Failing tests:** h1 "Why it happens" with the intro from `copy.math.intro`; the three steps appear as numbered sections (01/02/03 not allowed as eyebrows: use the existing step titles as h2); formulas render in IBM Plex Mono inside inset cards; "Try this example" buttons are links to `/calculator#results-sec` or `/multi`; existing walk/ladder/proof tests still pass.
- [ ] **Step 2-5:** run red, implement (long-reading layout: text column max 68ch, formulas and interactive cards may run to 820px), verify, commit `feat: why page`.

---

### Task 8: Home landing page

**Files:**
- Create: `src/components/home/*` (one file per section: `Hero.tsx`, `HeroCalculator.tsx`, `BuiltWith.tsx`, `Features.tsx`, `Steps.tsx`, `Scenarios.tsx`, `Plans.tsx`, `Faq.tsx`, `Closing.tsx`), `src/components/home/Home.test.tsx`, `scripts/screens/capture.mjs`, `public/screens/{charts,multi,why}.png`
- Modify: `src/app/page.tsx`, `package.json` (devDependencies `playwright@1.50.1`, dependency `simple-icons`; script `"screens": "node scripts/screens/capture.mjs"`)

**Interfaces:** Consumes `useCalc()`, `simulate`, `formatBaht`, `monthsToText`, `Button`, `Wordmark`. Opening screen must match `docs/superpowers/specs/2026-11-19-paydown-opening-prototype.html` (open it in a browser at 1440 and 390 before building).

Exact copy and numbers (all computed from 30,000 baht at 16%; verify with `simulate` in tests):
- Hero h1 "When does your card debt end?"; lede "Compare paying the minimum with a fixed amount each month, watch the balance month by month, and see the math behind it."; actions "Open the calculator" → `/calculator`, "Why minimums take decades" → `/why`; trust "Free, no sign-up. Your numbers stay in your browser."; basis "Example: 30,000 ฿ balance at 16% a year"; stats "34y 10m" / "5% minimum", "2 years" / "fixed 1,500 ฿", "5,782 ฿" / "interest saved", "Never" / "at 400 ฿ / month".
- Hero frame: browser chrome (three 9px squares, URL bar "paydown.vercel.app/calculator"), then `HeroCalculator`: four NumberFields bound to the shared state (`bal`, `apr`, `m`, `p`), results A/B (duration + interest), a small LineChart of both balances. Before `ready`: a skeleton of the same size.
- Built with: caption "Built with"; marks (Simple Icons, single color `#373737`, height 22px, with visible names): Next.js, React, TypeScript, Tailwind CSS, Vitest, Vercel.
- Features (h2 "Three more ways to see your debt"): rows alternate image left/right: "Watch the balance fall" (charts.png, link "Open the charts" → `/charts`), "Decide which card to pay first" (multi.png, "Compare strategies" → `/multi`), "See the math, not just the answer" (why.png, "Read the explainer" → `/why`); each with a 2-sentence description written from the page's real features. Images are real screenshots in browser frames at 1:1 or downscaled, never upscaled.
- Steps (id `how`, h2 "How it works"): connected 1-2-3: "Enter your numbers" / "Compare two ways to pay" / "See why it happens", one sentence each.
- Scenarios (h2 "What it looks like for real balances", caption "Illustrative scenarios with real calculations, not customer reviews."): large: "Mali" (initials avatar "M", square), quote "At the 5% minimum my 30,000 ฿ would take 34 years 10 months. Paying a fixed 1,500 ฿ clears it in 2 years and saves 5,782.13 ฿ in interest."; small: "Krit": "Paying 400 ฿ a month only covers the interest. After 10 years I'd have paid 48,000 ฿ and still owe 30,000 ฿."; small: "Ploy": "With three cards and a 3,000 ฿ budget, paying the highest interest first clears everything in 1 year, with 3,390.91 ฿ of interest instead of 14,598.37 ฿ on minimums only."
- Plans (h2 "Three ways to pay 30,000 ฿ at 16%"), three columns: "5% minimum": price "from 1,500 ฿/mo", features "34 years 10 months", "10,909.08 ฿ interest", "40,909.08 ฿ paid in total", action "Try it" → `/calculator`; "Fixed 1,500 ฿" (marked "Used in our example", filled primary action): "2 years", "5,126.95 ฿ interest", "35,126.95 ฿ paid in total"; "Fixed 2,000 ฿": "1 year 5 months", "3,695.90 ฿ interest", "33,695.90 ฿ paid in total". Each action sets the matching example numbers via `setSingle` then navigates to `/calculator`.
- FAQ (id `faq`, h2 "Questions"): six native `<details>` (several open at once, custom marker, focusable summary): "Why does paying the minimum take so long?", "Is this accurate for my bank?", "Where are my numbers stored?", "What is the difference between avalanche and snowball?", "What happens if I pay less than the interest?", "Can I share or print my results?"; answers 1-3 sentences each from the site's real behaviour (monthly interest model; localStorage only; share link contains the numbers).
- Closing: full-width inverse band (`#141314`, text `#fcfcfd`), title "See your own numbers" and two actions in one row ("Open the calculator" in the inverse style: filled `#fcfcfd` with `#141314` label; "Read why it happens" outlined in `#fcfcfd`).

- [ ] **Step 1: Failing tests** in `Home.test.tsx`: h1 text; four stats; editing the hero balance to `45,000` updates `useCalc().state.single.bal` (render a probe consumer); hero shows `role="status"` skeleton before ready (server render via `renderToString`); six Built-with names; scenario caption present; plan figures equal `formatBaht(simulate(...).totalInterest)` for 0.05/1,500/2,000; FAQ items can be open simultaneously; closing band links.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**, then `npm run build && npx serve out -l 4321` in the background and `npm run screens` (Playwright at 1440×900, `colorScheme: light`, element screenshots of each tool page's main content area, saved to `public/screens/`), rebuild.
- [ ] **Step 4: Verify** tests, typecheck, lint, build; capture the home page at 1440 and 390 (full page) and compare the opening with the prototype stills: same two-column split, two-line headline at 1440, stats under a black rule, frame on the right.
- [ ] **Step 5: Commit.** `feat: Paydown landing page`

---

### Task 9: Share image, README, final browser pass

**Files:** Modify `scripts/og/og.html`, `scripts/og/make-og-images.sh`, `src/app/opengraph-image.png`, `README.md`; delete `assets/fonts/IBMPlexSansThai-SemiBold.ttf` and its OFL if unused.

- [ ] **Step 1:** Update the share-image template to the Paydown look (page ground, wordmark, h1, the 34y 10m vs 2 years line, Host Grotesk via Google Fonts or a committed OFL TTF) and regenerate one English image.
- [ ] **Step 2:** README: name, pages, look, stack, scripts (`dev`, `test`, `build`, `screens`), structure, the math, disclaimer.
- [ ] **Step 3:** Browser pass with Playwright on the static export at 1440×900 and 390×844 for all five pages: no console errors, no horizontal overflow, no `—`/`–`/`NaN`/`Infinity` in text, no orphaned last-line word in any h1/h2 (check with `Range.getClientRects` on the last word), header menu works at 390, client navigation keeps numbers, an old `/#{state}` link loads, print emulation hides header/footer/buttons.
- [ ] **Step 4:** `npx vitest run`, typecheck, lint, build all clean.
- [ ] **Step 5: Commit.** `docs: Paydown README and share image`
