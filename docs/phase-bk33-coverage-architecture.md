# BK.3.3 — Translation Coverage Dashboard Architecture

## Overview

`CoverageDashboard.tsx` is the "Coverage" tab of the Curriculum CMS. It surfaces
translation completeness across English, French, and Kinyarwanda at three levels of
granularity: per-lesson (individual category rows), per-unit (aggregated percentage),
and per-level (doubly-aggregated percentage). It answers "which lessons still need
translation?" without requiring an admin to open each mission individually.

## Schema dependencies

| Table | Columns used | Purpose |
|---|---|---|
| `curriculum_levels` | `level_number, framework_name, age_range_label` | Level pills |
| `curriculum_units` | `level_number, unit_number, title` | Unit pills |
| `level_missions` | `level_number, unit_number, category_slug, mission_id` | Slot mapping |
| `missions` | `id` | Mission identity |
| `mission_versions` | `language, title, is_current` | Coverage computation |

The query intentionally omits `status`, `created_at`, `content_json`, `media_url`, etc.
to keep the fetch lightweight — coverage only requires knowing whether a non-empty
`is_current` title exists per language.

## Coverage computation

```ts
// Per lesson: is this language covered?
hasLang(mission, lang)
  = (currentVersion(mission, lang)?.title ?? '').trim().length > 0

// Per lesson: overall %
lessonPct(mission)
  = Math.round(translationCoverage(mission).count / LANGUAGES.length * 100)
  // translationCoverage counts languages where hasLang is true

// Per unit: avg of 8 lessons
unitPct(level, unit)
  = Math.round(sum(lessonPct for each slug) / CATEGORY_ORDER.length)

// Per level: avg of units
levelPct(level)
  = Math.round(sum(unitPct for each unit) / units.length)
```

All computation is pure client-side — no SQL aggregation function needed.

## Component design

```
CoverageDashboard (accent: ACCENT.sky)
  ├── Level pills with levelPct% badge (emerald ≥80%, amber ≥50%, red <50%)
  │   └── Level-row summary: "Coverage: X%"
  ├── Unit pills with unitPct% badge (same color rules)
  └── Per-unit 5-column table
      ├── Category (icon + label)
      ├── 🇬🇧 EN   — LangBadge (✓ emerald / ✗ gray)
      ├── 🇫🇷 FR   — LangBadge
      ├── 🇷🇼 RW   — LangBadge
      └── Coverage% (COVERAGE_META badge)
```

Missing slots (no `level_missions` row for this category) show three ✗ badges and `0%`.
Rows are clickable → `onNavigate` to MissionEditor for direct translation editing.

## Design decisions

- **Sky accent** differentiates Coverage from Lessons (indigo) and Publishing (indigo)
  while staying in the "information" colour family.
- **Client-side aggregation** is preferred over SQL views for two reasons: (1) the data
  is already fetched for the slot/mission display, so no extra queries are needed; (2)
  the coverage definition ("non-empty current title") is client-code logic that should
  live alongside `translationCoverage()` in `missionMeta.ts` rather than be duplicated
  in a SQL function.
- **`translationCoverage()` is the single source of truth** for coverage semantics —
  both LessonManager and CoverageDashboard call it, so coverage meaning is consistent
  across the CMS.
