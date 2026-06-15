# Phase BD — Multilingual Journey Separation Architecture Report

**Date:** 2026-06-14
**Scope:** Convert the language switcher from a UI-translation toggle into
a learning-journey selector, so each of `en`/`fr`/`rw` maintains its own
curriculum level, mission completions, streak, badges and certificates for
a child — independently, without losing existing progress. Builds directly
on [Phase BC](./phase-bc-curriculum-verification.md)'s verified sequential
curriculum engine (migrations 026/027).

---

## 1. Audit: what was already independent

The data model from migrations 012/026/027 was already fully
language-partitioned at the storage layer — **no migration was required**
for Phase BD:

- **`child_progress`** — unique on `(child_id, mission_id, language)`. A
  mission completion in `en` and the *same* mission completed in `fr` are
  two distinct rows.
- **`child_achievements`** — unique on `(child_id, language, type, slug)`.
  Slugs are language-suffixed: `{category}-master-{lang}`,
  `level-{N}-complete-{lang}`, `program-complete-{lang}`,
  `curriculum-complete-{lang}`.
- **RPCs** `get_current_level(child_id, language)`,
  `get_curriculum_missions(child_id)` and
  `complete_curriculum_mission(child_id, mission_id)` (migrations 026/027)
  all derive `v_language := children.language` (or take it explicitly) and
  scope every `child_progress`/`child_achievements` read/write by it.
- **Frontend display chain** (`MyBadges`, `CertificatePanel`,
  `DashboardHero`, `DailyAdventureBanner`/`Grid`, `WhatsNext`,
  `MissionShell`) all derive `level`/`completed`/`level_complete`/
  `completedSteps` from `getCurriculumMissions(childId)` — already
  per-language **as long as `children.language` is correct and the data is
  reloaded after a switch.**

So level progression, mission completion, badge earning and certificate
unlocking were *already* independent per `(child_id, language)` at the
data/RPC layer. Phase BD's real gaps were (1) streak/stats aggregation and
(2) the language switchers themselves never reloading or keeping
`children.language` in sync.

---

## 2. Gap 1 — Streak/stats helpers were not language-scoped

In `lib/queries.ts`, six helpers queried `child_progress` filtered **only**
by `child_id` (no `language` filter), so they aggregated completions across
**all** languages a child had ever used:

- `getTodayStars`
- `getWeekStreak`
- `getTotalStars`
- `getActivityDates`
- `getWeekActivityCounts`
- `getCompletedMissionIds`

This violated "each language must maintain its own streak/stats." A
bilingual child's `fr` streak would have included `en` activity from the
same day/week, etc.

**Fix:** each function gained a `language: "en" | "fr" | "rw"` parameter
and an `.eq("language", language)` filter. All call sites now pass
`activeChild.language` (or the journey language currently being viewed):

- [`app/page.tsx`](../app/page.tsx) (`loadProgress`)
- [`components/layout/AppShell.tsx`](../components/layout/AppShell.tsx)
  (sidebar week-streak)
- [`app/user-profile/page.tsx`](../app/user-profile/page.tsx) (Overview /
  Activity / Skills / Streaks tabs)
- [`app/certificates/page.tsx`](../app/certificates/page.tsx)
- [`app/talk-to-nimi/page.tsx`](../app/talk-to-nimi/page.tsx) (chat sidebar
  stats)

For a single-language user (the common case today), this is behaviorally
identical to before — it only changes behavior for children who have used
more than one language.

---

## 3. Gap 2 — Disconnected language switchers

Before this phase there were **four** live language switchers, in two
different "shapes":

### "Journey-aware" shape (already correct)
- [`components/home/LanguageBadges.tsx`](../components/home/LanguageBadges.tsx)
- [`components/profile/AppPreferencesCard.tsx`](../components/profile/AppPreferencesCard.tsx)

Both call `updateChildLanguage(childId, lang)` (writes `children.language`,
the journey language) **and** `setLanguage(lang)` (updates
`LanguageContext`/localStorage, the UI chrome language), via the shared
[`LanguageSwitchDialog`](../components/LanguageSwitchDialog.tsx)
confirmation flow.

### "UI-translation-only" shape (the gap)
- [`components/layout/AppShell.tsx`](../components/layout/AppShell.tsx)
  header 🌐 dropdown — rendered on **every** page (AppShell wraps the whole
  app).
- [`components/settings/ContentSettingsCard.tsx`](../components/settings/ContentSettingsCard.tsx)
  `<select>` on `/settings`.

These called only `setLanguage(lang)` — they changed the *displayed*
strings but never wrote `children.language` and never reloaded curriculum
or streak data. This let `LanguageContext.language` drift out of sync with
`children.language`, which drives both the curriculum journey *and*
`category_effective_language` content selection.

