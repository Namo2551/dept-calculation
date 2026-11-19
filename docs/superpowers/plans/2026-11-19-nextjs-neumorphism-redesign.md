# Debt Calculator Next.js Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-file Thai debt calculator as a bilingual (Thai `/`, English `/en`) Next.js static site with a neumorphism "Cloud" design, with results identical to the current site.

**Architecture:** A pure TypeScript math core (`src/lib/debt.ts`, ported 1:1 from `core.js`) and pure text/state/chart helpers sit under `src/lib`, all unit-tested in Vitest, including a parity test against the original `core.js`. One client component tree (`Calculator`) renders every section from a single `useCalculator` hook. Two route groups give each language its own root layout and `<html lang>`.

**Tech Stack:** Next.js 16.4 (App Router, `output: 'export'`), React 19, TypeScript strict, Tailwind CSS 4.3 (`@tailwindcss/postcss`), Vitest 5 + @testing-library/react + jsdom, `next/font/google` (IBM Plex Sans Thai, IBM Plex Mono). Node 26.

**Spec:** `docs/superpowers/specs/2026-11-19-nextjs-neumorphism-redesign-design.md`

## Global Constraints

- Every number the new site shows must equal the current site's for the same input. `src/lib/debt.ts` keeps `EPS_PAID = 0.005`, `MAX_MONTHS = 1200`, `STUCK_MONTHS = 120` and does not round during calculation.
- All assertions in `test.js` are ported with the same values and tolerances (604 checks).
- Thai text produced today must stay byte-identical (the current tests pin it); English is a full translation.
- Static export only (`output: 'export'`); no server features, no API routes.
- localStorage key stays `debtcalc.v1`; the URL hash state format stays `encodeURIComponent(JSON.stringify(state))`, and old links must load.
- Load order: URL hash, then localStorage, then defaults. No flash of defaults before saved/shared state loads.
- Anchor IDs stay: `tool`, `results-sec`, `chart-sec`, `yearly-sec`, `tableBox`, `multi`, `why`.
- Tokens (light / dark): bg `#e4e9f0` / `#262a33`; shadow-dark `#c1c9d4` / `#1a1d23`; shadow-light `#ffffff` / `#323743`; text `#18212d` / `#eef1f6`; muted `#4f5b6c` / `#aab2c0`; accent `#1f5fbf` / `#7aa9ff`; on-accent `#ffffff` / `#0b1220`; series-a = accent; series-b `#a04600` / `#ffa45c`; good `#1b7339` / `#72d394`; warn `#8a4b00` / `#ffd08a`; bad `#ad1f1f` / `#ff9f9f`; focus `#f29d00` / `#ffc14d` (3px outline, 2px offset). Every pair above passes WCAG AA (checked: lowest is series-b light at 5.11:1).
- Radius scale: sections 22px, inner wells 14px, buttons/pills/toggles fully rounded.
- One accent. Shadows are tinted from the background, never black.
- Touch targets at least 44px tall. Charts keep solid vs dashed vs dotted series and hatched interest bars (never color alone).
- Every animation and smooth scroll is disabled under `prefers-reduced-motion: reduce`. No animation library.
- No em-dash (`—`) or en-dash (`–`) characters in any visible string, in either language. Where the current Thai copy shows `—` for "no value", use `-`; ranges like `1–5` become `1-5`.
- Work on branch `feat/nextjs-redesign`, not `main`.

## Review Focus

1. **Old share links and anchor hashes.** A link made by the current site (string values, Thai card names) must load its numbers, and a plain anchor hash like `#tool` must not count as state or wipe saved numbers. Pinned in Task 4.
2. **Typing an invalid or half-typed value** (`""`, `"30,0"`, `"abc"`, `"1e3"`, APR `0`): the field shows its inline error and every result keeps the last valid numbers, with no crash or `NaN` on screen. Pinned in Task 4 (state) and Task 6 (UI).
3. **localStorage unavailable** (private mode throws on `getItem`/`setItem`): the page still loads defaults and works. Pinned in Task 4.
4. **Extreme but valid inputs** (m = 100%, p = 0, n = 1200, balance 1,000,000,000, budget 0, APR 0): charts get a finite y-axis (no `log10(0)`), no infinite loops. Pinned in Task 2 (parity) and Task 5 (chart helpers).
5. **Switching language** keeps the user's current numbers, and the English page's sentences use English plurals ("1 year", "2 years"). Pinned in Task 3 and Task 10.

---

### Task 1: Scaffold the Next.js project on a branch

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `src/app/(th)/layout.tsx`, `src/app/(th)/page.tsx`, `src/app/globals.css`, `src/lib/smoke.test.ts`
- Keep untouched: `index.html`, `core.js`, `test.js` (still needed until Task 11)

