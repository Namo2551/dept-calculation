# Paydown: Personal Debt Management System (architecture proposal)

Date: 2026-11-22
Status: proposal, waiting for the owner's answers to the open questions at the end
Stack decided by the owner: Next.js (existing), Supabase (Auth, Postgres, Storage if needed), Netlify.

## 1. What exists today

| Part | Where | Notes |
|---|---|---|
| Framework | Next.js 16.4.6 App Router, React 19, TypeScript strict, Tailwind 4 | `next.config.ts` has `output: "export"` (pure static site) |
| Pages | `/` home, `/calculator` (7-section report), `/multi` (several cards), `/charts` and `/why` (redirects) | One root layout, header and footer in `src/components/site` |
| Debt math | `src/lib/debt.ts` | Pure, tested, parity-checked: `simulate` (one card, % or fixed), `closedFormFixed`, `requiredPayment`, `splitByYear`, `simulateMulti` (avalanche / snowball / minimum-only with a monthly budget) |
| New math | `src/lib/plans.ts` | `simulateWithBonus`, `paymentForInterestLimit` (binary search); `payoffDate` in `format.ts` |
| Inputs and state | `src/lib/state.ts`, `src/hooks/useCalculator.ts`, `src/components/CalcProvider.tsx` | All state is client-side: URL hash share links and `localStorage` (`debtcalc.v1`) |
| UI kit | `src/components/ui` (Panel, Button, NumberField, ToggleGroup, RangeField), `src/components/report` (ReportSection, ChapterTag, ReportMenu), charts in `src/components/charts` | Paydown look: warm paper palette, square corners, Host Grotesk + IBM Plex Mono |
| Copy | `src/copy/index.ts` | All visible text in one place, English only, baht |
| Tests | Vitest + Testing Library, 364 tests | Includes a parity test against the original JS core |

What can be reused as-is: all of `src/lib` (the math is already pure functions), the UI kit, the chart component, the report section and chapter tags, the copy pattern, and the whole calculator, which stays public and works without an account.

## 2. What has to change, and why

1. **Static export goes away.** `output: "export"` produces only HTML files, so there is no server for login cookies, protected routes, Route Handlers, Server Actions or the account-deletion endpoint. Remove it and let Netlify run Next.js with its official adapter (OpenNext-based; Netlify states Next.js 16 deploys with zero configuration). The public pages (`/`, `/calculator`, `/multi`) stay statically rendered, so they are just as fast.
2. **Supabase clients, three kinds.**
   - Browser client (`src/lib/supabase/client.ts`, publishable key) for client components.
   - Server client (`src/lib/supabase/server.ts`, cookies) for Server Components, Server Actions and Route Handlers.
   - A small admin client used only inside one server Route Handler (account deletion) with the secret key. It is never imported by client code, and is guarded by `import "server-only"`.
3. **`proxy.ts` at `src/proxy.ts`.** Next 16 renamed Middleware to Proxy. It refreshes the Supabase session cookie on each request and does an *optimistic* redirect from private routes to `/login`. Real protection is **not** the proxy: every private page and action re-checks the user on the server (`supabase.auth.getClaims()`), and Postgres RLS refuses any row that isn't yours.
4. **State: from "one browser" to "your account".** The calculator keeps working from local state for visitors. When signed in, a **Save plan** button stores the current inputs as a `debt_plans` row, and opening a saved plan loads its inputs into the same calculator. So no calculator logic is rewritten, only where the inputs come from and go.
5. **Navigation.** A signed-out header (Calculator, Several cards, Sign in) and a signed-in app shell (Dashboard, Plans, Debts, Strategy, Goals, Sharing, Account) using the existing header styles.
6. **Currency.** Store a `currency` code (default `THB`) on profiles, debts and plans. Format through one `formatMoney(value, currency)` helper, so other currencies can be added later without schema changes.

## 3. Pages and routes

| # | Page | Route | Access |
|---|---|---|---|
| 1 | Landing | `/` | public |
| 2 | Sign up / Login / Forgot / Reset | `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/confirm` | public |
| 3 | Dashboard | `/dashboard` | private |
| 4 | Debt Calculator | `/calculator` (existing) | public; Save needs login |
| 5 | Saved plans | `/plans` | private |
| 6 | Plan details / edit / compare | `/plans/[id]`, `/plans/compare?a=…&b=…` | private |
| 7 | Payment history | `/debts/[id]/payments` | private |
| 8 | Multiple debts | `/debts`, `/debts/[id]` | private |
| 9 | Strategy comparison | `/strategy` | private |
| 10 | Goals | `/goals` | private |
| 11 | Sharing (manage) and shared view | `/sharing` (owner), `/s/[token]` (recipient, read-only) | private / token |
| 12 | Profile / settings / delete account | `/account` | private |
| - | Privacy notice | `/privacy` | public |

## 4. Database design (Supabase Postgres)

