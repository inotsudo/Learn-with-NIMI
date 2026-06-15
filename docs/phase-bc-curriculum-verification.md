# Phase BC — Curriculum Progression Verification Report

**Date:** 2026-06-14
**Scope:** Verify the sequential curriculum engine (migration 026) before
implementing multilingual journey separation (Phase BD). No multilingual
work was done. One schema-adjacent fix (a function-only migration, 027)
was applied — see "Bugs found" below.

---

## 1. Automated test results (Task 1)

A reusable, self-cleaning SQL test suite was added at
[`supabase/tests/curriculum_progression_test.sql`](../supabase/tests/curriculum_progression_test.sql).
It creates a throwaway test child, drives it through `get_current_level`
and `complete_curriculum_mission`, asserts the expected behavior at each
step, and deletes the test child again (or rolls back entirely on
failure, so it never leaves residue). Run it with:

```
supabase db query --linked --file supabase/tests/curriculum_progression_test.sql
```

| # | Scenario | Result |
|---|---|---|
| 1 | New child starts at Level 1 | **PASS** — `get_current_level` = 1, `get_curriculum_missions` returns 8 rows, all `completed = false` |
| 2 | Completing fewer than 8 categories does not advance level | **PASS** — after 7/8, `get_current_level` still 1, `level_complete = false` |
| 3 | Completing all 8 categories unlocks next level | **PASS** — 8th completion returns `level: 2, level_complete: true`, `get_current_level` becomes 2 |
| 4 | Skipping future levels is impossible | **PASS (after fix — see below)** — calling `complete_curriculum_mission` with a Level-3 mission while at Level 2 raises `mission not in current level`; level stays at 2 |
| 5 | Progress persists across logout/login | **PASS** — verified manually across separate `supabase db query` invocations (each a fresh DB session/connection); `get_current_level`/`get_curriculum_missions` returned identical state. See note below. |

