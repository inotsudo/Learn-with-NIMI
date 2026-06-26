# SA-1.0 — Migration Safety Certification

## Certification Checklist

### 1. No existing learner data will be lost

| Data Type | Table | Rows Affected | Verification |
|-----------|-------|--------------|--------------|
| Mission completions | `child_progress` | 0 modified, 0 deleted | Table is UNCHANGED. No ALTER, no UPDATE, no DELETE. Migration only creates new tables. |
| Stars earned | `child_progress.stars_earned` | 0 modified | Column untouched. |
| Completion timestamps | `child_progress.completed_at` | 0 modified | Column untouched. |
| Coloring saves | `coloring_saves` | 0 modified, 0 deleted | Table is UNCHANGED. |
| Language switch history | `language_switch_log` | 0 modified, 0 deleted | Table is UNCHANGED. |
| Community creations | `creations`, `likes` | 0 modified, 0 deleted | Tables are UNCHANGED. |
| Shop purchases | `shop_purchases` | 0 modified, 0 deleted | Table is UNCHANGED. |
| Push subscriptions | `push_subscriptions` | 0 modified, 0 deleted | Table is UNCHANGED. |

**CERTIFIED: No learner data loss.**

---

### 2. No existing achievements will be lost

| Achievement Type | Slug Pattern | Table | Rows Affected |
|-----------------|-------------|-------|--------------|
| Category master badges | `{category}-master-{lang}` | `child_achievements` | 0 modified, 0 deleted |
| Level complete badges | `level-{N}-complete-{lang}` | `child_achievements` | 0 modified, 0 deleted |
| Unit complete badges | `unit-{L}-{U}-complete-{lang}` | `child_achievements` | 0 modified, 0 deleted |
| Curriculum certificate | `curriculum-complete-{lang}` | `child_achievements` | 0 modified, 0 deleted |
| Program certificate | `program-complete-{lang}` | `child_achievements` | 0 modified, 0 deleted |
| Legacy badges | Various | `child_badges` | 0 modified, 0 deleted (table DORMANT) |

New story achievement slugs (`story-{slug}-complete-{lang}`, etc.) are INSERTED alongside existing slugs. The `UNIQUE(child_id, language, type, slug)` constraint ensures no collision — story slugs have the `story-` prefix, which no existing slug uses.

**CERTIFIED: No achievement loss.**

---

### 3. No existing child_progress rows become orphaned

| FK Constraint | Source | Target | Risk |
|--------------|--------|--------|------|
| `child_progress.child_id` → `children(id)` | `child_progress` | `children` | **NONE** — `children` table unchanged |
| `child_progress.mission_id` → `missions(id)` | `child_progress` | `missions` | **NONE** — `missions` table unchanged, no rows deleted |

The migration creates NO changes to `missions` table structure. No mission rows are deleted, renamed, or re-IDed. Every existing `child_progress.mission_id` continues to point to a valid `missions` row.

The new `story_slots` table adds a SECOND reference path to existing missions (`story_slots.mission_id` → `missions.id`). This does not affect existing `child_progress` references — it's an additional index, not a replacement.

**CERTIFIED: No orphaned progress rows.**

---

### 4. No existing stories become inaccessible

| Story Data | Current State | After Migration |
|-----------|--------------|-----------------|
| `stories` rows | `is_active = true` for published | `status = 'published'`, `is_active = true` (derived). Migration sets status from existing is_active BEFORE creating trigger. |
| `stories` rows | `is_active = false` for drafts | `status = 'draft'`, `is_active = false` (derived). |
| `story_pages` | FK → `stories(id)` CASCADE | Unchanged. Pages still accessible via story_id. |
| `story_page_versions` | FK → `story_pages(id)` CASCADE | Unchanged. |
| `coloring_pages` | FK → `stories(id)` CASCADE | Unchanged. |
| Story media (Storage) | Files in Supabase Storage buckets | Unchanged. Storage is content-agnostic. |

Migration order guarantee:
1. `ALTER TABLE stories ADD COLUMN status text DEFAULT 'draft'`
2. `UPDATE stories SET status = 'published' WHERE is_active = true`
3. `UPDATE stories SET status = 'draft' WHERE is_active = false OR is_active IS NULL`
4. `ALTER TABLE stories ALTER COLUMN status SET NOT NULL`
5. Create trigger: `is_active = (status = 'published')`

This ordering ensures no story transitions from accessible to inaccessible during migration.

**CERTIFIED: No story accessibility loss.**

---

### 5. No rollback required

| Assertion | Evidence |
|-----------|----------|
| Migration is additive-only | 6 new tables created. 0 tables dropped. 0 tables renamed. |
| Existing columns preserved | `stories.is_active` retained (becomes trigger-derived but keeps its value). No columns dropped from any table. |
| Existing RPCs preserved | 0 functions dropped. 0 functions modified. All BK RPCs remain callable. |
| Existing FK chains intact | All CASCADE chains (parents → children → child_progress, stories → story_pages, etc.) unchanged. |
| Existing RLS policies intact | No existing policies modified. New policies added for new tables only. |
| Data migration is lossless | `status` derived from existing `is_active` boolean — a 1:1 mapping with no information loss. |

If the migration needs to be reversed:
- Drop the 6 new tables (no data loss — they're empty at creation)
- Drop the `status` trigger on `stories`
- Drop the added columns on `stories`

This is a clean reversal with zero impact on existing data.

**CERTIFIED: No rollback required. Clean reversal possible if needed.**

---

## Final Certification

| Check | Status |
|-------|--------|
| No existing learner data will be lost | ✅ **CERTIFIED** |
| No existing achievements will be lost | ✅ **CERTIFIED** |
| No existing child_progress rows become orphaned | ✅ **CERTIFIED** |
| No existing stories become inaccessible | ✅ **CERTIFIED** |
| No rollback required | ✅ **CERTIFIED** |

---

## Migration Safety Verdict

### ✅ SAFE TO PROCEED

The SA-1.1 schema migration is certified safe for production execution.

**Risk profile:** 12 NONE, 5 LOW, 3 MEDIUM, 0 HIGH, 0 CRITICAL.

**All 3 MEDIUM risks have documented mitigations:**
1. `stories.is_active` trigger — ordered migration steps
2. `_activityData.ts` replacement — parallel config files
3. Homepage transformation — feature-flagged code path

**Zero destructive operations** in the migration:
- 0 DROP TABLE
- 0 DROP COLUMN
- 0 DROP FUNCTION
- 0 DELETE FROM
- 0 ALTER TABLE ... RENAME

The migration exclusively uses:
- CREATE TABLE (6 new tables)
- ALTER TABLE ... ADD COLUMN (6 columns on `stories`)
- UPDATE (status backfill on `stories` — lossless)
- CREATE FUNCTION (13 new RPCs)
- CREATE POLICY (RLS for new tables)
- CREATE TRIGGER (1 trigger for `is_active` derivation)

---

## Document Inventory for SA-1.0

| Document | Location |
|----------|----------|
| Existing System Impact Report | `docs/sa1/existing-system-impact-report.md` |
| Migration Risk Assessment | `docs/sa1/migration-risk-assessment.md` |
| Migration Safety Certification | `docs/sa1/sa1-migration-safety-certification.md` |

**SA-1.1 (Schema Migration) is authorized to proceed.**