**Interfaces:**
- Produces: `npm run dev`, `npm run build` (static export to `out/`), `npm test` (Vitest, run once), `npm run test:legacy` (`node test.js`), `npm run lint`, `npm run typecheck` (`tsc --noEmit`). Path alias `@/*` → `src/*`.

- [ ] **Step 1: Branch.** `git checkout -b feat/nextjs-redesign`
- [ ] **Step 2: Scaffold.** Run `npx create-next-app@16.4.6 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (answer "yes" to proceed in a non-empty directory). If it refuses because of existing files, scaffold into a scratch folder and move the generated files in. Remove the generated demo content from the page.
- [ ] **Step 3: Route group.** Move the generated `src/app/layout.tsx` and `page.tsx` into `src/app/(th)/`. The layout renders `<html lang="th">`. The page renders a placeholder `<main>` for now.
- [ ] **Step 4: Static export.** In `next.config.ts` set `output: 'export'`, `images: { unoptimized: true }`, `trailingSlash: false`.
- [ ] **Step 5: Vitest.** `npm i -D vitest@5.1.1 @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. In `vitest.config.ts` use the React plugin, the `@` alias, `environment: 'jsdom'` and `setupFiles: ['./vitest.setup.ts']` (which imports `@testing-library/jest-dom/vitest`). Add the scripts listed under Interfaces. Add `out/`, `.superpowers/` and `.next/` to `.gitignore`.
- [ ] **Step 6: Smoke test.** `src/lib/smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 7: Verify.** `npm test` passes 1 test; `npm run test:legacy` prints `ผ่าน 604 / 604 — ผ่านทั้งหมด`; `npm run build` succeeds and `out/index.html` exists.
- [ ] **Step 8: Commit.** `git add -A && git commit -m "chore: scaffold Next.js app with Tailwind v4 and Vitest"`

---

### Task 2: Port the math core to TypeScript with a parity test

**Files:**
- Create: `src/lib/debt.ts`, `src/lib/debt.test.ts`, `src/lib/parity.test.ts`, `tests/fixtures/legacy-core.cjs` (exact copy of `core.js`)

**Interfaces:**
- Produces (all exported from `src/lib/debt.ts`):
  - `type Row = { month: number; start: number; interest: number; payment: number; end: number }`
  - `type SingleOptions = { balance: number; apr: number } & ({ strategy: 'pct'; m: number; floor?: number } | { strategy: 'fixed'; p: number })`
  - `type SimResult = { rows: Row[]; r: number; months: number | null; monthsTo1pct: number | null; totalPaid: number; totalInterest: number | null; firstPayment: number; lastPayment: number | null; neverDecreases: boolean }`
  - `simulate(o: SingleOptions): SimResult`
  - `closedFormFixed(B0: number, r: number, p: number, n: number): number`
  - `closedFormPct(B0: number, r: number, m: number, n: number): number`
  - `requiredPayment(balance: number, apr: number, n: number): { exact: number; roundedUp: number }`
  - `verifyClosedForm(o: SingleOptions, maxMonths: number): number`
  - `type YearSplit = { year: number; interest: number; principal: number; payment: number }`; `splitByYear(rows: Row[]): YearSplit[]`
  - `inductionStepDemo(o: { balance: number; apr: number; p: number; k: number }): { Bk: number; nextByRecurrence: number; nextByClosedForm: number; diff: number }`
  - `type Card = { name?: string; balance: number; apr: number; m: number; floor?: number }`; `type MultiStrategy = 'avalanche' | 'snowball' | 'minonly'`
  - `type MultiResult = { months: number | null; paidOffMonth: (number | null)[]; totals: { month: number; balance: number; payment: number }[]; totalPaid: number; totalInterest: number | null; budgetTooLow: boolean }`
  - `simulateMulti(o: { cards: Card[]; budget: number; strategy: MultiStrategy }): MultiResult`
  - `encodeState(obj: unknown): string`; `decodeState(str: string): unknown | null`

- [ ] **Step 1: Write the failing tests.** In `debt.test.ts`, port every numeric assertion from `test.js` for `simulate`, `requiredPayment`, `closedFormFixed`, `closedFormPct`, `verifyClosedForm`, the induction loops, `splitByYear`, `inductionStepDemo`, `simulateMulti` and encode/decode (`test.js` lines 29-102, 114-126, 136-166), keeping the same inputs, expected values and tolerances. Use `describe` blocks named after the `test.js` comment headings. Keep `near(a, b, tol = 0.01)` as a local helper built on `expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)` (and `expect(a).not.toBeNull()` first), so loops like "closedFormPct > 0 for n 0..100" stay assertion-for-assertion. Formatting/text assertions (`formatBaht`, `monthsToText`, `explainFirstMonthsTh`, `toCsv`, `compareSentenceTh`) belong to Task 3.
- [ ] **Step 2: Write the parity test.** `parity.test.ts` loads the fixture with `createRequire(import.meta.url)('../../tests/fixtures/legacy-core.cjs')` and compares `toEqual` results of the old and new `simulate`, `requiredPayment`, `splitByYear` and `simulateMulti` for this input grid: balances `[1, 999.99, 30000, 1e9]` × APR `[0, 16, 24, 100]` × pct `m` `[0.001, 0.05, 1]` with floor `[0, 500]` and fixed `p` `[0, 400, 1500, 1e9]`; `requiredPayment` for n `[1, 24, 1200]`; `simulateMulti` with the default 3 cards × budgets `[0, 1000, 3000]` × all three strategies.
- [ ] **Step 3: Run to verify failure.** `npx vitest run src/lib` fails with "Cannot find module './debt'".
- [ ] **Step 4: Implement `src/lib/debt.ts`.** A typed, line-for-line port of the corresponding `core.js` functions (same loop order, same comparisons, same constants). `paymentFor` stays private. No rounding added anywhere.
- [ ] **Step 5: Verify.** `npx vitest run src/lib` passes; `npm run typecheck` passes.
- [ ] **Step 6: Commit.** `git add src/lib tests && git commit -m "feat: port debt math core to TypeScript with parity tests"`

---

### Task 3: Bilingual text helpers

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/i18n/types.ts`

