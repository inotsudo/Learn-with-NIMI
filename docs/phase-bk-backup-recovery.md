# Phase BK — Backup & Recovery

**Date:** 2026-06-14

Scope: document what's recoverable from this repo vs. what depends on
Supabase-managed backups, and the steps to restore each. No new
infrastructure was added — Supabase already provides project-level
Postgres backups/PITR; this document is the runbook for using them
alongside this repo's migration history.

Supabase project ref: `bedajxejzdxtrsmqortg`.

---

## 1. What's recoverable from this repo alone: schema

`supabase/migrations/000`-`033` (34 files) are sequential, gapless SQL
migrations that fully define the schema: all 20 tables, RLS policies, RPC
functions (`get_curriculum_missions`, `complete_curriculum_mission`,
`get_current_level`, `admin_bulk_import_missions`,
`get_push_reminder_targets`, etc.), triggers (e.g.
`admins_protect_last_superadmin`), and seed data for `categories`,
`curriculum_levels`, and the initial mission set.

**To rebuild the schema on a fresh Supabase project:**

```bash
npx supabase link --project-ref <new-project-ref>
for f in supabase/migrations/*.sql; do
  npx supabase db query --linked --file "$f"
done
```

(Run in numeric order — they're named so a plain glob sorts correctly.)
After this, run the read-only suites in `supabase/tests/*.sql` to confirm
the schema matches expectations.

## 2. What's NOT recoverable from this repo: live data

Replaying migrations gives you an **empty** schema (plus the small amount
of seed data baked into migrations 002/003/032). It does **not** restore:

- `parents`, `children`, `child_progress`, `child_achievements`,
  `child_badges`, `coloring_saves` — all real learner/family data
- `push_subscriptions`, `push_broadcasts`, `language_switch_log` —
  operational history
- `auth.users` — Supabase Auth's own user records (managed separately from
  `supabase/migrations/`)

This data only exists in the live Supabase Postgres instance and its
backups.

## 3. Supabase-managed backups (project-level, outside this repo)

Supabase automatically backs up the Postgres database and offers
point-in-time recovery (PITR) depending on plan tier, managed via:

**Dashboard → Project (`bedajxejzdxtrsmqortg`) → Database → Backups**

No in-repo configuration is needed or possible for this — it's a Supabase
account/project setting. This document exists so the *procedure* for using
those backups together with this repo's migrations is written down:

1. **Schema-only disaster** (e.g. a bad migration corrupts schema, data
   intact): restore via PITR to just before the bad migration, or manually
   reverse the migration's DDL.
2. **Full project loss**: create a new Supabase project, restore the most
   recent Supabase backup into it (Dashboard backup-restore flow), then
   `supabase link` this repo to the new project ref and verify
   `supabase migration list` shows all 000-033 as applied (if the backup
   predates 033, apply the remaining migrations per §1).
3. **Accidental data deletion** (e.g. an admin action deletes rows that
   should be recoverable): use PITR to restore to a point just before the
   deletion, export the affected rows, then re-import into the live DB —
   don't restore the whole project over live data unless the loss is
   total.

## 4. Pre-flight checklist before any schema change

Documented in `README.md` (new, this phase): **always run `npx supabase
migration list` before `db push`**. The CLI's local migration-history table
can desync from the remote project's (this happened once, 2026-06-12, fixed
via `supabase migration repair`) — pushing while desynced can apply
migrations out of order or skip the desync check entirely.

---

## Summary

| Item | Status |
|---|---|
| Schema reproducible from `supabase/migrations/000-033` | Verified sequential, no gaps |
| Live data backup/PITR | Supabase-managed, project-level — documented procedure for using it |
| Pre-`db push` migration-history check | Documented in `README.md` |
| New infrastructure added | None — this is documentation only |
