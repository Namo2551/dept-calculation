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

## Final review (fresh reviewer agent): no critical findings; all important ones fixed
- Post-login open redirect via control characters (`/login?next=/%09/evil.com`): `safeNext` now refuses control
  chars/backslashes and requires the same origin (test added).
- "Paid off" ignored the current month's interest: `ledger.paidOff` now needs `start*(1+r) - paid <= 0.005`;
  `ledger.payoffAmount` shown on the debt page ("To clear it this month, pay").
- "Today" used server UTC: `todayISO()` now uses Asia/Bangkok.
- Plan baseline change was two writes: now `start_repayment_schedule()` (security invoker, one transaction;
  `supabase/tests/schedule_test.sql` passes; browser-verified).
- `npm run lint` ignores `.claude/**` and `.superpowers/**` (agent worktrees), so it passes.
Status: **563 tests pass**, typecheck, lint, build green. DB tests: rls_test, share_test, schedule_test pass.
Supabase security advisor: only intended warnings (get_shared_view callable by anon = the share reader;
delete_my_account callable by signed-in users = deletes only self) + "leaked password protection" (owner setting).

Deferred minors (not fixed yet):
- Payments are loaded without paging; PostgREST's 1,000-row default would truncate very heavy users (`src/lib/data/load.ts`).
- `compareToPlan` reads actual balance at the debt's month boundary, plan months at the plan's boundary (up to a month apart when start days differ).
- `/goals` page writes `achieved_at` during render (move into actions).
- Shared view with amounts hidden: overall progress is an unweighted average across debts.
- Goal titles are shared as typed even when amounts are hidden (warn in the share form).
- A payment dated tomorrow doesn't trigger the paid-off status sync when its day arrives.
- Dashboard projection cut at 120 months without saying so.
- "Mark as paid off" button shown on an active debt that still has a balance.
- LineChart x-axis says "6 mo"/"1 yr" instead of month names on dashboard charts.

## Remaining steps (need the owner)
1. Supabase dashboard: Auth > URL Configuration (Site URL + redirect URLs, later the Netlify URL); Auth > Passwords:
   enable leaked password protection; before real users, set a custom SMTP sender (built-in email is rate-limited).
2. Decide: delete the two test accounts (and test account B's "Test card B" debt) before launch.
3. (done 2026-11-22) Pushed `feat/paydown-multipage` to GitHub. Still open: merge to main or open a PR - ask first.
4. Netlify: import the repo, branch, env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_SITE_URL` (= the Netlify URL); deploy; add the Netlify URL to Supabase redirect URLs; then test
   sign-up email, login, reset password, and one write per feature on the live site.

## Decisions made (owner approved the plan; these are the builder's calls)
- Payments belong to real **debts**; a saved **plan** is a scenario that can become a debt's frozen baseline (`repayment_schedules`).
- Balances are never stored; always derived by `ledger.ts` (same monthly interest rule as the calculator).
- Calculator stays public; signed-in users get Save/Open plan.
- Sharing never exposes tables to recipients; only `get_shared_view` with owner-chosen fields.
- Google sign-in deferred until after email/password works.
- Owner asked (2026-11-22) that sign-up says when an email is already registered. Detected by Supabase's
  "no identities" sign-up answer (`isExistingAccount`); accepted trade-off: it reveals whether an email has an account.