**Interfaces:**
- Consumes: `SimResult`, `SingleOptions`, `Row`, `simulate` from Task 2.
- Produces:
  - `type Lang = 'th' | 'en'` (in `src/i18n/types.ts`)
  - `formatBaht(n: number): string`
  - `monthsToText(n: number, lang: Lang = 'th'): string`
  - `pctText(m: number): string`
  - `durationText(sim: SimResult, lang: Lang): string`: `monthsToText(months)` when paid off; otherwise `'ไม่หมด'` / `'Never'` when `neverDecreases`, else `'เกิน 100 ปี'` / `'Over 100 years'`.
  - `compareSentence(a: SimResult, b: SimResult, params: { m: number; p: number }, lang: Lang = 'th'): string`
  - `explainFirstMonths(o: SingleOptions, count: number, lang: Lang = 'th'): string[]`
  - `toCsv(rows: Row[], lang: Lang = 'th'): string`

- [ ] **Step 1: Write the failing tests.** Port `test.js` lines 19-27, 104-112 and 128-134 unchanged, using the new names with `lang` omitted (Thai). Add English tests:

```ts
const en = { 0: '0 months', 1: '1 month', 5: '5 months', 12: '1 year', 13: '1 year 1 month', 17: '1 year 5 months', 24: '2 years', 418: '34 years 10 months' };
// each: expect(monthsToText(+k, 'en')).toBe(v)
expect(compareSentence(a5, b1500, { m: 0.05, p: 1500 }, 'en')).toBe(
  'Paying the 5% minimum takes 34 years 10 months (interest 10,909.08 baht), while paying a fixed 1,500.00 baht takes 2 years (interest 5,126.95 baht). Difference: 5,782.13 baht');
expect(compareSentence(a5, b400, { m: 0.05, p: 400 }, 'en')).toContain('is not paid off within 100 years');
expect(compareSentence(a5, b400, { m: 0.05, p: 400 }, 'en')).not.toContain('Difference');
expect(explainFirstMonths(B(1500), 1, 'en')[0]).toBe('Month 1: balance 30,000.00 + interest 400.00, pay 1,500.00, left 28,900.00');
expect(toCsv(b1500.rows, 'en').split('\n')[0]).toBe('Month,Start balance,Interest,Payment,End balance');
expect(durationText(simulate(B(400)), 'en')).toBe('Never');
```

  English "never" form: `'Paying the 5% minimum is not paid off within 100 years, while ...'` with the same clause swap for B (`'paying a fixed 400.00 baht is not paid off within 100 years'`).
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/lib/format.test.ts` fails (module not found).
- [ ] **Step 3: Implement `src/lib/format.ts`.** Thai branches are copied from `core.js` exactly (including the missing space before `ใช้เวลา` in the B clause, which the existing test pins). English pluralizes "year"/"month" by count.
- [ ] **Step 4: Verify.** `npx vitest run` passes everything so far.
- [ ] **Step 5: Commit.** `git add src && git commit -m "feat: bilingual text helpers"`

---

### Task 4: State: parsing, validation, load/save/share

**Files:**
- Create: `src/lib/state.ts`, `src/lib/state.test.ts`

**Interfaces:**
- Consumes: `encodeState`, `decodeState` (Task 2), `Lang` (Task 3).
- Produces:
  - `type SingleRaw = { bal: string; apr: string; m: string; floor: string; p: string; n: string }`
  - `type CardRaw = { name: string; balance: string; apr: string; m: string; floor: string }`
  - `type AppState = { single: SingleRaw; multi: { budget: string; cards: CardRaw[] } }`
  - `STORAGE_KEY = 'debtcalc.v1'`
  - `defaultState(lang: Lang): AppState`: single `{ bal: '30,000', apr: '16', m: '5', floor: '0', p: '1,500', n: '24' }`; budget `'3,000'`; cards `[{ name: 'บัตร A' | 'Card A', balance: '20,000', apr: '24', m: '5', floor: '200' }, { 'บัตร B' | 'Card B', '8,000', '18', '5', '200' }, { 'บัตร C' | 'Card C', '3,000', '12', '5', '200' }]`
  - `EXAMPLES: Record<'ex1' | 'ex2' | 'ex400', Omit<SingleRaw, 'n'>>`: ex1 `{30,000, 16, 5, 0, 1,500}`, ex2 floor `500`, ex400 p `400`
  - `newCard(index: number, lang: Lang): CardRaw`: name `'บัตร ' / 'Card '` + `'ABCDE'[index]`, balance `'5,000'`, apr `'16'`, m `'5'`, floor `'200'`
  - `parseNumber(s: string): number` (strip `,`, whitespace and `฿`; empty or non-numeric gives `NaN`)
  - `type RuleKey = 'bal' | 'balance' | 'apr' | 'm' | 'floor' | 'p' | 'budget' | 'n'`
  - `validate(key: RuleKey, raw: string): number | null` with the rules from `index.html` `RULES` (bal/balance > 0; apr 0..100; m 0.1..100; floor, p, budget ≥ 0; n integer 1..1200)
  - `isValidState(s: unknown): s is AppState` (has `single` and `multi`, `multi.cards` is an array of length 2..5); values are normalized with `String()` because old links may hold numbers
  - `loadState(opts: { hash: string; storage: Pick<Storage, 'getItem'> | null; lang: Lang }): { state: AppState; source: 'link' | 'saved' | 'default' }`
  - `saveState(storage: Pick<Storage, 'setItem'> | null, state: AppState): void` (never throws)
  - `shareUrl(href: string, state: AppState): string` (`href` without its hash, plus `#` and the encoded state)

