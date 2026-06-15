# Phase BK — Operational Readiness

**Date:** 2026-06-14

Scope: error handling/boundaries, environment-variable documentation,
project documentation (README), logging/monitoring, and the existing cron
job. New files added: `app/error.tsx`, `app/global-error.tsx`,
`.env.example`, `README.md`.

---

## 1. Error boundaries — added

Before this phase, **zero** `error.tsx`/`global-error.tsx`/`not-found.tsx`/
`loading.tsx` files existed anywhere under `app/`. Any unhandled render
error fell through to Next.js's bare default error page — no NIMIPIKO
branding, no "try again" affordance for a child/parent user.

Added:

- **`app/error.tsx`** — per-segment client error boundary. Branded card
  (matches the homepage's `from-indigo-50 via-purple-50 to-pink-50`
  gradient + `rounded-3xl` card style): "🙈 Oops! Something went wrong" +
  "Try Again" (`reset()`) + "Go Home" link.
- **`app/global-error.tsx`** — root-level boundary (required to render its
  own `<html>/<body>` per Next.js convention, so it uses inline styles
  rather than Tailwind classes since it may render outside the normal
  layout/CSS pipeline). Same branded message + "Try Again" button.

`not-found.tsx`/`loading.tsx` were not added — out of scope for this phase
(no specific gap identified for them; Next.js defaults are acceptable for
404s today).

## 2. `.env.example` — added

17 distinct env vars (confirmed via `grep -rhoE "process\.env\.[A-Z_]+"
app lib hooks components scripts`), grouped by purpose: Supabase, App,
OpenRouter, Stripe, Flutterwave, Web Push (VAPID), Cron. Placeholder values
only.

**Discovered while building for the performance baseline**: the local
`.env.local` in this dev environment had no `STRIPE_*` vars at all. Because
`app/api/create-checkout-session/route.ts` does:

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... });
```

at **module scope** (not inside the request handler), `next build`'s
"Collecting page data" step evaluates this module and throws `Neither
apiKey nor config.authenticator provided` if the var is unset — **the whole
production build fails**, not just that one route.

This is a pre-existing pattern unrelated to the dead-code removal in this
phase (verified: the same failure reproduces on a clean checkout of the
last commit too). On Vercel, where `STRIPE_SECRET_KEY` is presumably
configured as a project env var, this doesn't manifest. Locally, a
contributor following the new `.env.example` (which now lists
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_MONTHLY_PRICE_ID`/
`STRIPE_YEARLY_PRICE_ID` explicitly) will avoid this. **Not changed in this
phase** (would mean moving the `new Stripe(...)` call inside the handler —
a code change to a payment route, out of BK's scope) — documented here as a
recommended follow-up if local builds without Stripe secrets become common.

Also noted: the existing local `.env.local` has a duplicated
`NEXT_PUBLIC_BASE_URL` key (once with a trailing space in the key name,
`NEXT_PUBLIC_BASE_URL ` vs `NEXT_PUBLIC_BASE_URL`) — harmless (the
trailing-space variant is never read), but worth cleaning up next time
that file is hand-edited. `.env.local` is gitignored/local-only, not
touched as part of this phase's deliverables beyond the placeholder
Stripe vars added for the build-verification step (§4).

## 3. `README.md` — added

No root README existed before. New `README.md` covers: project overview,
prerequisites, setup (`npm install` + `.env.example` → `.env.local`),
dev/build/start/lint scripts, Supabase migration workflow (incl. the
`migration list`-before-`db push` pre-flight check), deployment
(Vercel + the `daily-reminder` cron), backup/recovery summary, and links
into `docs/`.

## 4. Health check endpoint — found broken (not fixed in BK)

`app/api/health/route.ts` exists, is well-commented, uses only the anon
client (no admin fallback — "is the app actually usable" semantics), and is
intended for uptime monitors. Live-tested during this phase's verification:

```
$ curl http://localhost:3000/api/health
{"status":"error","message":"Could not find the table 'public.health_check' in the schema cache"}
```

**No migration ever creates a `health_check` table.** The endpoint has
likely *always* returned HTTP 500, meaning any uptime monitor pointed at it
would perpetually report the app as down. This predates Phase BK and isn't
caused by the dead-code removal (verified: the route and its logic are
untouched).

**Not fixed in this phase** — fixing it requires a new migration creating a
`health_check` table (e.g. one row, `id`/`status`/`updated_at`, with a
public-read RLS policy), which wasn't part of the approved BK scope (no new
migrations beyond 033 were planned). **Recommended follow-up**: a tiny
migration 034 adding:

```sql
create table if not exists health_check (
  id int primary key default 1,
  status text not null default 'ok'
);
insert into health_check (id, status) values (1, 'ok') on conflict do nothing;
alter table health_check enable row level security;
create policy "anyone: read health_check" on health_check for select using (true);
```

## 5. Logging / monitoring — accepted gap

`console.error` is used in 33 files; no Sentry or other error-tracking
service is wired up. At current scale (handful of learners, consistent with
the reasoning behind deferring [BN — Analytics
Scaling](./backlog.md)), this is an **accepted gap with a recommendation**,
not implemented now — adding Sentry requires a DSN/account the agent
doesn't have access to. Recommended trigger for revisiting: same as BN
(learner-count growth) or the first production incident that's hard to
diagnose from logs alone.

## 6. Cron — unchanged, documented

`vercel.json` defines one cron: `/api/cron/daily-reminder` at `0 17 * * *`
(17:00 UTC daily), protected by `CRON_SECRET`. No change needed; now
documented in `README.md`.

---

## Summary

| Item | Result |
|---|---|
| `app/error.tsx` + `app/global-error.tsx` | Added (branded, matches homepage style) |
| `.env.example` | Added (17 vars, grouped, placeholders only) |
| `README.md` | Added |
| `/api/health` returns 500 (`health_check` table missing) | FOUND, not fixed — recommended migration 034 |
| Eager Stripe client breaks builds without `STRIPE_SECRET_KEY` | FOUND, documented in `.env.example`, not code-changed |
| Logging/monitoring (console-only) | Accepted gap, mirrors BN deferral reasoning |
| Cron (`daily-reminder`) | Unchanged, documented in README |