Scenarios 1-4 are encoded in the committed test script and can be re-run
at any time. Scenario 5 is inherently a cross-session check (the test
script runs as a single transaction, so it can't simulate "log out, log
back in" within itself). It was verified manually this session by issuing
the same read queries across multiple independent `supabase db query`
invocations — each one opens a brand-new DB connection with no
client-side state, which is the closest practical proxy to "a parent logs
out and back in." Results were identical across all of them. This is also
true by construction: `get_current_level`/`get_curriculum_missions` are
pure functions of `child_progress`/`child_achievements` rows — the
frontend only persists `nimipiko_active_child` (which child is selected)
in `localStorage`, never progress itself, so there is no client-side
session state for progress to "lose."

### What was actually run this session

Two throwaway children were created under an existing parent
(`f4418058-9f83-4f3c-b74c-fbaed84cc059`), driven through the full
level 1 → 2 → 3 sequence, and deleted afterward (cascade-deletes
`child_progress`/`child_achievements`). Highlights:

- A fresh child returns exactly 8 categories at `level: 1`, all
  `completed: false`.
- After completing 7/8 categories (everything except "morning"), level
  stays at 1 and `level_complete` is `false` for all 8 rows.
- Completing the 8th (morning) returns
  `{level: 2, level_complete: true, new_badges: ["level-1-complete-en"], stars_earned: 10}`.
  `get_curriculum_missions` then returns `level: 2` for all rows, with
  7/8 categories already `completed: true` (see "by-design" note below)
  and "morning" `completed: false`.
- **Before the fix**, calling `complete_curriculum_mission` with Level
  3's "morning" mission id (`fab2b651-…`, the "Friendship Song") while at
  Level 2 **succeeded** — see Bug #1.
- **After the fix** (migration 027), the same call raises
  `P0001: mission not in current level` and the level stays at 2.
- Completing Level 2's "morning" (Wake Up Song) then correctly returns
  `{level: 3, level_complete: true, new_badges: ["level-2-complete-en"]}`.
  Now legitimately at Level 3, completing Level 3's "morning"
  (Friendship Song — the same mission id rejected a moment earlier while
  at Level 2) is **allowed**, and correctly returns
  `{level: 3, level_complete: true, new_badges: ["morning-master-en", "level-3-complete-en"], new_certificate: "curriculum-complete-en"}`.
  Final `child_achievements` for this child: all 8 `{category}-master-en`
  badges, all 3 `level-N-complete-en` badges, plus both
  `program-complete-en` and `curriculum-complete-en` certificates — a
  fully consistent end state.

### By-design behavior (not a bug)

Levels 2 and 3 currently reuse Level 1's mission for 7 of the 8
categories (only "morning" has distinct Level 2/3 content — the existing
3-song rotation pool from Phase AA). This means a child who finishes
Level 1 automatically has 7/8 of Level 2 (and Level 3) already satisfied,
and advancing a level only requires completing that level's "morning"
song. This is intentional placeholder content per migration 026's own
comments (an extension point for a future Curriculum Manager), not a
progression bug — but it's worth knowing when reading the test output
above (why 7/8 categories show `completed: true` immediately after a
level-up).

---

## 2. UI verification (Task 2)

Static review of every component in the curriculum display chain. All
three required elements are present:

| Element | Where | Notes |
|---|---|---|
| **Level N** | [`DailyAdventureBanner.tsx`](../components/missions/DailyAdventureBanner.tsx) (`/missions` banner, "⭐ LEVEL {N} ADVENTURE ⭐") | `levelAdventureTitle` i18n key, fed by `curriculumMissions[0]?.level` |
| **Level N** | [`DashboardHero.tsx`](../components/home/DashboardHero.tsx) (`/` homepage hero, top-right pill) | only rendered when `level !== undefined`; same `levelAdventureTitle` key |
| **Level N** | [`MissionShell.tsx`](../components/missions/MissionShell.tsx) (per-mission page banner, "🏆 Level {N} complete!") | shown via `curriculumLevelMastered` when `levelComplete` |
| **Level N** | [`CertificatePanel.tsx`](../components/home/CertificatePanel.tsx) ("LEVEL {N} IN PROGRESS" / "LEVEL {N} COMPLETE!" / "LEVEL {N} CERTIFICATE") | |
| **Category progress (X/8)** | `DailyChampionCTA` in [`DailyAdventureGrid.tsx`](../components/missions/DailyAdventureGrid.tsx) | `{activitiesCompleted}/8` |
| **Category progress (X/8)** | `MissionShell.tsx` sidebar | progress bar + `{completedCount}/{ACTIVITIES.length}` |
| **Category progress (X/8)** | `CertificatePanel.tsx` | progress bar + `{done}/{TOTAL_STEPS} steps` |
| **Category progress (X/8)** | [`WhatsNext.tsx`](../components/home/WhatsNext.tsx) | "`{done}/{total}` missions mastered — `{remaining}` to go!" |
| **Locked/unlocked status** | [`MyBadges.tsx`](../components/home/MyBadges.tsx) | each category badge not yet earned shows a 🔒 overlay (`bg-black/20` + lock emoji) over a grayscale icon; earned badges are colorful and clickable |
| **Locked/unlocked status** | `CertificatePanel.tsx` step icons | not-yet-completed steps render grayscale + `opacity-50` ("locked" appearance) vs. full-color + green checkmark when done |
| **Done/not-done indicator** | [`ActivityGrid.tsx`](../components/home/ActivityGrid.tsx), `DailyAdventureGrid.tsx` | green dot / ⭐ vs. gray dot / ☆ |

**Note on "locked" semantics:** within the *current* level, none of the 8
category tiles are hard-navigation-locked — all are always clickable
`<Link>`s, and `MyBadges`/`CertificatePanel` use a 🔒/grayscale
*visual* "not yet earned" state rather than blocking navigation. There is
no UI surface for *future levels* at all (no "Level 2 preview, locked"
card) — future levels simply don't exist from the frontend's perspective
until `get_curriculum_missions` starts returning them, which only happens
once the current level is fully complete. This is consistent with the "no
skipping" requirement and didn't need any UI change.

---

## 3. Route protection (Task 3)

**Result: PASS.** Reviewed
[`app/missions/[category]/page.tsx`](../app/missions/%5Bcategory%5D/page.tsx),
[`app/missions/page.tsx`](../app/missions/page.tsx), and
[`app/page.tsx`](../app/page.tsx).

- There is no `level` route segment, query string, or any other
  client-suppliable parameter anywhere in the missions routing. The only
  dynamic segment is `[category]` (one of the 8 fixed category slugs).
- `getCurriculumMissions(childId)` takes **only** the child id — the
  level is always computed server-side via `get_current_level`, never
  passed in by the client. A client cannot ask "give me Level 2's
  missions" while at Level 1; the RPC always returns the *current* level
  for that child+language.
- Visiting `/missions/<category>` for a category whose current-level
  mission doesn't exist falls through to the `!mission` branch (renders
  `noPagesTitle`/`noPagesHint`) — there's no path that surfaces a
  different level's content via routing.
- The only mission-completion entry point, `handleComplete()` in
  `app/missions/[category]/page.tsx`, always passes `mission.id`, which
  itself came from the same `getCurriculumMissions()` response (current
  level only). The **frontend** never constructs or has access to a
  future-level `mission_id`.

