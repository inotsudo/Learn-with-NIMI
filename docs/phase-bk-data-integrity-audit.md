# Phase BK — Data Integrity Audit

**Date:** 2026-06-14

Scope: schema constraints (PK/FK/UNIQUE/CHECK), cascade-delete behavior,
RPC input validation, migration history consistency, and stray data. One
change made: a new additive migration adding two missing indexes (§3).

---

## 1. Schema constraints

Reviewed all 20 tables across `supabase/migrations/001`-`032`:

- Every child-of-`children` table (`child_progress`, `child_achievements`,
  `child_badges`, `coloring_saves`, `language_switch_log`) has
  `child_id uuid references children(id) on delete cascade` — deleting a
  child cleans up all their data.
- `children.parent_id references parents(id) on delete cascade`,
  `parents.id references auth.users(id)` (Supabase-managed).
- `mission_versions.mission_id references missions(id) on delete cascade`;
  `story_page_versions.story_page_id references story_pages(id) on delete
  cascade`; `story_pages.story_id references stories(id) on delete cascade`.
- `child_progress` has `unique (child_id, mission_id, language)` (migration
  012) — prevents duplicate-progress rows per language journey.
- `level_missions` PK is `(level_number, category_slug)`, with
  `mission_id references missions(id) on delete cascade` and
  `category_slug references categories(slug)` **without** `on delete
  cascade`. `categories` is a static 8-row reference table (`morning`,
  `movement`, `artistic`, `histoire`, `zoom`, `discovery`, `flipflop`,
  `coloring`) that is never deleted by any code path — accepted as-is, no
  migration needed.

## 2. RPC validation

| RPC | Validation |
|---|---|
| `complete_curriculum_mission` (026, hardened in 027) | Requires `is_my_child(child_id)`; rejects completions where `level_number > get_current_level(...)` (no-skip guard, migration 027 closed a direct-RPC-call bypass); `on conflict` upserts on `child_progress`/`child_achievements` prevent double-award of stars/badges/certificates |
| `get_current_level(child_id, language)` | `security definer`, requires `is_my_child`, returns smallest level with an incomplete category, saturating at `max(level_number)` |
| `get_curriculum_missions(child_id, language)` | `security definer`, requires `is_my_child`, joins `mission_versions` filtered to `published` per migration 019/020 |
| `admin_bulk_import_missions` (029) | `security definer`, requires `is_admin()`; validates `category_slug` against `categories`, `language` against `en/fr/rw` |
| `get_push_reminder_targets` (016) | `security definer`, used only by the cron route with `CRON_SECRET` bearer check |

No double-award, ownership-bypass, or unvalidated-input issues found.

## 3. New migration: `033_performance_indexes.sql`

Two FK columns are heavily joined but previously relied only on their
`unique (col, language)` constraint index for lookups:

```sql
create index if not exists idx_mission_versions_mission_id
  on mission_versions (mission_id);

create index if not exists idx_story_page_versions_story_page_id
  on story_page_versions (story_page_id);
```

- `mission_versions.mission_id` — joined by `get_daily_missions`,
  `get_curriculum_missions`, `complete_curriculum_mission`
- `story_page_versions.story_page_id` — joined by the FlipFlop story reader

Applied via `npx supabase db query --linked --file
supabase/migrations/033_performance_indexes.sql` (empty result, no error).
Verified both indexes exist:

```sql
select indexname, tablename from pg_indexes
where tablename in ('mission_versions','story_page_versions');
```

→ returns `idx_mission_versions_mission_id` on `mission_versions` and
`idx_story_page_versions_story_page_id` on `story_page_versions`, alongside
the existing `*_pkey` and `*_language_key` indexes. Purely additive — no
RLS or data changes.

## 4. Migration history

`supabase/migrations/` is sequential `000`-`033` with no gaps or
duplicates. The 2026-06-12 CLI/remote history desync (documented in
`migration_offers_pending` memory) was already repaired before this phase —
`README.md` (new, this phase) now documents the
"run `supabase migration list` before `db push`" pre-flight check for
future migrations.

## 5. Stray/seed data

No stray seed or test rows remain in `parents`/`children`/`child_progress`
beyond migration 025's already-applied cleanup
(`cleanup_morning_test_completions`). Migration 022 similarly cleaned up a
stray test mission.

## 6. Additional finding — broken `manual_payments` insert (not fixed in BK)

`app/subscription/page.tsx` calls
`supabase.from("manual_payments").insert([...])` for mobile-money manual
payment confirmations, but **no migration creates a `manual_payments`
table** (`grep -rl "manual_payments" supabase/migrations/*.sql` returns
nothing). This insert will fail at runtime with `relation "manual_payments"
does not exist`.

This predates Phase BK and is unrelated to the dead-code cluster removed in
§ of the security audit (this code path is reached from a live page, not a
dead route). Not fixed here — it's a product/schema decision (what columns
a manual-payment record needs, RLS for who can write/read it) outside BK's
"remove dead code + document gaps" scope. **Recommended follow-up**: a small
migration adding a `manual_payments` table (`parent_id`, `provider`, `plan`,
`phone`, `transaction_id`, `status`, `created_at`) with an
`is_my_child`-style "parent inserts own" RLS policy, mirroring
`create-mobile-money-session`'s Flutterwave plan amounts
(`monthly: 699`, `yearly: 5999`).

---

## Summary

| Check | Result |
|---|---|
| PK/FK/UNIQUE/CHECK constraints across 20 tables | PASS |
| Cascade-delete chains | PASS |
| RPC ownership/validation/no-skip/no-double-award | PASS |
| Missing indexes (`mission_versions`, `story_page_versions`) | FIXED — migration 033 applied + verified |
| Migration history (000-033) | Sequential, no gaps |
| Stray seed/test data | None remaining |
| `manual_payments` table missing (subscription page) | FOUND, not fixed — recommended follow-up migration |
