# Debt calculator: Next.js rebuild with neumorphism design

Date: 2026-11-19
Status: ready for owner approval

## Intent

Rebuild the existing Thai credit-card debt calculator (`index.html` + `core.js` + `test.js`) as a Next.js app for the owner's **portfolio**. Reviewers will judge both the live page and the code, so the rebuild should show a current, professional stack while keeping everything that makes the project distinctive: correct, tested math, custom accessible charts, and the interactive Discrete Math explainer (recurrence relations and induction).

At the same time, replace the current generic card look with a **clean neumorphism** design on the "Cloud" palette, which the owner chose after comparing four live palettes in a working preview.

## Goals

- Same features, same numbers: every calculation result on the new site matches the current site exactly.
- Code that reads well to a reviewer: TypeScript, small components, a tested math core, a clear README.
- A clean, soft neumorphism look that stays readable for a data-heavy calculator.
- Easy to host as a static site (no server needed).

## Non-goals

- No new calculator features or new math.
- No accounts, backend, database, or analytics.
- No change to the Thai copy beyond what the new layout requires.
- No languages beyond Thai and English.

## Anti-goals (failure even if it "works")

- Any result differs from the current site (months, interest, closed-form checks, multi-card results).
- Neumorphism that makes inputs or buttons hard to find, or text that fails WCAG AA contrast.
- Losing current accessibility wins: keyboard focus rings, 44px touch targets, pattern-coded (not color-only) chart series, `prefers-reduced-motion` support, print layout.
- Swapping the custom SVG charts or the induction staircase for generic library widgets.
- A page that flashes default values before loading saved or shared numbers.

## Constraints

- The site is bilingual: Thai (default) and English. Fonts must include Thai glyphs.
- Shared links (`#` hash state) and saved state (localStorage) must keep working, including links created by the current site (same `encodeState`/`decodeState` format).
- The print / save-as-PDF layout must keep working.
- Static export (`output: 'export'`): no server-only features.

## Approaches considered

| Approach | Summary | Trade-off |
|---|---|---|
| **A. Modern full rewrite (chosen)** | Next.js App Router, TypeScript, Tailwind v4, tests in Vitest, sections as components, hand-drawn SVG charts as React components | Most work; strongest portfolio signal |
| B. Lighter migration | Next.js but keep `core.js` as JS, `node test.js`, CSS Modules | Faster, lower risk; looks dated to reviewers |
| C. Library-heavy | Like A, with Recharts and shadcn/ui | Less custom code; loses the pattern-coded charts and staircase, and shadcn defaults fight neumorphism |

The owner picked **A** ("like you", agreeing with the recommendation).

## Decided

### Stack
- Next.js (App Router) with `output: 'export'` for static hosting.
- TypeScript in strict mode.
- Tailwind CSS v4 with `@tailwindcss/postcss`; design tokens defined in `@theme` and as CSS variables.
- Vitest for tests.
- Fonts with `next/font/google`: **IBM Plex Sans Thai** (400, 500, 600, 700) for everything; **IBM Plex Mono** only where a monospace number display is needed (formula blocks).

### Math core
- `core.js` becomes `src/lib/debt.ts`: same functions, same constants (`EPS_PAID = 0.005`, `MAX_MONTHS = 1200`, `STUCK_MONTHS = 120`), same algorithms, no rounding during calculation. Add exported types (`SingleOptions`, `SimResult`, `Row`, `Card`, `MultiOptions`, `MultiResult`, and so on).
- `test.js` becomes Vitest test files that assert **exactly the same values with the same tolerances**. All 604 current assertions must exist and pass. Group them with `describe` blocks matching the current sections (formatBaht, monthsToText, method A, method B, requiredPayment, closed forms, induction, splitByYear, compareSentenceTh, simulateMulti, encode/decode).
- The math core never touches the DOM or React.

### Design: neumorphism, Cloud palette
Light theme tokens (from the approved preview):

| Token | Value | Use |
|---|---|---|
| `--bg` / surface | `#e4e9f0` | page and every raised/pressed surface |
| `--shadow-dark` | `#c1c9d4` | bottom-right shadow |
| `--shadow-light` | `#ffffff` | top-left highlight |
| `--text` | `#18212d` | body text |
| `--muted` | `#4f5b6c` | labels and hints (must pass AA on `--bg`) |
| `--accent` | `#1f5fbf` (cobalt) | the only accent: primary button, selected method, key result, slider thumb |
| `--on-accent` | `#ffffff` | text on accent |
| series A / B | `#1f5fbf` solid line / `#a04600` dashed line | charts keep solid vs dashed patterns (B darkened from `#b34e00`, which is 4.3:1 on `--bg`, to pass AA at 5.1:1) |
| good / warn / bad | `#1b7339` / `#8a4b00` / `#ad1f1f` | status text only, never decorative |
| focus ring | `#f29d00`, 3px | keyboard focus, must stay visible on neumorphic surfaces |

