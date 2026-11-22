# Credit Card Debt Calculator (เครื่องคิดเลขหนี้บัตรเครดิต)

A bilingual (Thai / English) web app that answers one question: **"If I only pay the minimum, when will my credit card debt be gone?"**

The top half is a working calculator for your own numbers. The bottom half explains the math behind the results with **recurrence relations** and **mathematical induction** (Discrete Math), using the numbers you typed.

**Live:** `https://<project>.vercel.app` (Thai at `/`, English at `/en`)

## Features

- **Two payment methods for one card**
  - **Method A:** pay a percentage of the remaining balance, with an optional minimum in baht
  - **Method B:** pay the same amount every month
- **Results:** months until the debt is gone, total interest, and a sentence comparing the two methods
- **Balance chart** with range options, a month slider and month-by-month playback
- **Yearly breakdown** of principal vs. interest
- **"Pay off in N months":** the monthly payment you would need
- **"Pay extra" slider:** how much sooner extra payments clear the debt
- **Monthly table** with CSV export
- **Several cards:** compares **avalanche** (highest APR first), **snowball** (smallest balance first) and **minimum only**, within one monthly budget
- **Math explainer:** step through the recurrence month by month, climb the induction "staircase" with your numbers, and see three claims proved
- **Share and save:** your numbers live in the URL hash (share link) and in localStorage; the language switch keeps them. Print / save as PDF has its own layout.
- **Accessible by design:** keyboard focus rings, 44px touch targets, charts that use line styles and hatching (not color alone), WCAG AA contrast in light and dark mode, and reduced-motion support

## Example

A 30,000 baht balance at 16% APR:

| Strategy | Time to pay off | Total interest |
|---|---|---|
| 5% minimum | 34 years 10 months | 10,909.08 ฿ |
| 10% minimum | 14 years 5 months | 4,615.38 ฿ |
| 5% minimum, at least 500 ฿ | 4 years 5 months | 8,980.60 ฿ |
| Fixed 1,500 ฿/month | 2 years | 5,126.95 ฿ |
| Fixed 400 ฿/month | Never (only covers interest) | - |

## The math

With monthly rate `r = APR / 12`:

- **Recurrence:** `B(k) = (1 + r)·B(k−1) − payment(k)`
- **Closed form, fixed payment `p`:** `Bn = (1+r)^n·B0 − p·((1+r)^n − 1) / r`
- **Closed form, percentage `m` with no minimum in baht:** `Bn = B0·(1 + r − m)^n`

Three claims, proved by induction on the page:

1. The closed form for fixed payments is correct for every `n`.
2. A pure percentage payment never brings the balance to exactly zero.
3. If the payment is no more than the first month's interest (`p ≤ r·B0`), the debt never decreases.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, server mode; public pages prerendered), React 19, TypeScript (strict)
- Hosting: Netlify (`netlify.toml`); accounts and data: Supabase (see `docs/superpowers/specs/2026-11-22-debt-management-system-design.md`)
- Tailwind CSS 4 with a hand-built neumorphism theme (light "Cloud" and dark "Night" palettes)
- Vitest + Testing Library: about 300 tests, including a **parity test** that runs the original JavaScript core side by side with the TypeScript port on 200+ input combinations and requires identical results
- IBM Plex Sans Thai and IBM Plex Mono via `next/font`

## Getting started

Requires Node.js 22 or newer.

```sh
npm install
npm run dev        # http://localhost:3000 (Thai) and /en (English)
npm test           # run the test suite once
npm run build      # production build (.next/); npx next start to run it
npm run lint
npm run typecheck
```

## Project structure

```
src/
  lib/            Pure logic, no React: debt math (debt.ts), text in both languages (format.ts),
                  input state and share links (state.ts), results (calc.ts), chart geometry (chart.ts)
  i18n/           Thai and English dictionaries; the English one must match the Thai shape (checked by TypeScript)
  hooks/          useCalculator (all calculator state), element width, reduced motion
  components/
    ui/           Neumorphic building blocks: Panel, Button, ToggleGroup, NumberField, RangeField, CountUp
    calculator/   Page sections: form, results, charts, table, several cards, nav, footer
    charts/       Shared SVG line chart
    math/         The Discrete Math explainer (recurrence walk, induction ladder, proofs)
  app/            Routes: (th)/ is "/", (en)/en/ is "/en", each with its own <html lang> and share image
tests/fixtures/   Frozen copy of the original core.js, used by the parity test
scripts/og/       Template and script that render the share images with headless Chrome
```

### Share images

`src/app/(th)/opengraph-image.png` and `src/app/(en)/en/opengraph-image.png` are rendered from `scripts/og/og.html` by `bash scripts/og/make-og-images.sh` (needs Google Chrome). They are static PNGs because the built-in image renderer drops stacked Thai tone marks.

## Disclaimer

This is an educational estimate. Real credit cards may calculate interest differently (for example, daily accrual, fees or changing rates), so check with your card issuer before making financial decisions.

Fonts: IBM Plex, licensed under the SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