- [ ] **Step 1: Write the failing tests.**

```ts
test('old share link from the current site loads', () => {
  const old = { single: { bal: '45,000', apr: '18.5', m: '5', floor: '300', p: '2,000', n: '36' },
    multi: { budget: '3,000', cards: [{ name: 'บัตรเงินสด ใบที่ ๑', balance: '1,234.56', apr: '18.25', m: '5', floor: '200' }, { name: 'บัตร B', balance: '8,000', apr: '18', m: '5', floor: '200' }] } };
  const r = loadState({ hash: '#' + encodeURIComponent(JSON.stringify(old)), storage: null, lang: 'th' });
  expect(r.source).toBe('link'); expect(r.state).toEqual(old);
});
test('anchor hash falls through to saved state', () => {
  const saved = defaultState('th'); saved.single.bal = '12,345';
  const storage = { getItem: (k: string) => (k === 'debtcalc.v1' ? JSON.stringify(saved) : null) };
  expect(loadState({ hash: '#tool', storage, lang: 'th' })).toEqual({ state: saved, source: 'saved' });
});
test('storage that throws gives defaults', () => {
  const storage = { getItem: () => { throw new Error('SecurityError'); } };
  expect(loadState({ hash: '', storage, lang: 'en' })).toEqual({ state: defaultState('en'), source: 'default' });
  expect(() => saveState({ setItem: () => { throw new Error('QuotaExceeded'); } }, defaultState('th'))).not.toThrow();
});
test('numeric values from old links are normalized to strings', () => { /* single.bal: 30000 -> '30000' */ });
test('cards outside 2..5 are rejected', () => { /* 1 card and 6 cards -> isValidState false */ });
test.each([['bal', '', null], ['bal', '30,0', 300], ['bal', 'abc', null], ['bal', '1e3', 1000], ['bal', '0', null],
  ['apr', '0', 0], ['apr', '100.1', null], ['m', '0.05', null], ['m', '0.1', 0.1], ['n', '24.5', null], ['n', '1200', 1200],
  ['p', ' ฿1,500 ', 1500]])('validate(%s, %j) = %j', (k, raw, out) => expect(validate(k as RuleKey, raw)).toBe(out));
test('shareUrl replaces an existing hash', () => {
  expect(shareUrl('https://x.dev/en#tool', defaultState('en'))).toBe('https://x.dev/en#' + encodeState(defaultState('en')));
});
```

- [ ] **Step 2: Run to verify failure.** `npx vitest run src/lib/state.test.ts` fails (module not found).
- [ ] **Step 3: Implement `src/lib/state.ts`.**
- [ ] **Step 4: Verify.** `npx vitest run` passes.
- [ ] **Step 5: Commit.** `git add src/lib && git commit -m "feat: calculator state parsing, validation and persistence"`

