# SA-1.1 — Migration Execution Guide

## Pre-Migration Checklist

| # | Step | Command/Action | Expected |
|---|------|---------------|----------|
| 1 | Record current story count | `SELECT count(*) FROM stories;` | Note the number |
| 2 | Record current is_active states | `SELECT id, slug, is_active FROM stories ORDER BY sort_order;` | Note each story's state |
| 3 | Record existing data counts | Run validation query #11 (pre-migration baseline) | Note all counts |
| 4 | Verify no active connections modifying stories | Check for open transactions | No conflicting locks |
| 5 | Create database backup | Supabase dashboard → Backups or `pg_dump` | Backup confirmed |

## Execution Order

```
Step 1: Apply migration
  └─ supabase db push
     OR
  └─ Run 043_story_adventure_schema.sql in Supabase SQL Editor

Step 2: Validate
  └─ Run sa11-validation-queries.sql
  └─ Verify all 13 checks pass

Step 3: Verify application
  └─ Load app in browser
  └─ Confirm existing pages render correctly
  └─ Confirm no console errors

Step 4: Confirm
  └─ Compare story count (should match pre-migration)
  └─ Compare data counts (should match pre-migration)
  └─ Mark SA-1.1 as complete
```

## Migration File

| File | Purpose | Size |
|------|---------|------|
| `supabase/migrations/043_story_adventure_schema.sql` | Forward migration | ~200 lines |
| `supabase/migrations/rollback-043-story-adventure-schema.sql` | Rollback (emergency only) | ~50 lines |
| `supabase/migrations/sa11-validation-queries.sql` | Post-migration verification | ~130 lines |

## Migration SQL Summary

| Operation | Count | Details |
|-----------|-------|---------|
| CREATE TABLE | 6 | story_versions, story_slots, story_intro_progress, weekly_challenges, weekly_challenge_versions, weekly_challenge_progress |
| ALTER TABLE ADD COLUMN | 6 | stories + status, age_min, age_max, scheduled_publish_at, published_at, retired_at |
| ALTER TABLE ADD CONSTRAINT | 4 | stories_status_check, stories_age_min_check, stories_age_max_check, stories_age_range_check |
| UPDATE (backfill) | 2 | status from is_active (published/draft) |
| CREATE FUNCTION | 3 | stories_sync_is_active, story_versions_sync_published, weekly_challenge_versions_sync_published |
| CREATE TRIGGER | 3 | On stories, story_versions, weekly_challenge_versions |
| CREATE INDEX | 10 | On all new tables + stories status/sort_order/scheduled |
| CREATE POLICY | 14 | RLS on all 6 new tables |
| ENABLE RLS | 6 | On all 6 new tables |
| DROP TABLE | 0 | — |
| DROP COLUMN | 0 | — |
| DROP FUNCTION | 0 | — |
| DELETE FROM | 0 | — |

## Rollback Procedure (Emergency Only)

If the migration must be reversed:

```
Step 1: Run rollback-043-story-adventure-schema.sql
Step 2: Verify stories table has original columns only
Step 3: Verify all 6 new tables are dropped
Step 4: Verify existing data unchanged (run validation query #11)
```

**Rollback impact:** Zero impact on existing data. Only Story Adventure additions are removed. All child_progress, child_achievements, missions, story_pages remain untouched.

## Post-Migration: What Changes for Users

| User Type | Change | Impact |
|-----------|--------|--------|
| **Children** | None | No UI changes. Existing flows work identically. |
| **Parents** | None | Parent dashboard unchanged. |
| **Admins** | New empty tables visible in SQL editor | No CMS changes yet (SA-2.1). |
| **Developers** | 6 new tables available for SA-1.2 RPCs | Can begin RPC development. |

## Known Supabase Considerations

| Issue | Mitigation |
|-------|------------|
| Migration history out of sync | Run `supabase migration repair --status applied 043_story_adventure_schema` if needed (same pattern as migration 012 repair documented in memory) |
| Pooler connection limits | Run migration via SQL Editor (direct connection), not through pooler |
| `db push` failures | If `db push` fails, apply SQL directly in Supabase SQL Editor |

## Next Phase

After SA-1.1 is validated:

```
SA-1.2: Core RPCs
  - get_current_story(child_id, language)
  - is_story_unlocked(child_id, story_id, language)
  - is_story_complete(child_id, story_id, language)
  - complete_story_mission(child_id, mission_id)
  - get_story_progress(child_id, story_id)
  - get_all_stories_with_progress(child_id, language)
  - record_intro_consumed(child_id, story_id, slot_key)
```