The one remaining gap was **not** in routing but in the RPC layer itself
— see Bug #1 below, now fixed by migration 027.

---

## 4. Progression bugs found & fixes (Task 4)

### Bug #1 (FIXED): `complete_curriculum_mission` did not validate the mission against the child's current level

**Severity:** High — directly violates "skipping future levels is
impossible."

**Root cause:** `level_missions` has a permissive read policy
(`auth.uid() is not null` — any authenticated parent can read **all**
levels' `(level_number, category_slug) → mission_id` mappings, including
future ones). `complete_curriculum_mission(p_child_id, p_mission_id)`
looked up `p_mission_id` directly in `missions` and recorded progress
without ever checking whether that mission belongs to
`level_missions` for the child's *current* level.

**Demonstrated impact (pre-fix, live on the linked DB with a throwaway
test child):** While at Level 2, calling
`complete_curriculum_mission(child, <Level-3 "morning" mission id>)`
(a value readable from `level_missions` but never returned to the
frontend at Level 2) succeeded and inserted a `child_progress` row for
that Level-3 mission. The moment the child then legitimately finished
Level 2's own "morning" mission, `get_current_level` jumped straight to
**3 with `level_complete: true` for every category** — i.e., Level 3 was
fully pre-completed and skipped entirely, without the child ever doing
any of its content. The achievement record was also left inconsistent:
`program-complete-en` was awarded but `curriculum-complete-en` and
`level-3-complete-en` were not (because the certificate/level-complete
checks run against the level the child was *on* at the time of each
call, which was Level 2 for that completion).

**Fix applied — migration
[`027_curriculum_no_skip_guard.sql`](../supabase/migrations/027_curriculum_no_skip_guard.sql)**
(pushed to the linked DB): a `create or replace function` redefinition of
`complete_curriculum_mission` — **no schema/table changes** — that adds
one guard before recording progress:

```sql
v_level_before := get_current_level(p_child_id, v_language);

if not exists (
  select 1 from level_missions
  where level_number = v_level_before and mission_id = p_mission_id
) then
  raise exception 'mission not in current level';
end if;
```

Because shared placeholder mission ids (used by 7/8 categories across
Levels 1-3) appear in `level_missions` for *every* level they're reused
in, this guard never rejects a legitimate current-level completion — only
out-of-level ones. Re-running the full scenario post-fix confirmed:

- The premature Level-3 call now raises `mission not in current level`
  and leaves the child at Level 2.
- Completing Level 2's own "morning" mission still works normally
  (`level: 3, level_complete: true, new_badges: ["level-2-complete-en"]`).
- *Now* legitimately at Level 3, completing Level 3's "morning" mission
  is allowed and correctly awards `level-3-complete-en` +
  `curriculum-complete-en` — the achievement record ends up fully
  consistent (all 8 category badges, all 3 level badges, both
  certificates).

`npx tsc --noEmit` is clean (this fix is SQL-only; no TypeScript changed).

### No other progression-integrity bugs found

- `get_current_level` and `get_curriculum_missions` are both correctly
  scoped per `(child_id, language)` and derive everything from
  `child_progress`/`level_missions` — no stored "current level" column to
  drift out of sync.
- No route, query param, or RPC argument lets the client request a
  specific level — it's always derived server-side.
- Frontend display logic (Task 2) reads `level`/`completed`/
  `level_complete` directly from `get_curriculum_missions`'s response;
  no client-side level computation that could disagree with the server.

### Recommendations (not implemented — optional, lower priority)

1. **Tighten `level_missions` SELECT RLS** from `auth.uid() is not null`
   to something that hides future-level rows (e.g., a view or a
   `security definer` RPC limited to the caller's current level). This is
   *defense in depth* only — with Bug #1 fixed, reading future
   `mission_id` values no longer lets a user bank progress on them.
   Skipping this for now per "no schema changes unless required";
   `complete_curriculum_mission`'s guard is the actual integrity
   boundary.
2. When an admin eventually authors **distinct** Level 2/Level 3 content
   for the other 7 categories (replacing the current shared placeholders),
   re-run `supabase/tests/curriculum_progression_test.sql` — its
   assertions don't depend on the placeholder setup and will continue to
   pass, but it's a good regression check at that point.

---

## 5. Overall verdict

**The curriculum engine is stable and correct.** One real
progression-integrity bug was found (Bug #1, future-level skip via direct
RPC call) and fixed via a function-only migration (027) with zero schema
changes, verified both to close the hole and to preserve all legitimate
progression paths (including correct badge/certificate sequencing at the
max level). UI display of Level N / category progress / locked-unlocked
status, and route protection, were both already correct by construction
and required no changes. Ready to proceed to Phase BD (multilingual
journey separation).