---

### Task 5: Chart geometry helpers

**Files:**
- Create: `src/lib/chart.ts`, `src/lib/chart.test.ts`

**Interfaces:**
- Consumes: `SimResult`, `YearSplit` (Task 2), `Lang`.
- Produces:
  - `niceMax(x: number): number` (returns `1` when `x <= 0` or not finite; otherwise the `index.html` algorithm)
  - `shortBaht(x: number): string` (`1.25M`, `20k`, `950`)
  - `balanceSeries(sim: SimResult, B0: number, len: number): number[]` (the `series()` function)
  - `chartLength(A: SimResult, B: SimResult, range: 'all' | '60' | '120'): number` (clamped 12..480 for `'all'`)
  - `xTickStep(len: number): number` (6 / 12 / 24 / 60 / 120 by the thresholds in `lineChart`)
  - `xTickLabel(k: number, step: number, lang: Lang): string` (`'6 ด.'` / `'6 mo'` when step < 12, else `'2 ปี'` / `'2 yr'`)
  - `groupYears(years: YearSplit[]): { label: string; interest: number; principal: number }[]` (5-year groups when more than 15 years; labels like `'1-5'`, last group ends at the real last year, e.g. `'31-35'`; hyphen, not en-dash)
  - `playStep(len: number, speed: 1 | 2 | 4): number` (`max(1, round(len / 120)) * speed`)

- [ ] **Step 1: Write the failing tests.** `niceMax`: `0 → 1`, `NaN → 1`, `31000 → 50000`, `20000 → 20000`, `2400 → 2500`, `1e9 → 1e9`. `shortBaht`: `1250000 → '1.25M'`, `20000 → '20k'`, `950 → '950'`. `balanceSeries` for `simulate(B(1500))`, B0 30000, len 30: length 31, `[0] === 30000`, `[24] === 0` within 1e-9, `[30] === 0`. For `simulate(B(400))` with len 200: length 121 (stops after the 120 simulated months). `chartLength` for A5 vs B1500 with `'all'`: `418`; with `'60'`: `60`. `groupYears` on `splitByYear(simulate(A(0.05,0)).rows)` (35 years): 7 groups, labels `'1-5'` … `'31-35'`, summed interest equals `10909.08` within 0.01. `playStep(418, 2) === 6`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `src/lib/chart.ts`.**
- [ ] **Step 4: Verify.** `npx vitest run` passes.
- [ ] **Step 5: Commit.** `git add src/lib && git commit -m "feat: chart geometry helpers"`

---

### Task 6: Theme, UI primitives, dictionaries, and the single-card tool

This task makes the first visible slice: Thai and English pages with the input form, result cards, compare bars, "pay off in N months" and "pay extra".

**Files:**
- Create: `src/app/globals.css` (replace), `src/app/(en)/en/layout.tsx`, `src/app/(en)/en/page.tsx`, `src/app/fonts.ts`, `src/i18n/th.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/components/ui/{Panel,Button,ToggleGroup,NumberField,RangeField,Skeleton,CountUp}.tsx`, `src/hooks/useCalculator.ts`, `src/hooks/useReducedMotion.ts`, `src/components/calculator/{Calculator,Hero,SingleCardForm,ResultCards,CompareBars,RequiredPayment,ExtraPayment}.tsx`, `src/components/calculator/Calculator.test.tsx`
- Modify: `src/app/(th)/layout.tsx`, `src/app/(th)/page.tsx`

**Interfaces:**
- Consumes: Tasks 2-5.
- Produces:
  - `src/i18n/th.ts` exports `th`; `export type Dict = typeof th`; `src/i18n/en.ts` exports `en: Dict` (a missing key fails `typecheck`). `getDict(lang: Lang): Dict`. Interpolated strings are functions, e.g. `resultTitleA: (m: string, floor: string | null) => string`.
  - `useCalculator(lang: Lang)` returns `{ ready: boolean; state: AppState; errors: Partial<Record<string, boolean>>; single: SingleCalc | null; multi: MultiCalc | null; message: string; setSingle(field: keyof SingleRaw, value: string): void; setBudget(value: string): void; setCard(i: number, field: keyof CardRaw, value: string): void; addCard(): void; removeCard(i: number): void; runExample(id: 'ex1' | 'ex2' | 'ex400' | 'exMulti'): void; reset(): void; share(): Promise<'copied' | 'fallback'>; shareLink: string }`
  - `type SingleCalc = { v: { bal: number; apr: number; m: number; floor: number; p: number; n: number }; pA: SingleOptions; pB: SingleOptions; A: SimResult; B: SimResult }` (m is in percent in `v`, as a fraction in `pA`)
  - `type MultiCalc = { cards: Card[]; budget: number; results: Record<MultiStrategy, MultiResult>; best: MultiStrategy | null; minSum: number }`
  - Error keys: single fields by name (`'bal'`), card fields as `'card.{i}.{field}'`, `'budget'`.
  - `<Calculator lang={lang} />` (client component, `'use client'`) renders all sections; later tasks add their sections to it.
  - CSS utilities in `globals.css`: `.raised`, `.raised-sm`, `.pressed`, `.pressed-sm`, plus `@theme` tokens `--color-bg`, `--color-text`, `--color-muted`, `--color-accent`, `--color-on-accent`, `--color-series-a`, `--color-series-b`, `--color-good`, `--color-warn`, `--color-bad`, `--color-focus`, `--shadow-dark`, `--shadow-light`.

