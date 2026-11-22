# Brief for feature agents (Paydown debt management system)

Read first: `docs/superpowers/specs/2026-11-22-debt-management-system-design.md` (architecture), `AGENTS.md` (this Next.js 16 has breaking changes; read `node_modules/next/dist/docs/` for any API you use: `params`/`searchParams` are Promises, `cookies()` is async, Server Actions + `useActionState` for forms).

## Setup in your worktree
1. `npm ci`
2. Copy the env file from the main checkout: `cp /c/Users/lENOVO/Desktop/vscode/dept-calculation/.env.local .env.local` (public URL + publishable key only; it is git-ignored, never commit it).
3. Checks you must keep green: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
4. Do **not** use the in-app browser pane (other agents share it). If you run a dev/prod server, use your assigned port and test with `curl` only; stop it before you finish.
5. Do **not** apply database migrations or change the Supabase project. If you need a schema change, stop and report it.

## What already exists (use it, don't change it)
- Auth gate: `requireUser(nextPath)`, `requireProfile()`, `requireConsent()` in `src/lib/auth.ts`. Every private page calls one of them; every Server Action that writes calls `requireConsent()` and returns `appCopy.needConsent` as a form error when `consentMissing` is true.
- Supabase server client is returned by those helpers (typed with `src/lib/supabase/database.types.ts`). RLS limits every query to the user's rows; still never trust ids from the form for ownership (RLS + composite FKs enforce it, the DB returns an error or 0 rows).
- Private routes live in `src/app/(app)/<feature>/`. The `(app)/layout.tsx` already renders the app nav (Dashboard, Plans, Debts, Strategy, Goals, Sharing, Account) and the consent banner.
- Math (pure, tested): `src/lib/debt.ts` (`simulate`, `simulateMulti`, `requiredPayment`, `splitByYear`), `src/lib/plans.ts` (`simulateWithBonus`, `paymentForInterestLimit`), `src/lib/ledger.ts` (`buildLedger`, `compareToPlan`, `projectFrom`, `plannedRows`, `monthIndex`, `addMonths`, `todayISO`), `src/lib/overview.ts` (`overviewOf`, `totalsOf`, `minimumDue`), `src/lib/data/load.ts` (`loadOverviews`, `loadOverview`).
- Formatting: `src/lib/money.ts` (`formatMoney`, `formatMoneyShort`, `monthYear`, `shortDate`), `src/lib/format.ts` (`monthsToText`, `formatBaht`).
- UI kit: `src/components/ui/` (`Button` with `href`, `Panel`/`PanelTitle`, `TextField` + `FormMessage`, `NumberField`, `ToggleGroup`, `RangeField`), `src/components/charts/LineChart.tsx` (multi-series SVG line chart), `src/components/PageIntro.tsx`, `src/components/app/AccountSection.tsx`, `src/components/report/ChapterTag.tsx` (CPE111 chapter tags: keys "1-5","2","3","8").
- Look: warm paper palette tokens (`bg-bg`, `bg-surface`, `border-hair`, `text-muted`, `text-accent`, `text-good`, `text-bad`, `bg-btn`), square corners, `inset-card` class for cards, `font-display` for headings, `num` class for figures. Copy the patterns from `src/app/(app)/account/page.tsx` and `src/components/app/AccountForms.tsx` (server page + client form with `useActionState` + server action file).

## Rules
- Only create/modify files inside your feature's folders unless your task says otherwise: `src/app/(app)/<feature>/**`, `src/components/<feature>/**`, `src/copy/<feature>.ts`, `src/lib/<feature>*.ts` (+ tests). Don't edit shared files (lib math, auth, layouts, `copy/app.ts`, `AppNav`, `database.types.ts`). If you need a change there, describe it in your final report instead.
- All visible copy in your `src/copy/<feature>.ts`. English, THB via `formatMoney`. No em/en dashes in visible text.
- Validate every Server Action input with zod on the server (lengths, ranges matching the DB CHECK constraints in `supabase/migrations/20261122000100_initial_schema.sql`, dates as `YYYY-MM-DD`). Show field errors next to inputs.
- Accessibility: labels on every input, 44px targets (`min-h-11`), visible focus, tables with `<th scope>`, charts with `role="img"` + `aria-label`, `aria-current` for active items, confirmations before deletes (a second click or a typed confirm).
- Responsive: works at 390px, 768px, 1280px; tables scroll inside a wrapper or collapse to cards on phones; no page-level horizontal scroll.
- Tests (Vitest + Testing Library) for every pure function you add and for form validation; mock nothing in the math. TDD: write the failing test first.
- Commit in small steps on your branch with messages ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Final report: what you built (routes, components), test results (exact counts), any shared-file changes you need, anything you could not finish or verify.