Money is `numeric(14,2)`, rates are `numeric(6,3)` (yearly %), every row has `created_at` / `updated_at` (trigger), every private row has `user_id uuid not null references auth.users(id) on delete cascade`.

```
auth.users ─1:1─ profiles
     │
     ├─1:n─ debts ─1:n─ payment_records
     │        │  └─1:1(active)─ repayment_schedules (frozen baseline)
     │        └──────────────── financial_goals (optional debt_id)
     ├─1:n─ debt_plans (optional debt_id: "this plan is for that debt")
     ├─1:n─ financial_goals
     └─1:n─ shared_plans (what to share + flags, token hash)
```

- **profiles**: `id` (PK = auth user id), `display_name`, `currency` (default `'THB'`), `privacy_consent_at` (timestamptz, required before saving data), `created_at`, `updated_at`. A row is created by a trigger on sign-up.
- **debts** (real accounts): `id`, `user_id`, `name` (1 to 80 chars), `kind` (`credit_card` | `personal_loan` | `other`), `start_balance` (> 0), `start_date`, `apr` (0 to 100), `min_pct` (nullable), `min_amount` (≥ 0), `due_day` (1 to 31), `currency`, `status` (`active` | `paid_off` | `archived`). Unique `(user_id, id)` for composite foreign keys.
- **debt_plans** (calculator scenarios): `id`, `user_id`, `debt_id` (nullable), `name` (1 to 80, unique per user), the calculator inputs as columns (`balance`, `apr`, `min_pct`, `min_floor`, `fixed_payment`, `target_months`, `interest_limit`), `bonus_amount` and `bonus_month` (nullable), `start_date`, `currency`, `notes`.
- **repayment_schedules** (the "original plan" baseline for tracking): `id`, `user_id`, `debt_id`, `source_plan_id` (nullable), a **frozen copy** of the inputs (`balance`, `apr`, `monthly_payment`, `start_date`), `is_active`. Unique: at most one active per debt (partial unique index). Planned month-by-month rows are **computed** from these inputs with `simulate`, not stored, so they can never drift from the math. Editing a plan later does not silently change what you are compared against; you choose "reset baseline".
- **payment_records**: `id`, `user_id`, `debt_id`, `paid_on` (date), `amount` (> 0), `note` (≤ 500 chars). Index `(debt_id, paid_on)`. The balance after each payment is **computed** (start balance, monthly interest by the same rule as the calculator, minus actual payments in date order). It is not stored, so editing or deleting a payment re-derives everything correctly.
- **financial_goals**: `id`, `user_id`, `title`, `kind` (`debt_free_by` | `debt_paid_by` | `reduce_total_pct` | `reduce_total_to`), `debt_id` (needed only for `debt_paid_by`), `target_date`, `target_amount` / `target_pct` (nullable, CHECK per kind), `achieved_at`.
- **shared_plans**: `id`, `owner_id`, `label`, `token_hash` (SHA-256 of a 32-byte random token; the raw token appears only once, in the link), and scope: `plan_id` and/or `include_debts` flag. Visibility flags: `show_amounts`, `show_payments`, `show_goals`, `show_notes`. Also `expires_at` (nullable), `revoked_at`, `last_viewed_at`.
- **plan_comparisons**: not needed. Comparing is just choosing two plans in the UI.

**Row Level Security, enabled on every table above:**
- Owner tables: `select`, `insert`, `update` and `delete` allowed only `using (user_id = (select auth.uid()))` and `with check (user_id = (select auth.uid()))`.
- Cross-row integrity: composite foreign keys `(user_id, debt_id) references debts(user_id, id)`, so nobody can attach a payment or goal to someone else's debt, even with a forged id.
- Sharing: no public policy at all. Recipients never query tables. `/s/[token]` is a Server Component that calls a `security definer` Postgres function `get_shared_view(token)`. That function hashes the token, checks it isn't revoked or expired, updates `last_viewed_at`, and returns **only** the fields the owner allowed, as JSON.
- An RLS test script (`supabase/tests/rls.sql`) signs in as user A and user B (via `set role authenticated` and `request.jwt.claims`) and asserts that B reads and changes nothing of A's.

**Migrations:** plain SQL files in `supabase/migrations/NNNN_name.sql`, committed. You apply them with the Supabase CLI (`supabase db push`) or by pasting them into the SQL Editor. Either way the database can be rebuilt from the repo.

## 5. How each feature is built (in your order)