- [ ] **Step 1: Write the failing UI tests** in `Calculator.test.tsx` (render `<Calculator lang="th" />`, clear `localStorage` and `location.hash` before each):
  - after load, the B result card shows `2 ปี` and interest `5,126.95 บาท`; the A card shows `34 ปี 10 เดือน`
  - typing `abc` into the balance field shows the inline error `ยอดหนี้ต้องเป็นตัวเลขมากกว่า 0` with `aria-invalid="true"` and the B card still shows `2 ปี`
  - clicking the `ex400` example shows the strong warning containing `400.00 บาท` and the B duration `ไม่หมด`
  - with `location.hash` set to an old-format link whose `p` is `'2,000'`, the B card shows `1 ปี 5 เดือน` and the status message `ใช้ตัวเลขจากลิงก์แล้ว`
  - before the load effect runs, the skeleton (`role="status"`, `aria-busy="true"`) renders instead of default numbers
  - rendering `<Calculator lang="en" />` shows `2 years` and `Never` after clicking the 400 example
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/components` fails (module not found).
- [ ] **Step 3: Theme.** Write `globals.css` with the Global Constraints tokens under `@theme`, dark values under `@media (prefers-color-scheme: dark)`, the raised/pressed shadow utilities (sections `9px 9px 20px` / `-9px -9px 20px`; buttons `5px 5px 11px`; pressed uses the same values `inset`, smaller for inputs `4px 4px 9px`), `:focus-visible` outline, `scroll-behavior: smooth` gated by `prefers-reduced-motion: no-preference`, and `font-variant-numeric: tabular-nums` on numbers.
- [ ] **Step 4: Fonts and layouts.** `src/app/fonts.ts` loads IBM Plex Sans Thai (subsets `thai`, `latin`; weights 400/500/600/700) and IBM Plex Mono (500/600) with CSS variables. Both root layouts import `globals.css`, apply the font variables, and set `<html lang="th">` / `<html lang="en">` plus `metadata` title and description from the dictionary.
- [ ] **Step 5: Dictionaries.** Move every Thai string the single-card sections need from `index.html` into `th.ts` verbatim (dashes per Global Constraints), and translate each into `en.ts`.
- [ ] **Step 6: Primitives.** `Button` (variants `raised`, `primary`, and `pressed` for a selected toggle; `:active` uses the pressed shadow and `translateY(1px)`), `ToggleGroup` (`role="radiogroup"` of buttons with `aria-checked`), `NumberField` (label above, input with `inputMode`, error below with `⚠` and the bold "ตรวจสอบ:" / "Check:" prefix, not color alone), `RangeField`, `Panel` (`<section>` with `.raised`, 22px radius), `Skeleton`, `CountUp` (500ms ease-out cubic count-up from the previous value; instant under reduced motion; a 650ms timeout forces the final text).
- [ ] **Step 7: `useCalculator`.** `ready` is false on the server and first client render; a `useEffect` calls `loadState` with `location.hash` and `window.localStorage` (each access in try/catch), sets the state, then sets `ready`. Results are derived with `useMemo` from validated values; when any single field is invalid, `single` keeps the last valid `SingleCalc` (held in a ref). Every state change calls `saveState`. `reset` removes the storage key, clears the hash with `history.replaceState`, and restores `defaultState(lang)`. `share` tries `navigator.clipboard.writeText(shareLink)` and returns `'fallback'` on error or after 1500ms.
- [ ] **Step 8: Sections.** `Hero` (title, live headline from `defaultState`, links, banner), `SingleCardForm` (`id="tool"`, balance/APR, fieldsets for A and B, example buttons, share/print/reset row with the fallback read-only link field), `ResultCards` + `CompareBars` (inside `id="results-sec"`; bars use no background track per the spec's clean look: a pressed well holding the solid A bar and the hatched B bar), `RequiredPayment` (with "use as method B", which sets `p` and resets the extra slider), `ExtraPayment` (0..2000 step 100). Logic and copy follow the matching `index.html` render functions.
- [ ] **Step 9: Pages.** `(th)/page.tsx` renders `<Calculator lang="th" />`; `(en)/en/page.tsx` renders `<Calculator lang="en" />`.
- [ ] **Step 10: Verify.** `npx vitest run` passes; `npm run typecheck` passes; `npm run build` produces `out/index.html` and `out/en.html`.
- [ ] **Step 11: Commit.** `git add -A && git commit -m "feat: neumorphism theme and bilingual single-card calculator"`

---

### Task 7: Balance chart and yearly chart

**Files:**
- Create: `src/components/charts/LineChart.tsx`, `src/components/calculator/{BalanceChart,YearlyChart}.tsx`, `src/hooks/useElementWidth.ts`, `src/components/charts/LineChart.test.tsx`
- Modify: `src/components/calculator/Calculator.tsx`, `src/i18n/{th,en}.ts`

**Interfaces:**
- Consumes: `SingleCalc` (Task 6); `niceMax`, `shortBaht`, `balanceSeries`, `chartLength`, `xTickStep`, `xTickLabel`, `groupYears`, `playStep` (Task 5).
- Produces:
  - `useElementWidth(ref: RefObject<HTMLElement>): number` (ResizeObserver; `800` when unavailable, as in jsdom); chart width is `clamp(300, width, 940)`, height `280` below 480px wide, else `330` (yearly: `250` / `290`)
  - `<LineChart len ymax series={{ data: number[]; color: string; dash?: string; label: string; at: number; dy: number }[]} aria lang>{extra?: (x, y) => ReactNode}</LineChart>` reused by the multi-card chart in Task 9

- [ ] **Step 1: Write the failing tests.** `LineChart.test.tsx`: renders an `svg` with `role="img"` and the given `aria-label`; with `ymax = 0` no text node contains `NaN` or `Infinity` (the axis falls back to `niceMax(0) = 1`); a series with `dash="9 6"` renders a path with `stroke-dasharray="9 6"`; x-axis labels use `ปี` for `lang="th"` and `yr` for `lang="en"` when `len = 418`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** `LineChart` follows `lineChart()` in `index.html`: 4 grid lines, the same margins (L 52, R 14, T 14, B 40), series labels drawn with a halo (`stroke` = bg color, `paint-order="stroke"`). `BalanceChart` (`id="chart-sec"`): range toggle (`60` / `120` / `all`), play/pause with speed toggle 1x/2x/4x (100ms interval, step from `playStep`), month slider with the readout for A and B, the ◆ "below 1%" markers, the "B: debt never decreases" label, and the slider position line. Playback stops and resets whenever inputs change. `YearlyChart` (`id="yearly-sec"`): A/B toggle, solid principal bars and hatched interest bars (pattern id unique per instance via `useId`), totals above bars when bar width ≥ 30, the yearly note text.
- [ ] **Step 4: Verify.** `npx vitest run` passes; in `npm run dev`, the Thai page chart shows A reaching zero at 34 years 10 months with the range "all" (manual check).
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: balance and yearly charts"`

