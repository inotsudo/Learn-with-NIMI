# NIMIPIKO Curriculum Framework

**Date:** 2026-06-14
**Phase:** BJ — Generalized Curriculum Framework

This document is the reference for how NIMIPIKO's existing curriculum
content is organized into **age-based learning stages (Levels)**,
**categories**, and **language journeys**, and how to add new content
without redesigning the curriculum. It covers all 5 deliverables from the
Phase BJ spec: Curriculum Structure, Level-to-Category Mapping, Language
Journey Mapping, Content Organization Guidelines, and CMS Import Templates.

The underlying engine (migrations 026-027, Phase BC/BD) already enforces
every "Curriculum Rule" below — this document explains *how*, and adds one
small piece of metadata (`curriculum_levels`, migration 032) naming each
level as a pedagogical stage.

---

## 1. Curriculum Structure

`curriculum_levels` (migration 032) names each `level_missions` level as an
age-based framework, editable by admins in **Curriculum → Levels**
(`LevelEditor.tsx`):

| Level | Age Range | Framework Name | Primary Focus |
|---|---|---|---|
| 1 | Ages 1–2 | Toddler Framework | Sensory & Motor Development |
| 2 | Ages 3–4 | Preschool Framework | Exploration & Social Development |
| 3 | Ages 5–6 | School Readiness / Pre-K Framework | Foundational Academics |

Adding **Level 4+**: click "Add Level" in `LevelEditor` — this creates the
8 `level_missions` rows (defaulted from Level 1's missions, so the new
level is immediately playable) and a blank `curriculum_levels` row, which
the admin then names (age range / framework name / primary focus) inline.

---

## 2. Categories

The 8 categories from `CATEGORY_ORDER` (`app/admin/missionMeta.ts`), each
appearing once per level:

| # | Slug | Label | Default Type |
|---|---|---|---|
| 1 | `morning` | Morning Song | sing |
| 2 | `movement` | Movement Mission | move |
| 3 | `artistic` | Mission Artistique | color |
| 4 | `histoire` | Mission Historique | watch |
| 5 | `zoom` | Mission Zoom | watch |
| 6 | `discovery` | Mission Discovery | read |
| 7 | `flipflop` | FlipFlop Book | story |
| 8 | `coloring` | Coloring Book | color |

---

## 3. Curriculum Rules → Engine Mapping

Each rule from the Phase BJ spec is already enforced by the existing engine:

| Rule | Enforced by |
|---|---|
| Every level contains all 8 categories | `level_missions` PK is `(level_number, category_slug)` — migration 026 seeds all 3×8=24 rows; `LevelEditor`'s "Add Level" always inserts one row per `CATEGORY_ORDER` category |
| Every category exists in French, English, and Kinyarwanda | `mission_versions(mission_id, language)` — **target**, see §5 for current coverage (this rule is a content-production target, not yet 100% met) |
| Learners progress sequentially through levels | `get_current_level(child_id, language)` returns the smallest level with an incomplete category, saturating at `max(level_number)` |
| No skipping is allowed | `complete_curriculum_mission` (migration 027) rejects completions for a mission whose `level_number > get_current_level(...)` |
| Progress is tracked independently for each language journey | Phase BD: `child_progress`/`child_achievements`/certificates are all keyed by `(child_id, language)` — switching a child's `language` does not affect progress recorded under another language |
| Existing mission content is mapped into the appropriate level and category | `level_missions` — see §4; **100% of existing missions are already mapped** (verified by `supabase/tests/curriculum_framework_test.sql` Scenario 3) |

---

## 4. Level-to-Category Mapping

Live data as of 2026-06-14 (10 missions total, 24 `level_missions` rows).
"Shared" means the same `mission_id` is reused from Level 1 — Phase BC's
placeholder design, so every level is playable today even before
level-specific content exists for that category.

| Category | Level 1 (Toddler) | Level 2 (Preschool) | Level 3 (School Readiness) |
|---|---|---|---|
| Morning Song | **"Sing Along with Nimi"** — EN✅ FR❌ RW🟡draft | **"Sing Along with Nimi" / "Chante avec Nimi" / "Ririmba na Nimi"** — EN✅ FR✅ RW✅ | **"Sing Along with Nimi" / "Chante avec Nimi" / "Ririmba na Nimi"** — EN✅ FR✅ RW✅ |
| Movement Mission | "Move & Groove" — EN✅ FR✅ RW❌ | *(shared with L1)* | *(shared with L1)* |
| Mission Artistique | "Little Creators" — EN✅ FR❌ RW❌ | *(shared with L1)* | *(shared with L1)* |
| Mission Historique | "Mission Historique" — EN✅ FR✅ RW✅ | *(shared with L1)* | *(shared with L1)* |
| Mission Zoom | "Mission Zoom" — EN✅ FR❌ RW❌ | *(shared with L1)* | *(shared with L1)* |
| Mission Discovery | "Shiny Readers" — EN✅ FR❌ RW❌ | *(shared with L1)* | *(shared with L1)* |
| FlipFlop Book | "Magic Stories with Nimi" — EN✅ FR❌ RW❌ | *(shared with L1)* | *(shared with L1)* |
| Coloring Book | "Color Your Story" — EN✅ FR❌ RW❌ | *(shared with L1)* | *(shared with L1)* |

