# SA-1.1 — Schema Migration Specification

## Migration: `043_story_adventure_schema.sql`

### Change Inventory

| # | Asset | Change Type | Reason | Backward Compat |
|---|-------|------------|--------|-----------------|
| 1 | `stories` table | ADD 6 COLUMNS | Story Adventure lifecycle, age range, scheduling | All nullable or defaulted. Existing rows unaffected. |
| 2 | `stories.is_active` | ADD TRIGGER | Derive from `status = 'published'` | Trigger maintains existing `is_active` behavior. Value never changes unexpectedly — migration backfills `status` from `is_active` first. |
| 3 | `story_versions` | CREATE TABLE | Per-language story metadata + 4 intro URLs | New table. No existing asset affected. |
| 4 | `story_slots` | CREATE TABLE | Maps story → 6 mission slots | New table. No existing asset affected. |
| 5 | `story_intro_progress` | CREATE TABLE | Tracks child intro consumption | New table. No existing asset affected. |
| 6 | `weekly_challenges` | CREATE TABLE | Bonus challenges per story | New table. No existing asset affected. |
| 7 | `weekly_challenge_versions` | CREATE TABLE | Per-language challenge content | New table. No existing asset affected. |
| 8 | `weekly_challenge_progress` | CREATE TABLE | Child challenge completions | New table. No existing asset affected. |

### Stories Table Extension Detail

| Column Added | Type | Default | Nullable | Notes |
|-------------|------|---------|----------|-------|
| `status` | text CHECK `draft/review/published/retired` | `'draft'` | NOT NULL (after backfill) | Backfilled from `is_active` before NOT NULL applied |
| `age_min` | integer CHECK 2-12 | NULL | YES | Optional until admin sets it |
| `age_max` | integer CHECK 2-12 | NULL | YES | Optional until admin sets it |
| `scheduled_publish_at` | timestamptz | NULL | YES | Optional future publish date |
| `published_at` | timestamptz | NULL | YES | Set when status → published |
| `retired_at` | timestamptz | NULL | YES | Set when status → retired |

### Execution Order

1. Add columns to `stories` (all nullable initially)
2. Backfill `status` from existing `is_active`
3. Add NOT NULL + CHECK constraint on `status`
4. Create `is_active` derivation trigger
5. Create `story_versions` table + RLS
6. Create `story_slots` table + RLS
7. Create `story_intro_progress` table + RLS
8. Create `weekly_challenges` table + RLS
9. Create `weekly_challenge_versions` table + RLS
10. Create `weekly_challenge_progress` table + RLS
11. Create indexes