---

### Task 8: Monthly table and CSV

**Files:**
- Create: `src/components/calculator/MonthlyTable.tsx`, `src/components/calculator/MonthlyTable.test.tsx`
- Modify: `Calculator.tsx`, `src/i18n/{th,en}.ts`

**Interfaces:**
- Consumes: `SingleCalc`, `toCsv(rows, lang)`, `formatBaht`.

- [ ] **Step 1: Write the failing test.** Closed `<details id="tableBox">` renders no `<tr>` in the body; after opening, method B shows 24 rows and the last row's payment cell is `626.95`; clicking CSV calls `URL.createObjectURL` with a Blob whose text starts with `﻿` and the language's CSV header, and the download name is `debt-B.csv`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** (rows render only while open; sticky header inside a pressed, scrollable well, max height 420px).
- [ ] **Step 4: Verify.** `npx vitest run` passes.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: monthly table with CSV export"`

---

### Task 9: Multiple cards

**Files:**
- Create: `src/components/calculator/MultiCard.tsx`, `src/components/calculator/MultiCard.test.tsx`
- Modify: `Calculator.tsx`, `src/i18n/{th,en}.ts`

**Interfaces:**
- Consumes: `MultiCalc`, `setCard`, `addCard`, `removeCard`, `setBudget` (Task 6); `LineChart` (Task 7).

