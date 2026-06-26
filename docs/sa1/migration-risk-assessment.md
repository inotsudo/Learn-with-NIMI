# SA-1.0 — Migration Risk Assessment

## Risk Matrix

| # | Asset | Risk Level | Reason | Mitigation |
|---|-------|-----------|--------|------------|
| 1 | `stories` table extension | **LOW** | Adding 6 nullable columns to existing table. No existing columns modified. | All new columns are `DEFAULT NULL` or have safe defaults. Existing rows remain valid. |
| 2 | `stories.is_active` derivation | **MEDIUM** | Replacing manual boolean with trigger-derived from `status`. Existing rows have `is_active` but no `status`. | Migration sets `status = 'published'` WHERE `is_active = true`, `status = 'draft'` WHERE `is_active = false` BEFORE creating trigger. Order matters. |
| 3 | `story_versions` new table | **NONE** | Purely additive. No existing table affected. | N/A |
| 4 | `story_slots` new table | **NONE** | Purely additive. No existing table affected. | N/A |
| 5 | `story_intro_progress` new table | **NONE** | Purely additive. | N/A |
| 6 | `weekly_challenges` + versions + progress | **NONE** | Purely additive. 3 new tables, no existing data touched. | N/A |
| 7 | `child_progress` data integrity | **NONE** | Table is UNCHANGED. No columns added, removed, or renamed. All existing rows remain valid with original FKs. | Verify: `SELECT COUNT(*) FROM child_progress` before and after migration = same count. |
| 8 | `child_achievements` data integrity | **NONE** | Table is UNCHANGED. New slug patterns (`story-*`) coexist with existing (`level-*`, `{category}-master-*`). No existing rows modified. | Verify: `SELECT COUNT(*) FROM child_achievements` before and after = same count. |
| 9 | `missions` table integrity | **NONE** | No columns modified. `missions.story_id` FK already exists (nullable). `missions.category_slug` kept as-is. New story missions will have both `story_id` (NOT NULL) and `category_slug` (mapped from slot type). | Verify: all existing missions retain their `story_id` and `category_slug` values. |
| 10 | `mission_versions` integrity | **NONE** | No changes. Existing versions serve both BK and Story Adventure missions. | N/A |
| 11 | Existing stories accessibility | **LOW** | Adding `status` column could make existing stories invisible if `is_active` trigger fires before data migration. | Migration MUST: (1) add `status` column with DEFAULT 'draft', (2) UPDATE `status = 'published'` WHERE `is_active = true`, (3) THEN create trigger. This ordering guarantees no data loss. |
| 12 | BK RPCs remaining callable | **NONE** | No existing RPCs are dropped or modified. `get_current_level`, `get_curriculum_missions`, `complete_curriculum_mission` all remain in database. | Legacy RPCs remain callable indefinitely. App code stops calling them from new flows but doesn't remove the functions. |
| 13 | `categories` table FK references | **NONE** | `missions.category_slug` FK to `categories.slug` is retained. New Story Adventure missions still set `category_slug` (mapped from slot type). No orphaned references. | Verify: no mission has NULL `category_slug` after migration. |
| 14 | `level_missions` FK references | **NONE** | Table frozen. Existing FK from `child_progress.mission_id` → `missions.id` is unaffected. No `level_missions` rows added or removed. | N/A |
| 15 | RLS policies on new tables | **LOW** | New tables need RLS policies. Risk: forgetting to enable RLS leaves data accessible without auth. | Migration includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and policies for every new table. Use same patterns as `mission_versions` (028). |
| 16 | `_activityData.ts` replacement | **MEDIUM** | 24+ files import from `_activityData.ts`. Replacing it affects many components simultaneously. | Phase the replacement: (1) Create `_storySlotData.ts` alongside `_activityData.ts` (both coexist). (2) Update components one at a time. (3) Remove `_activityData.ts` only when zero imports remain. Never delete while imports exist. |
| 17 | Homepage transformation | **MEDIUM** | `app/page.tsx` is the most complex page. Changing from 8-category grid to story library affects `loadProgress()`, `completedInLevel`, `completedSteps`, and 8+ child components. | Build story homepage as a parallel branch within `page.tsx` (feature-flag or conditional on `get_current_story` availability). Don't rip out existing code until story flow is verified working. |
| 18 | `/missions` route redirect | **LOW** | Users may have bookmarked `/missions`. | Implement as Next.js redirect in `next.config.js` or a `redirect()` call in page component. Old route stays accessible with redirect. |
| 19 | Offline queue compatibility | **LOW** | `lib/offlineQueue.ts` queues `completeCurriculumMission` calls. Story Adventure needs `completeStoryMission` calls. | Add a `type` field to queued items (`'curriculum' | 'story'`). `flushOfflineQueue` dispatches to correct RPC based on type. Existing queued items default to `'curriculum'`. |
| 20 | Parent insights computation | **LOW** | `lib/parentInsights.ts` references `ACTIVITIES` (8 categories) and `LevelMissionRow`. Story Adventure needs story-based equivalents. | Add parallel `computeStoryJourney()`, `computeStoryInsights()` functions. Keep existing functions for backward compatibility with historical data. |

## Risk Summary

| Risk Level | Count | Items |
|-----------|-------|-------|
| NONE | 12 | Items 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14 |
| LOW | 5 | Items 1, 11, 15, 18, 19, 20 |
| MEDIUM | 3 | Items 2, 16, 17 |
| HIGH | 0 | — |
| CRITICAL | 0 | — |

**No HIGH or CRITICAL risks identified.**

The 3 MEDIUM risks all have clear, documented mitigations:
- #2: Ordered migration steps (data-first, then trigger)
- #16: Parallel config files during transition
- #17: Feature-flagged parallel code path
