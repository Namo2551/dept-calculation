# Paydown: multi-page English site with a landing page

Date: 2026-11-19
Status: approved by the owner (checkpoint: plan + opening-screen prototype, "yep")
Builds on: `2026-11-19-nextjs-neumorphism-redesign-design.md` (math, tests, share links, accessibility rules carry over)

## Intent

The calculator is one long page (about 6,000 px). The owner wants it split into separate pages, English only, under a landing page built from a pasted design brief, for their portfolio. The brief's look replaces the neumorphism theme across the whole site.

## Decisions (owner)

- Five pages: `/` home (landing), `/calculator`, `/charts`, `/multi`, `/why`.
- English only. Thai is removed completely (routes, dictionary, `lang` parameters, Thai share image). Baht stays the currency.
- Name and wordmark: **Paydown**.
- The brief's look applies to the whole site.
- Sections with no real content are repurposed honestly: logo cloud → "Built with" real tools; testimonials → example borrowers labelled as illustrative scenarios with real computed numbers; pricing → three ways to pay the same 30,000 ฿ at 16% (5% minimum / fixed 1,500 / fixed 2,000) compared side by side with real computed costs; the example plan is marked.
- The approved opening screen is `2026-11-19-paydown-opening-prototype.html` (desktop 1440 and 390 px stills reviewed). The home hero matches it, with the browser frame holding a working mini calculator.
- Helper agents build the pages (one implementer per task, reviewed, sequential).

## Approaches considered

| Approach | Summary | Trade-off |
|---|---|---|
| **A. Shared state in the root layout (chosen)** | `useCalculator` runs once in a client provider inside the single root layout; pages are thin compositions of existing sections | Instant page changes, no reload flash; the provider is a client wrapper |
| B. Each page loads its own state | Every page runs the hook and reads storage on open | Loading flash on every navigation; half-typed values reset between pages |
| C. `[lang]` segment | Keeps i18n machinery | Ruled out: English only |

## Look (from the brief)

- Colour: page `#ede3d1`, inset surface `#e4dac9`, hairline `#cec5b3`, text `#000000`, muted `#373737`, accent `#92400e`, primary action fill `#3b2a1a` with label `#fcfcfd`, inverse ground `#141314` with text `#fcfcfd`. Status: good `#2f5d1e`, bad `#9b1c1c`, warning uses the accent. Chart series A `#3b2a1a` solid, series B `#92400e` dashed. All text pairings measured ≥ 5.1:1 on page and surface.
- Accent has two jobs only: series B / "this costs you" highlights, and small brand marks (trust bullet, wordmark base). The primary action is the dark brown fill, not the accent.
- Type: Host Grotesk (display, weight 500) and IBM Plex Mono (body 16 px/1.6). Display 67 px at 1440, 50 px at 390; headline breaks balanced, no orphans, no breaks inside figures.
- Shape: all corners 0. Buttons square: primary filled, secondary 1 px outline. Touch targets ≥ 44 px.
- Layout: container 1200 px, page margin 24 px, band padding 96/64 px desktop and 64/48 px phone, one background, no dividers between bands, cards are inset (surface fill + 1 px hairline, no shadow).
- Imagery: no photography is available; the site shows its own product. Hero: working calculator in a browser frame. Feature rows: real screenshots of the tool pages, captured from the built site, in browser frames.
- One light theme (the brief defines one palette). The closing banner is the single inverted band.

## Pages

- **Home `/`**, in the brief's order: header (wordmark, 4 links, "Open the calculator", menu button under 900 px) · hero (headline "When does your card debt end?", lede, two actions, trust caption, example basis line, four key numbers, live mini calculator in a browser frame) · "Built with" row (Next.js, React, TypeScript, Tailwind CSS, Vitest, Vercel) · three alternating feature rows (Charts, Several cards, Why) · three connected steps · example borrowers (one large, two small, labelled illustrative) · three ways to pay side by side (5% minimum / fixed 1,500 / fixed 2,000; the example plan marked) · FAQ (6, several open at once) · inverted closing banner with two actions · footer (Paydown blurb, 3 link columns, GitHub link, limitations note, copyright).
- **`/calculator`**: form, results A/B, compare bars, "debt-free in N months", "pay extra", share/print/reset, examples.
- **`/charts`**: balance chart with range/playback/slider, yearly bars, monthly table + CSV.
- **`/multi`**: several cards editor, budget, strategy results, combined chart.
- **`/why`**: the Discrete Math explainer, open by default (no collapsed `<details>`), with its "try this example" buttons taking you to `/calculator` or `/multi`.

Every tool page opens with a page title and a one-line intro, and links onward to the next page.

## Constraints carried over

- Math, parity test and all numeric tests unchanged and green. Thai wording tests are deleted with Thai.
- localStorage key `debtcalc.v1` and the hash state format stay; old share links (including `/#{state}` on the home page) still load. New share links point at `/calculator`.
- Only valid inputs are saved and shared; a loaded invalid section falls back to defaults; a loaded link's hash is removed after loading.
- WCAG AA contrast, visible focus (2 px accent outline, 2 px offset), reduced motion, print layout (light, no controls), no em/en dashes in visible copy.
- Static export; metadataBase from `NEXT_PUBLIC_SITE_URL` or the Vercel production URL; one English share image.

## Left to the builder

Inner layouts of each tool page within the look, exact spacing within the scale, FAQ wording, scenario personas (clearly fictional, real numbers), screenshot capture details.