Two more switchers
([`components/Header.tsx`](../components/Header.tsx), used only by
`app/subscription/page.tsx`, and `components/home/HomeHeader.tsx`, unused)
have the same UI-only shape but are low-traffic legacy surfaces —
documented here, intentionally not touched, to keep this change focused.

There was also a third, more subtle gap: on initial page load,
`LanguageContext` seeded its `language` state from `localStorage` only
(the Phase Y SSR-hydration fix), never from the active child's
`children.language` — so a fresh session could start with UI chrome out of
sync with the journey language even before any switcher was touched.

### Fix — three changes, one shared event bus

**B. Sync on load.** In `app/page.tsx`'s `selectChild` and
`AppShell.tsx`'s mount effect, `setLanguage(child.language)` is now called
as soon as the active child is resolved, so UI chrome starts in sync with
the journey language on every load.

**C. Convert both UI-only switchers to journey selectors.** Both
`AppShell.tsx`'s header dropdown and `ContentSettingsCard.tsx`'s `<select>`
now follow the same pattern as `LanguageBadges`/`AppPreferencesCard`:

1. Resolve the active child (`AppShell` already had it;
   `ContentSettingsCard` now fetches it via `getChildren()` +
   `nimipiko_active_child` on mount).
2. On selection, instead of switching immediately, set a `pendingLanguage`
   and show `LanguageSwitchDialog` for confirmation.
3. On confirm: `updateChildLanguage(child.id, lang)` →
   `setLanguage(lang)`.

**C. Global reload via `app:languageChange`.** `setLanguage()` (in
`LanguageContext`) already did three things synchronously:
`localStorage.setItem`, the state update, and
`window.dispatchEvent(new CustomEvent("app:languageChange", { detail: {
language } }))`. This existing event bus is now the single reload
mechanism for **every** switcher:

- `app/page.tsx` registers a listener that reloads `loadProgress(childId,
  lang)` — recomputing curriculum (`getCurriculumMissions`, which
  re-derives from `children.language` via the RPCs) and the
  now-language-scoped streak/stats for the new language. The old
  per-`LanguageBadges` `onLanguageChanged` callback was removed entirely —
  it's now redundant with this global listener.
- `AppShell.tsx` registers a listener that refetches its sidebar week
  streak for the new language.

A `useRef<Child | null>` (`activeChildRef`), updated **synchronously
before** `setLanguage()` is called, ensures both listeners always operate
on the correct, current child — avoiding stale-closure bugs since
`setLanguage` dispatches its event synchronously during the same call that
updates the ref.

The net effect: **all four** switchers (the two that were already
"journey-aware" and the two newly converted ones) now go through the exact
same `updateChildLanguage → setLanguage → app:languageChange → reload`
path, regardless of which page they're on.

---

## 4. Gap 3 — `child_badges` (not in scope)

`child_badges` (the Admin "Rewards & Badges" catalog from Round 11) has no
`language` column — it's a flat per-child collection, separate from
curriculum progression. Treated as **intentionally global** (a sticker
collection spanning all languages a child has explored), consistent with
it being an admin-curated reward system rather than curriculum state. Not
changed.

---

## 5. Gap 4 — `/certificates` page (not in scope)

`app/certificates/page.tsx` calls `getMissionsForDay`/
`getMissionsForDayByCategory`, which filter on `day_number`/`category`
columns removed by migration 012 (already flagged in Phase BC) — the page
already returns empty data today, for reasons unrelated to language. Not
touched in this phase; the `child_achievements` data it would eventually
need is already fully per-language and ready for whenever that page is
rebuilt (deferred content-expansion work).

---

## 6. Existing-progress preservation

Every change in this phase is additive:

- New function parameters with explicit call-site updates (no defaults
  that could silently change existing behavior for callers not yet
  updated — a full grep confirmed all six renamed functions have exactly
  one call shape, the new 2-arg form, everywhere in the codebase).
- New event listeners (`app:languageChange`) — pure additions, nothing
  removed from the existing dispatch.
- No DML, no schema change, no migration.

Ange's (`113d8c38-a912-4739-97e9-c074feae65df`, `fr`) existing
`child_progress`/`child_achievements` rows and `get_current_level`/
`get_curriculum_missions` results are unchanged — confirmed in
[the verification report](./phase-bd-multilingual-verification.md).

---

## 7. Verdict

**No migration required.** All independence guarantees (level, mission
completion, badges, certificates) already existed in the schema from
migrations 012/026/027; this phase closed the two remaining gaps
(language-unscoped streak/stats aggregation, and UI-only switchers that
never updated or reloaded the journey language) entirely in
TypeScript/React, via one shared `app:languageChange` event bus. See the
[verification report](./phase-bd-multilingual-verification.md) for test
results.
