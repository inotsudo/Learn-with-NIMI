# Phase BF — Achievement & Certificate System Architecture Report

**Date:** 2026-06-14
**Scope:** Turn the existing `child_achievements` data (already written by
`complete_curriculum_mission`, migrations 026/027) into a visible,
4-tier learner reward system — an Achievement Dashboard at
`/certificates`, replacing dead code.

---

## 1. Audit: what already existed

`child_achievements (child_id, language ∈ {en,fr,rw}, type ∈
{badge,certificate}, slug, earned_at)`, unique on
`(child_id, language, type, slug)`. `complete_curriculum_mission`
(migration 027, the current authoritative version) is the **sole
writer**, and every insert is guarded by `on conflict (child_id,
language, type, slug) do nothing` — duplicate-safe by construction, and
already proven by the Phase BC/BD test suites.

It already produces exactly these slug families:

| Slug pattern | Type | Condition (from migration 027) |
|---|---|---|
| `{category}-master-{lang}` | badge | all published missions in that category (for the child's effective language) completed ≥1× |
| `level-{N}-complete-{lang}` | badge | all `level_missions` rows for level N completed (N = `v_level_before`) |
| `program-complete-{lang}` | certificate | all categories with published content complete |
| `curriculum-complete-{lang}` | certificate | `v_level_before >= v_max_level` (max level just finished) |

**The gap:** nothing displayed any of this. `/certificates` queried
`getMissionsForDay`/`getMissionsForDayByCategory`, columns removed by
migration 012 — always returned empty data (flagged as dead in Phase
BD). The homepage's `MyBadges`/`CertificatePanel` show only
*current-level* progress (Phase X), not the lifetime collection.

---

## 2. The 4-tier hierarchy

| Tier | Name | Backing slug | Status |
|---|---|---|---|
| 1 | **Explorer Badges** | `level-{N}-complete-{lang}` (N = 1..maxLevel) | existing, reused |
| 2 | **Category Master Badges** | `{category}-master-{lang}` (8 categories) | existing, reused |
| 3 | **Language Explorer Certificates** | `curriculum-complete-{lang}` | existing, reused |
| 4 | **Trilingual Champion Certificate** | *(new, derived — no DB row)* | earned ⟺ all 3 of Tier 3 exist |

`program-complete-{lang}` keeps being written (the admin
`CertificatesManager` "program certs" stat depends on it) but is **not**
part of this learner-facing hierarchy — left untouched.

### Tier 4: derived, not stored — no migration

`child_achievements.language` has `check (language in ('en','fr','rw'))`
— a genuinely cross-language achievement can't be a normal row without a
schema change. Instead, "Trilingual Champion" is computed at read time
(`getTrilingualStatus()` in `app/_achievementData.ts`):

- `earned ⟺` rows for `curriculum-complete-en`, `curriculum-complete-fr`
  AND `curriculum-complete-rw` all exist for the child.
- `earnedAt = max(earned_at)` of those three (the moment the 3rd
  language's curriculum finished).
- `progress` = 0-3, how many of the three exist.

This needed **zero schema/RPC changes**, is trivially duplicate-safe
(nothing is ever inserted), and is fully retroactive for any child who
already qualifies — matching the "no migration required" precedent from
Phase BD.

---

## 3. New code

### Data layer — `lib/queries.ts`
- `ChildAchievement` type (mirrors the table row).
- `getChildAchievements(childId)` — `select * from child_achievements
  where child_id = ...`, all 3 languages (RLS `is_my_child` already
  permits this).
- `getMaxCurriculumLevel()` — `select level_number from level_missions
  order by level_number desc limit 1` (currently `3`), so Explorer
  Badges stay correct if a Level 4 is ever seeded.

### Catalog — `app/_achievementData.ts`
Mirrors the `app/_activityData.ts` convention:
- `LANGUAGE_META` — fixed native language names/flags (🇬🇧 English, 🇫🇷
  Français, 🇷🇼 Kinyarwanda), same convention as `AppPreferencesCard`'s
  switcher.
- `AchievementItem` — one entry per earnable Tier 1-3 achievement
  (`tier`, `slug`, `type`, `language`, `emoji`, `titleKey`/`descKey` +
  `{...}` substitution params).
- `buildAchievementCatalog(maxLevel, t)` — builds the full 3-language
  catalog: 1 Language Explorer Certificate + `maxLevel` Explorer Badges +
  8 Category Master Badges (from `ACTIVITIES`) per language. `t` is
  passed in so category names are resolved to the *viewer's* UI language
  up front.
- `fillTemplate()` — `"{key}"` placeholder substitution.
- `getEarnedMap(achievements)` — `slug -> earned_at` lookup.
- `getTrilingualStatus(achievements)` — Tier 4 derivation (above).

### UI — `/certificates` becomes the Achievement Dashboard
- `app/certificates/page.tsx` — rewritten. Fetches
  `getChildAchievements(child.id)` + `getMaxCurriculumLevel()`, with the
  same try/catch + `loadError`/`reloadKey` retry pattern used by
  `app/missions/[category]/page.tsx` (Phase Y). Keeps the existing "no
  children yet" empty state.
- `components/certificates/CertificatesHeader.tsx` — simplified to just
  the page title/subtitle (`achievements`/`achievementsPageSubtitle`);
  the old "All Certificates"/"Download History" tab toggle is gone (it
  pointed at certificates that never existed).
- `components/certificates/AchievementDashboard.tsx` (new) —
  `TrilingualChampionBanner` at top, then 🇬🇧/🇫🇷/🇷🇼 language tabs
  (default = child's current `language`). For the selected language:
  Language Explorer Certificate (1 card), Explorer Badges row (`maxLevel`
  cards), Category Master Badges grid (8 cards).
- `components/certificates/AchievementCard.tsx` (new) — generalized
  earned/locked card (grayscale + 🔒 + `certLockedMessage` when locked;
  emoji badge + `awardedTo` when earned), driven by an `AchievementItem` +
  optional `earned_at`. Tier-based color theming (amber for certificates,
  purple for Explorer Badges, blue for Category Master).
- `components/certificates/TrilingualChampionBanner.tsx` (new) — earned
  state reuses the gold confetti banner style from
  `components/home/CertificatePanel.tsx`'s "all complete" card; locked
  state shows a "{progress}/3 languages" teaser with the 3 flags.

### Removed dead code
- `components/certificates/_certificateData.ts`
- `components/certificates/CertificateGrid.tsx`
- `components/certificates/CertificateCard.tsx`

(`noDownloadsTitle`/`noDownloadsBody` i18n keys are now unused but left
in place, same as other deliberately-orphaned keys in this codebase.)

### Homepage touch
`components/home/MyBadges.tsx` gained a "View All Achievements →" link
(`Link href="/certificates"`, reusing the existing `viewAllAchievements`
i18n key) at the bottom of the card — the only homepage change. Phase X's
`MyBadges`/`CertificatePanel`/`WhatsNext` (current-level progress) are
untouched; the new dashboard is the separate *lifetime* view.

---

## 4. i18n

12 new keys added to `contexts/LanguageContext.tsx` for en/fr/rw:
`achievementsPageSubtitle`, `languageExplorerCertSectionTitle`,
`explorerBadgesSectionTitle`, `categoryMasterBadgesSectionTitle`,
`achExplorerBadgeDesc`, `achCategoryMasterTitle`, `achCategoryMasterDesc`,
`achLanguageExplorerTitle`, `achLanguageExplorerDesc`,
`trilingualChampionTitle`, `trilingualChampionDesc`,
`trilingualChampionProgress`. Reuses existing `achievements`,
`levelExplorer`, `awardedTo`, `certLockedMessage`, `viewAllAchievements`.

---

## 5. Verdict

**No migration required.** Every guarantee Phase BF needed
(language-specificity, duplicate-prevention for Tiers 1-3, and a
duplicate-proof derivation for Tier 4) already existed in migrations
012/026/027. This phase is entirely a new read path
(`getChildAchievements`/`getMaxCurriculumLevel`) plus a new UI layer over
it. See the [verification report](./phase-bf-achievement-verification.md)
for test results.
