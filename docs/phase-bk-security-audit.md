# Phase BK — Security Audit

**Date:** 2026-06-14

Scope: review of Row Level Security (RLS) coverage, RLS helper functions,
admin-escalation protections, secret handling, and the API route surface.
No engine/RLS changes were made — this audit's only code changes were
**removing dead/legacy API routes and pages** (§3).

---

## 1. RLS coverage

All 20 application tables have `enable row level security` and at least one
policy:

```
admins, categories, child_achievements, child_badges, child_progress,
children, coloring_pages, coloring_saves, curriculum_levels,
language_switch_log, level_missions, missions, mission_versions,
parental_settings, parents, push_broadcasts, push_subscriptions, stories,
story_pages, story_page_versions
```

No `using (true)` or other unconditionally-permissive policies were found.
Policies consistently gate on one of:

- `auth.uid() is not null` — any signed-in user may read shared
  reference data (missions, categories, curriculum_levels, etc.)
- `is_my_child(p_child_id)` — a parent may only read/write rows for their
  own children
- `is_admin()` / `is_superadmin()` — admin-only read/write

## 2. RLS helper functions

| Function | Definition | Assessment |
|---|---|---|
| `is_my_child(p_child_id)` (migration 001) | `security definer`, checks `children.parent_id = auth.uid()` | Correct — scoped to the caller's own `auth.uid()`, no parameter-based bypass |
| `is_admin()` (migration 013) | `security definer`, checks `exists (select 1 from admins where id = auth.uid())` | Correct |
| `is_superadmin()` (migration 015) | `security definer`, checks `admins.role = 'superadmin' and id = auth.uid()` | Correct |
| `admin_role()` (migration 018) | `security definer`, returns the caller's own `admins.role` | Correct, used only for self-update `with check` |

All four are `language sql security definer` with no caller-supplied
identifiers used in lookups — no SQL-injection or privilege-bypass surface.

## 3. Admin self-escalation protections (migration 018)

Verified all three layers are present and correct:

1. **Self-update guard**: `"admin: update own profile"` policy's `with
   check` requires `role = admin_role()` — an admin editing their own row
   cannot change their own `role` column.
2. **Superadmin-gated add/remove**: `"admin: insert admins"` and `"admin:
   delete admins"` both require `is_superadmin()`.
3. **Last-superadmin trigger**: `admins_protect_last_superadmin()` (before
   update/delete) raises an exception if the operation would leave zero
   superadmins.

No escalation path found.

## 4. Secrets / environment variables

- No `SUPABASE_SERVICE_ROLE_KEY` (or any service-role key) usage anywhere in
  `app/`, `lib/`, `hooks/`, `components/`, or `scripts/` — every Supabase
  client uses the anon key + RLS.
- All secret-bearing env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `OPENROUTER_API_KEY`, `FLUTTERWAVE_SECRET_KEY`, `CRON_SECRET`,
  `VAPID_PRIVATE_KEY`) are read only in `app/api/**/route.ts` server code —
  never in client components or `NEXT_PUBLIC_*` vars.
- `.env.local` is correctly listed in `.gitignore` and is **not** tracked by
  git (`git ls-files | grep -i env` returns only `next-env.d.ts`). An
  earlier automated finding claiming `.env.local` was committed was
  independently verified and is **false** — no action needed.
- New `.env.example` (this phase) documents all 17 env vars with
  placeholders only, so future contributors don't need to guess names.

## 5. Dead/legacy API surface — removed

A cluster of files from a pre-redesign "LMS prototype" (git commit `23cac63
"je suis"`, pre-dating the current curriculum engine) operated on tables
that **no longer exist** in the schema (`students`, `courses`,
`enrollments`, `submissions`, `student_reflections`, `resources`,
`pikopals`, `daily_missions`), were **completely unauthenticated**, and had
**zero frontend references**. All removed in this phase:

- `app/api/courses/route.ts`, `app/api/courses/missions/route.ts`
- `app/api/enrollments/route.ts`
- `app/api/submissions/route.ts`
- `app/api/student_reflections/route.ts`
- `app/api/students/route.ts`
- `app/api/Resources/route.ts`
- `app/api/pikopals/route.ts`
- `app/test/page.tsx` (queried the dropped `daily_missions` table)
- `app/test-student-form/page.tsx` (posted to dead `/api/students`)

Two **orphaned Pages-Router-format handlers** (`NextApiRequest`/
`NextApiResponse`) sitting directly in `app/api/` — the App Router never
registers these as routes at all, so they were dead on arrival:

- `app/api/missions.ts` — referenced the dropped `day_number` column
- `app/api/manual-payment.ts` *(discovered during implementation, same
  pattern as `missions.ts`)* — `app/subscription/page.tsx` writes to
  `manual_payments` directly via the Supabase client, never calling this
  route

One **live-table, unauthenticated, dead** route — removed:

- `app/api/mission_completions/route.ts` — used the anon-key client (no
  session) to upsert into the real `child_progress` table with **no auth
  check**. In practice this was already non-functional: with no session,
  `auth.uid()` is `null`, so the `"parent: insert progress"` RLS policy
  (`is_my_child(child_id)`, which requires `parent_id = auth.uid()`)
  rejects the write — the route always failed with a permissions error.
  Mission completion now goes exclusively through the
  `complete_curriculum_mission`/`complete_mission` RPCs (Phase BC/BB), which
  run under the caller's authenticated session and enforce ownership +
  no-skip rules. Removing this route eliminates an unauthenticated
  attack-surface/maintenance liability with zero functional impact.

One **superseded duplicate** — removed:

- `app/api/stripe-session/route.ts` — same Stripe Checkout pattern as the
  live `app/api/create-checkout-session/route.ts`, but read **different env
  var names** (`STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_YEARLY` vs. the live
  route's `STRIPE_MONTHLY_PRICE_ID`/`STRIPE_YEARLY_PRICE_ID`), 0 frontend
  references. The naming inconsistency this duplicate created is now fully
  resolved — `.env.example` documents only the names the live route uses.

## 6. Flagged, not removed

- `app/api/create-mobile-money-session/route.ts` (Flutterwave) — 0 frontend
  references today, but plausibly an in-progress/planned payment method for
  the Rwanda market (`FLUTTERWAVE_SECRET_KEY` is documented in
  `.env.example`). Left in place; needs a product decision on whether to
  wire up or remove, out of scope for BK.

## 7. Additional finding (data-related, not a security issue)

`app/subscription/page.tsx` writes to a `manual_payments` table that **does
not exist in any migration** — this insert will fail at runtime
(`relation "manual_payments" does not exist`). Not a security risk (no
RLS to bypass on a nonexistent table), but a broken-feature finding;
documented in [phase-bk-data-integrity-audit.md](./phase-bk-data-integrity-audit.md).

---

## Summary

| Area | Result |
|---|---|
| RLS coverage (20/20 tables) | PASS |
| RLS helper functions (`is_my_child`/`is_admin`/`is_superadmin`/`admin_role`) | PASS, no bypass found |
| Admin self-escalation protections (migration 018) | PASS, all 3 layers verified |
| Secrets / env var separation | PASS, `.env.local` confirmed not committed |
| Dead/legacy unauthenticated API surface | REMOVED (10 files/dirs) |
| Superseded payment-route duplicate | REMOVED (1 file) |
| Unused-but-plausibly-planned payment route | FLAGGED, not removed |