**"morning" is the only category with level-specific content** (3 distinct
missions, one per level — Phase AA's song rotation). The other 7 categories
each have exactly **one** mission, reused at all 3 levels.

**Primary content-expansion opportunity**: writing Level-2/3-specific
content for the 7 shared categories (movement, artistic, histoire, zoom,
discovery, flipflop, coloring) — 14 new missions (7 categories × 2 levels)
× 3 languages = 42 new `mission_versions` rows, using the Level 2/3 import
templates (§7).

---

## 5. Language Journey Mapping

Progress, achievements, and certificates are all keyed by
**`(child_id, language)`** — a "journey". A single child has up to 3
independent journeys (one per `en`/`fr`/`rw`), switchable at any time via
the language selector (`updateChildLanguage`), with zero cross-journey
effect (Phase BD).

**Example** (learner "Ange", live data, 2026-06-14):

| Journey | Distinct missions completed (of 10) |
|---|---|
| `en` | 10 |
| `fr` | 5 |
| `rw` | 6 |

Each number reflects that journey's own progress through Levels 1-3 —
switching Ange's active language does not advance or reset any other
journey.

### Translation coverage (current state vs. "every category in every language")

| Language | Missions Published | Total Missions | Coverage |
|---|---|---|---|
| English (`en`) | 10 | 10 | 100% |
| French (`fr`) | 4 | 10 | 40% |
| Kinyarwanda (`rw`) | 3 | 10 | 30% |

The "every category in every language" rule is the **target state**: for
each of the 24 `level_missions` rows, a fully-published `mission_versions`
row should exist in `en`/`fr`/`rw`. Today, English is complete; French and
Kinyarwanda need translations for the categories marked ❌ in §4 (the
Kinyarwanda "Morning Song" Level-1 mission also has an `rw` version, but it
is still `status='draft'` — not yet published).

---

## 6. Content Organization Guidelines

- **Sequence ↔ Level convention**: `missions.sequence` for a category
  corresponds to the level it's intended for (`sequence = N` → Level N
  content), as established by "morning"'s 3-song rotation (seq 1/2/3 →
  Levels 1/2/3). When adding Level-2/3-specific content for the other 7
  categories, give the new mission `sequence = 2` or `sequence = 3`
  respectively, then repoint that level's `level_missions` cell to it in
  `LevelEditor`.
- **Draft → Review → Published workflow** (migration 028): new content
  starts as `status='draft'` (and `missions.active=false` until *any*
  language is published — `MissionEditor`'s `anyPublished` check). Move
  through `draft → review → published` per language in **Daily
  Adventures → Mission Editor**. A mission only appears for learners in a
  given language once that language's version is `published`
  (migration 019 — no English fallback).
- **Media conventions**: story/coloring assets live in the `storyBook`
  and `Coloriage` Supabase Storage buckets (Phase BG Media Library,
  **Buckets** tab) — upload there first, then reference the resulting URL
  in `media_url`.
- **Adding Level 4+**: use `LevelEditor`'s "Add Level" button (creates the
  8 `level_missions` rows + a blank `curriculum_levels` row), then fill in
  the new level's Framework Name / Age Range / Primary Focus inline.

---

## 7. CMS Import Templates

**Curriculum → Bulk Import** (`BulkImportManager.tsx`) now offers, in
addition to the generic single-example CSV template, one **per-level XLSX
template** per row in `curriculum_levels` ("Download Level N Template
(Framework Name)"). Each template contains:

- Row 1: a label identifying the level/framework (e.g. "Level 2 — Preschool
  Framework — Ages 3–4 — Exploration & Social Development") — **delete this
  row before importing**.
- Row 2: the standard header (`category_slug, sequence, type, stars,
  duration_minutes, language, title, subtitle, tip_text, media_url,
  content_json`).
- Rows 3-26: 24 blank rows — one per (category × language) combination
  (8 categories × `en`/`fr`/`rw`), with `category_slug`, `sequence` (=
  level number), and `type` (the category's `default_type`) pre-filled.

**Workflow**: download the Level-N template → delete row 1 → fill in
`title`/`subtitle`/`tip_text`/`media_url`/`content_json` for each row →
import (creates new missions with `active=false` and `status='draft'`
versions via `admin_bulk_import_missions`) → review/publish per language in
**Mission Editor** → repoint the relevant `level_missions` cells to the new
missions in **Curriculum → Levels**.
