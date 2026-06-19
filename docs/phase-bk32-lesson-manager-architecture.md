# BK.3.2 — Lesson Manager Architecture

## Overview

`LessonManager.tsx` is the "Lessons" tab of the Curriculum CMS. It provides a
read-centric view of all 8 category slots for a selected Level/Unit, showing each
lesson's translation coverage, English status, and last-edited date. It is the primary
way to spot gaps ("Missing" slots) and drill into individual lessons via MissionEditor.

## Schema dependencies

| Table | Columns used | Purpose |
|---|---|---|
| `curriculum_levels` | `level_number, framework_name, age_range_label` | Level pills |
| `curriculum_units` | `level_number, unit_number, title` | Unit pills |
| `level_missions` | `level_number, unit_number, category_slug, mission_id` | Slot mapping |
| `missions` | `id, active` | Mission identity + active flag |
| `mission_versions` | `language, title, status, is_current, created_at` | Coverage + status |

## Data derivation

```
fetchData() — 4 parallel queries
  ↓
titleByKey  = { "level:unit" → title }   (from curriculum_units)
unitSetByLevel = { level → Set<unit> }   (union of curriculum_units + level_missions)
slots       = { "level:unit:slug" → mission_id }  (from level_missions)
missionsById = { id → MissionRow }       (from missions + nested mission_versions)
```

`unitsByLevel` is built from `unitSetByLevel` so units that have `level_missions` rows
but no `curriculum_units` row are still shown (forward-compat: slots can exist before
units are formally named).

## Component design

```
LessonManager
  ├── Level pills → Unit pills (same drill-down pattern as CoverageDashboard)
  ├── Unit pill shows N/8 filled badge (amber if incomplete, gray if full)
  ├── Per-unit 4-column table
  │   ├── Category (icon + label, dimmed if slot empty)
  │   ├── Language Coverage (COVERAGE_META badge via translationCoverage())
  │   ├── Status (STATUS_META badge for EN is_current version; Inactive badge if !mission.active)
  │   └── Last Updated (formatDate on max created_at across all mission_versions)
  └── Row click → onNavigate(`mission:${slug}:${mission.id}`) → MissionEditor
```

Missing slots render a full-width "🚫 Missing" badge spanning columns 2-4.

## Helper functions

```ts
translationCoverage(m: MissionRow)  // from missionMeta.ts
  → count = languages where (is_current title).trim().length > 0
  → level = 'single' | 'partial' | 'full'

lastUpdated(m: MissionRow)
  → max(created_at) across all mission_versions rows for this mission
  → used because mission_versions lacks an updated_at column; created_at is
    immutable per revision, so max(created_at) = the most recently created/revised version
```

## Navigation contract

`onNavigate(target)` is passed in from `CurriculumManager.tsx`, which interprets:
- `"mission:${slug}:${missionId}"` → switches the admin portal to MissionEditor
  pre-selected on that mission and category filter.

## Read-only design

LessonManager makes no writes. All mutations happen in MissionEditor (reached via
row click) or in PublishingCenter (reached via the Publishing tab). This separation
keeps the view fast (no optimistic-update complexity) and the intent clear (Lessons =
overview, Publishing = workflow).