- [ ] **Step 1: Write the failing tests.** Defaults show Avalanche `1 ปี` with interest `3,390.91 บาท`, Snowball `3,827.52 บาท`, minimum-only `6 ปี 7 เดือน`, and the "least interest in this simulation" badge only on Avalanche. Budget `1,000` shows the budget-too-low warning. With 2 cards both delete buttons are disabled; with 5 cards "add card" is disabled. An empty card name displays as `ไม่มีชื่อ` / `Unnamed` in the payoff order list.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** following `updateMulti()` and `renderCardsEditor()` in `index.html`: the three strategy results (each marked by its line style: dotted, solid, dashed, shown as a small line sample next to the title rather than a colored top border), the payoff order per strategy, the combined chart, the explanatory list.
- [ ] **Step 4: Verify.** `npx vitest run` passes.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: multi-card strategies"`

---

### Task 10: Math explainer, nav with language switch, footer, metadata

**Files:**
- Create: `src/components/math/{MathExplainer,RecurrenceWalk,InductionLadder,Proofs}.tsx`, `src/components/calculator/{Nav,Footer}.tsx`, `src/components/math/MathExplainer.test.tsx`, `src/components/calculator/Nav.test.tsx`, `src/app/(th)/opengraph-image.tsx`, `src/app/(en)/en/opengraph-image.tsx`
- Modify: `Calculator.tsx`, `src/i18n/{th,en}.ts`

**Interfaces:**
- Consumes: `SingleCalc`; `closedFormFixed`, `closedFormPct`, `verifyClosedForm`, `inductionStepDemo`, `simulate`, `requiredPayment` (Task 2); `explainFirstMonths`, `durationText` (Task 3); `shareLink` (Task 6).

- [ ] **Step 1: Write the failing tests.**
  - `MathExplainer.test.tsx`: with defaults, the walk at month 3 shows walk and closed-form values `26,655.80` both and `✓`; the walk slider max is `23` (B pays the full 1,500 for 23 months); the ladder at k = 11 shows `15,787.66` in box ③ and `✓`; proof 3 says the condition is not met for p = 1,500 and met after the 400 example. English render shows "Basis step" and "Inductive step".
  - `Nav.test.tsx`: on `/` the language link points to `/en#` + `encodeState(currentState)`; on `/en` it points to `/#…`; links `#tool`, `#results-sec`, `#chart-sec`, `#multi`, `#why` exist; activating `#why` opens the `<details id="why">`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** Port `renderMath`, `renderWalk`, `renderLadder` and `toggleLadder` (700ms interval, 400ms under reduced motion, stops at k = 24) as components; formulas use `<sub>`/`<sup>` in IBM Plex Mono pressed wells. The four "where is this in real life" example buttons call `runExample` and scroll to the results. Translate all explainer copy into `en.ts`. `Footer` lists the model limitations. `Nav` is sticky, one line on desktop (scrolls sideways on mobile), with the language link labelled `English` / `ไทย`. Each layout's `metadata` gets `openGraph` title and description; each `opengraph-image.tsx` (1200×630, `dynamic = 'force-static'`) shows the title and the "34 years 10 months vs 2 years" headline in that language.
- [ ] **Step 4: Verify.** `npx vitest run` passes; `npm run build` emits `out/opengraph-image.png` and `out/en/opengraph-image.png`.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: math explainer, language switch and share metadata"`

---

### Task 11: Print styles, cleanup, README, final verification

**Files:**
- Modify: `src/app/globals.css`, `README.md`, `package.json`
- Delete: `index.html`, `core.js`, `test.js`

- [ ] **Step 1: Print.** Add `@media print` rules matching `index.html` lines 124-142: hide nav, buttons, sliders, closed `<details>`, hints and the language link; white background; neumorphic shadows become `1px solid #c1c9d4` borders; a print-only summary line from the dictionary.
- [ ] **Step 2: Delete legacy files** (`git rm index.html core.js test.js`) and the `test:legacy` script. `tests/fixtures/legacy-core.cjs` stays so the parity test keeps proving equality.
- [ ] **Step 3: README.** Rewrite for the new stack: what it is (both languages), live link placeholder `https://<project>.vercel.app`, `npm install`, `npm run dev`, `npm test`, `npm run build`, project structure (`src/lib`, `src/i18n`, `src/components`, `src/app`), the math section kept from the current README, and the disclaimer.
- [ ] **Step 4: Full verification.** `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` all succeed. Count assertions ported from `test.js`: `grep -c` is not reliable, so run `npx vitest run --reporter=verbose src/lib/debt.test.ts src/lib/format.test.ts` and confirm every `describe` from `test.js` is present.
- [ ] **Step 5: Browser check.** Serve `out/` (`npx serve out`) and check, in light and dark mode, on `/` and `/en`: inputs and buttons are clearly visible; the focus ring shows when tabbing; an old share link opens with its numbers; switching language keeps numbers; print preview fits the summary; no `—` appears (`grep -R "—" out/*.html out/en*.html` returns nothing).
- [ ] **Step 6: Commit.** `git add -A && git commit -m "chore: print styles, remove legacy files, update README"`

Deploying to Vercel is not part of this plan; it happens only when the owner asks.
