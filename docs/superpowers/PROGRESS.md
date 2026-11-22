# Paydown: Personal Debt Management System — progress and handoff

Last updated: 2026-11-22. Read this first to continue the work in a new session.

## Goal (from the owner)
Turn the existing Debt Calculator (Next.js 16) into a full Personal Debt Management System with Supabase
(Auth + Postgres + RLS) and Netlify. Build **everything first, push to GitHub only at the end** (owner said
"Not yet ... finish my project first"). Do not push or deploy without asking.

Key documents:
- Architecture: `docs/superpowers/specs/2026-11-22-debt-management-system-design.md`
- Brief for helper agents (conventions, rules): `docs/superpowers/plans/2026-11-22-feature-agent-brief.md`
- Supabase notes + how to run DB tests: `supabase/README.md`
- `AGENTS.md`: this Next.js 16 has breaking changes; read `node_modules/next/dist/docs/` before using an API.

## Environment
- Branch: `feat/paydown-multipage` (local only; ~42 commits not pushed). Remote: `origin` = github.com/Namo2551/dept-calculation.
- Supabase project **paydown**, id `urjlhoxzkpawahvdupse`, region ap-southeast-1, org "Debt Calculator".
  The Supabase MCP connector is connected in Claude Code (apply_migration, execute_sql, get_advisors, ...).
- `.env.local` (git-ignored) holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
  No secret/service-role key is used anywhere (account deletion is a security-definer SQL function).
- Dev server: `.claude/launch.json` "paydown-dev" (`npm run dev`, port 3000). After changing `.env.local` or `next.config.ts`, restart it.
- Test accounts in the paydown project (throwaway, for local testing; delete before launch):
  `paydown-test-a@example.test` ("Tester A", has 2 sample debts + 10 payments) and `paydown-test-b@example.test`.
  Their passwords were generated into the session scratchpad (`.../scratchpad/test-users.json`), not the repo.
  If that file is gone, reset a password with SQL:
  `update auth.users set encrypted_password = extensions.crypt('<new>', extensions.gen_salt('bf')) where email = '...';`
- Owner still needs to set in the Supabase dashboard: Authentication > URL Configuration: Site URL `http://localhost:3000`,
  redirect `http://localhost:3000/**` (later also the Netlify URL). Email confirmation stays on.

## Done (committed on feat/paydown-multipage)
| Phase | What | Verified |
|---|---|---|
| 0 | Removed static export, `netlify.toml` (Node 22, `npm run build`, publish `.next`), site URL falls back to Netlify `URL` | prod server (`next start`) served all pages |
| 1 | DB migrations `supabase/migrations/2026112200010*..0005*`: 7 tables, composite FKs, RLS on all, anon revoked; covering indexes | `supabase/tests/rls_test.sql` passes; security advisor clean |
| 2 | Auth: `src/lib/supabase/{client,server,proxy,env,routes}.ts`, `src/proxy.ts`, `src/lib/auth.ts` (requireUser/requireProfile/requireConsent), pages `/login /signup /forgot-password /reset-password`, `/auth/callback`, `/account` (profile, consent, export JSON, delete account), `/privacy` (PDPA), `(app)` layout + `AppNav`, auth-aware `SiteHeader` | browser: login/wrong password/redirect next/profile save/export/sign out; curl: protected routes, bad callback, open-redirect blocked |
| - | Shared math: `src/lib/ledger.ts` (actual balances from payments, compareToPlan, projectFrom, plannedRows), `src/lib/overview.ts` (overviewOf, totalsOf, minimumDue), `src/lib/money.ts`, `src/lib/data/load.ts` (loadOverviews/loadOverview) | 17 unit tests |
| 7 | Private sharing: migrations 0004/0005 `get_shared_view(token)` (security definer; hides amounts as % of start; hidden payment history becomes monthly totals), `src/lib/sharing.ts`, `/sharing` (create/revoke/delete links, label, visibility, expiry), `/s/[token]` (read-only, noindex, no-referrer) | `supabase/tests/share_test.sql` passes; unit tests |
| 5 | `/strategy` (avalanche vs snowball vs minimums on real debts, by helper agent; merged) | 42 tests; browser with test account A |
| - | Landing page section "Your debt, managed" + sign up/in buttons | route tests |

Full suite after last merge: **436 tests pass**, typecheck clean.

## Helper agents: all finished and merged
Plans (F1), debts + payments (F2), dashboard + goals (F3, F6), strategy (F5) are merged into `feat/paydown-multipage`.
After the merges: **560 tests pass** (41 files), typecheck clean. Fixed after merge: `/debts` 500 (a server page called a
function from a "use client" module; defaults moved to `src/lib/debts-form.ts`).

Browser-verified as test account A: dashboard totals match strategy; debt page start tracking (status "Ahead of plan"),
add payment (balance drops by the amount, history correct); save plan from calculator + duplicate-name error; goal
"debt-free by Dec 2027" shows "Falling behind" + required monthly payment; sharing link with amounts hidden shows
percentages only, signed out, noindex; revoke makes it invalid. As test account B: A's debt pages are 404, no A data on
any page, B's export has 0 debts/plans/payments.

Known minor issues to look at: "Mark as paid off" button is offered on an active debt that still has a balance;
`LineChart` x-axis shows "6 mo"/"1 yr" instead of month names on dashboard charts; "today" uses server time (UTC on
Netlify) rather than Asia/Bangkok.

## Remaining steps (in order)
1. (done) Merge agent branches. 2. (done) Browser-check main flows as A and isolation as B.
3. Hook sharing into other pages if useful (e.g. "Share this plan" on `/plans/[id]` linking to `/sharing?plan=<id>`); regenerate DB types if any migration changes.
4. Responsive pass at 390 / 768 / 1280 px on all app pages; no page-level horizontal scroll.
5. Security pass: re-run `supabase/tests/rls_test.sql` and `share_test.sql`, `get_advisors` (security + performance), check every Server Action calls requireUser/requireConsent and validates with zod, no secrets in code (`git grep -i "service_role\|secret"`).
6. Final whole-branch review by a fresh reviewer agent; fix Critical/Important with a failing test first.
7. `npm run build` + `npx next start` smoke test. Then ask the owner before: deleting the two test accounts, pushing to GitHub, and the Netlify steps (connect repo, set env vars, add Netlify URL to Supabase redirect URLs, set `NEXT_PUBLIC_SITE_URL`; recommend a custom SMTP for auth emails before real users).

## Decisions made (owner approved the plan; these are the builder's calls)
- Payments belong to real **debts**; a saved **plan** is a scenario that can become a debt's frozen baseline (`repayment_schedules`).
- Balances are never stored; always derived by `ledger.ts` (same monthly interest rule as the calculator).
- Calculator stays public; signed-in users get Save/Open plan.
- Sharing never exposes tables to recipients; only `get_shared_view` with owner-chosen fields.
- Google sign-in deferred until after email/password works.