1. **Save multiple plans.** "Save plan" / "Save as…" on `/calculator`. `/plans` list (rename, duplicate, delete). Opening a plan loads it into the calculator (`/calculator?plan=<id>`) with autosave-on-confirm. `/plans/compare` shows two plans side by side using the existing result cards and the balance chart with two series. Writes go through Server Actions that validate input with the same rules as `state.ts` (shared validation module) and rely on RLS.
2. **Track actual payments.** On a debt: "Start tracking", which freezes a baseline from a plan or from the debt's own numbers. Add, edit and delete payments (date, amount, note). Chronological history with the computed balance after each payment. Ahead/behind = actual balance vs. the planned balance for the same month. A re-projection runs from today's actual balance with the planned payment to give a new debt-free date.
3. **Dashboard.** Server-rendered from the user's rows; every number is derived by the shared math, so it updates whenever payments, debts or plans change. Shows: total outstanding, paid so far, interest paid, estimated remaining interest, debt-free date ("Debt-free in 14 months, January 2028"), progress bar, summary cards, debt reduction chart, a planned-vs-actual balance chart, and a monthly payment overview (a table, plus bars on wide screens).
4. **Multiple debts and strategies.** CRUD for debts. `/strategy` takes a monthly budget and runs the existing `simulateMulti` for avalanche and snowball. It shows the repayment order, payoff dates, total interest, interest saved and the difference between the two. It extends the math only where needed (per-debt minimum rules already exist). Different interest rates per debt are already handled; due days are shown for scheduling. Interest stays monthly (yearly ÷ 12), the same documented model as the calculator.
5. **Goals and history.** CRUD for goals. Progress = (start − current) / (start − target), with "on track" if the projected date ≤ the target date. The required payment for a target date reuses `requiredPayment`. Monthly history bars show each payment's contribution to each goal.
6. **Private sharing.** `/sharing` creates links with chosen visibility and an optional expiry. It shows the link once and lists links with "revoke". `/s/[token]` is a read-only view built from the same dashboard components, fed by `get_shared_view`. It sends no cookies to the recipient, sets `noindex`, and has no edit controls (the data path is read-only anyway).

## 6. Security and privacy

- RLS on every user table. Server re-checks on every private page and action. Inputs validated on the server (not just in the form).
- Keys: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are safe in the browser *because* RLS is on. `SUPABASE_SECRET_KEY` (service role) is server-only, used only by account deletion, and never prefixed `NEXT_PUBLIC_`. All live in `.env.local` (already git-ignored by `.env*`) and in Netlify's environment settings, never in code.
- PDPA (Thailand):
  - A clear privacy notice at `/privacy`: what is stored, why, where (Supabase region), how long, and who to contact.
  - Explicit consent at sign-up, stored in `profiles.privacy_consent_at`.
  - The user's rights: export all their data as JSON, and delete the account (which cascades every row).
  - No analytics or third-party trackers by default.
- Sharing tokens: 256-bit random, stored only as a hash, revocable, optionally expiring.

## 7. Netlify deployment

- Remove `output: "export"`. Add `netlify.toml` (`[build] command = "npm run build"`, Node 22). The Next.js adapter is applied automatically.
- Netlify environment variables: the same three as `.env.local`, plus `NEXT_PUBLIC_SITE_URL` = the Netlify URL.
- Supabase Auth URL configuration: Site URL = the Netlify URL. Redirect URLs = `http://localhost:3000/**` and `https://<your-site>.netlify.app/**`.
- Connect GitHub (`Namo2551/dept-calculation`) in Netlify: Add new site, Import from Git, pick the branch, deploy. Preview deploys per pull request.
- Before calling it done: run `npm run build` locally, then on the deployed site test sign-up, confirm email, login, logout, reset password, and a create/read/update/delete for each table as two different users.

## 8. Phases (a working app at each stage)

| Phase | Result you can use |
|---|---|
| 0. Server mode + Netlify | Today's calculator deployed on Netlify without static export (proves the pipeline before any login exists) |
| 1. Supabase project + schema + RLS tests | Database ready; RLS proven with two test users |
| 2. Auth | Sign up, confirm, login, logout, forgot/reset, profile, protected `/dashboard` placeholder, consent, delete account |
| 3. Saved plans | Save, open, rename, delete, compare |
| 4. Debts + payment tracking | Real debts, payments, planned vs actual |
| 5. Dashboard | Totals, charts, debt-free date |
| 6. Strategy | Avalanche vs snowball on your real debts |
| 7. Goals | Goals, progress, required payment |
| 8. Sharing | Private links, revoke, visibility |
| 9. Polish + production tests | Responsive pass, security tests, final Netlify deploy |

Phases 6 to 8 are fairly independent once Phase 4 exists, so they can be built by separate helper agents in parallel (each in its own branch or worktree) and then reviewed together.

## 9. Open questions for the owner

1. **Where do actual payments belong?** Proposed: payments belong to a **debt** (a real account). A **plan** is a scenario, and one plan can be linked to a debt as its "original plan" (the frozen baseline). The alternative is to record payments directly on a plan, which is simpler but mixes up "what if" scenarios with real money. This choice shapes Features 2, 3 and 5.
2. **Supabase region:** Southeast Asia (Singapore) is closest to Thailand and simplest to describe in the privacy notice. Confirm it, or choose another.
3. **Google sign-in:** proposed for after Phase 2 (email + password first), since it needs a Google Cloud OAuth client.