- **Raised** (cards, nav, buttons): `box-shadow: 9px 9px 20px var(--shadow-dark), -9px -9px 20px var(--shadow-light)` for sections, smaller for buttons.
- **Pressed** (inputs, table well, result tiles, slider tracks, formula blocks, warnings): the same shadows, `inset`.
- **Buttons:** raised pill; hover changes text to the accent; `:active` switches to the pressed shadow plus `translateY(1px)`; a selected toggle (for example method A/B) is filled with the accent.
- **Shape scale:** sections 22px radius, inner wells 14px, buttons and pills fully rounded. Applied everywhere.
- **Soft shadows:** keep the "cleanest" feel; no heavy depth.
- **Dark theme** (follows `prefers-color-scheme`): based on the "Night" preview palette (`--bg #262a33`, shadows `#1a1d23` / `#323743`), with the accent adjusted for contrast on dark. Uses the same token names.
- No em-dash characters in visible text in new or changed copy.

### Structure: one page, sections as components
The current single page and its anchor IDs (`#tool`, `#results-sec`, `#chart-sec`, `#multi`, `#why`) stay the same, so existing links and the nav keep working.

Components (names indicative):
- `Nav`: sticky section links.
- `Hero`: title, live headline sentence, links.
- `SingleCardForm`: balance, APR, method A (%, minimum in baht), method B (fixed payment), example buttons, share / print / reset.
- `ResultCards` + `CompareBars`: results for A and B, comparison bars, comparison sentence.
- `BalanceChart`: SVG line chart, month slider, play/pause, readout.
- `YearlyChart`: principal vs interest bars with hatch pattern.
- `RequiredPayment`: "pay off in N months" with "use as method B" action.
- `ExtraPayment`: extra-payment slider and its effect.
- `MonthlyTable`: collapsible table plus CSV download.
- `MultiCard`: card editor (2 to 5 cards), budget, strategy results, chart.
- `MathExplainer`: the "why" section, with `RecurrenceWalk` (month-by-month walk) and `InductionLadder` (staircase with autoplay).
- `Footer`: model limitations.

### State
- One client-side state holder for the single-card inputs and the multi-card inputs; derived results are computed with `useMemo` from the math core, not stored.
- Load order stays the same: URL hash first, then localStorage, then defaults. To avoid a flash of defaults with static export, the interactive area renders only after the state has loaded on the client (show a neumorphic skeleton of the same shape until then).
- Saving to localStorage and building the share link use the current key and format so old links still open.
- Input validation and inline error messages behave as today (parse commas, spaces and ฿; same rules and messages).

### Motion
- Keep current behavior: smooth scroll, month-by-month playback, staircase autoplay, entry animation of results.
- CSS transitions only (200 to 300 ms) on `transform`, `opacity` and `box-shadow`. No animation library.
- Everything respects `prefers-reduced-motion`, as today.

### Languages: Thai and English (owner's decision)
- Thai is the default and keeps today's wording. English is a full translation, including the math explainer and the model limitations.
- Routes: `/` is Thai and `/en` is English (both statically exported). `<html lang>` matches the route. A language switch in the nav links to the same section in the other language and keeps the current numbers (the hash state carries over).
- UI strings live in typed dictionaries (for example `src/i18n/th.ts` and `src/i18n/en.ts`) with a shared key type, so a missing translation is a compile error.
- Text built from numbers in the math core gets a language parameter: `monthsToText`, `compareSentence`, `explainFirstMonths` and the CSV header produce Thai or English. The Thai output stays exactly as today (the existing tests prove it); English output gets its own tests (for example 418 months → "34 years 10 months", with correct singular "1 year" / "1 month").
- Money is still shown in baht with the same `formatBaht` format in both languages.

### Hosting: Vercel (owner's decision)
- Deploy the static export to Vercel from the GitHub repo. No `basePath` is needed.
- Add page metadata for sharing a portfolio link: title, description and an Open Graph image per language.
- Deploying (connecting the repo to Vercel and publishing) happens only when the owner says so.

### Print
- Keep the current print rules: hide the nav, buttons, sliders and closed sections; flatten neumorphic shadows to plain borders on a white background.

### Repo layout
- The Next.js app lives at the repository root.
- `index.html`, `core.js` and `test.js` are removed only after the new site has full feature parity and all tests pass. They remain in git history.
- `README.md` is updated for the new stack (setup, scripts, structure, the math, live link).

## Left to the builder

- Exact file and folder names inside `src/`.
- How to split the large render functions into smaller components and hooks.
- How to measure chart width (the current code re-renders on resize).
- Exact sizes and spacing within the token rules above.
- ESLint / Prettier configuration.

## Calls made without the owner (check these)

1. Dark mode is included, based on the Night palette.
2. No animation library; CSS transitions only.
3. The old files are deleted after parity rather than kept in a `legacy/` folder.
4. English lives at its own route (`/en`) rather than a switch that only changes text in place, so a reviewer can be sent a direct English link and each language has its own share preview.
5. Thai stays the default language at `/`.
6. The language switch keeps the user's current numbers when switching.
