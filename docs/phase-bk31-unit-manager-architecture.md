# BK.3.1 — Unit Manager Architecture

## Overview

`UnitManager.tsx` is the "Units" tab of the Curriculum CMS (`CurriculumManager.tsx`).
It lets admins plan the Unit roadmap for each Level — creating, naming, theming,
describing, and lifecycle-managing Units before their lessons are built.

## Schema dependencies

| Table | Columns used | Purpose |
|---|---|---|
| `curriculum_levels` | `level_number, framework_name, age_range_label` | Level pills |
| `curriculum_units` | `level_number, unit_number, title, theme_emoji, description, status` | Unit CRUD |
| `level_missions` | `level_number, unit_number` (count) | Lesson count badge per unit |

`curriculum_units` PK is `(level_number, unit_number)` (added by migration 038,
`description`+`status` columns added by migration 039).

`status` enum: `draft | active | archived` — client-defined, stored as `text` in the DB.

## Component design

```
UnitManager
  ├── fetchData() — parallel: curriculum_levels + curriculum_units + level_missions
  ├── Level pills (ACCENT.indigo)
  │   └── click → setSelectedLevel, reset search/showArchived
  ├── Toolbar
  │   ├── Search (by title or unit_number)
  │   ├── "Show Archived" toggle (only visible when archivedCount > 0)
  │   └── "Add Unit N" button → handleAddUnit
  ├── Unit cards (one per visible unit)
  │   ├── Unit-number badge (indigo)
  │   ├── Title input (inline, onBlur → saveUnit)
  │   ├── Theme emoji input (inline, onBlur → saveUnit)
  │   ├── Description textarea (inline, onBlur → saveUnit)
  │   ├── Lesson count badge (indigo if >0, gray if 0)
  │   ├── ▲▼ reorder buttons
  │   ├── Status select (draft/active/archived)
  │   └── Archive button → handleArchive (via useConfirmDialog)
  └── Shared: Skeleton/SkeletonList, loadError retry banner, action-error banner
```

## Key operations

### Create
`handleAddUnit(levelNumber)` — derives `nextUnit = max(existing unit_numbers)+1`,
inserts into `curriculum_units` with `status='draft'` and empty metadata, then
`fetchData()` to refresh.

### Edit
All text/emoji/description fields are inline inputs. `handleFieldChange` updates local
state immediately (optimistic UI); `saveUnit` fires on `onBlur` via an upsert on PK
`(level_number, unit_number)`.

### Status change
`handleStatusChange(unit, status)` — optimistic local update + `saveUnit`. Same code
path as regular edit, just pre-building the updated unit object before saving.

### Archive
`handleArchive` confirms via `useConfirmDialog` (with a contextual message depending on
whether the unit has lessons), then calls `handleStatusChange(unit, 'archived')`.
Archiving does not affect `level_missions` rows or learner progress — it's a roadmap
lifecycle label only.

### Reorder
`handleReorder(unit, direction)` — swaps the metadata (title/theme/description/status)
between two adjacent unit rows by issuing two sequential upserts. Reorder is blocked if
either unit or its neighbour has `lessonCount > 0` (lesson row ordering is meaningful;
swapping metadata of units with live content would misrepresent the curriculum).

## UI decisions

- **Capacity target**: `RECOMMENDED_UNITS_PER_LEVEL = 52`. A warning renders if the
  current level exceeds this (per Phase BK capacity-planning mandate). Not enforced.
- **Optimistic updates**: local state is patched immediately on field change; the DB
  write fires on blur. This avoids the perceived latency of waiting for a round-trip
  on every keystroke.
- **Lesson guard on reorder**: once lessons are assigned to a unit, its slot in the
  sequence carries semantic meaning (learner progression order); swapping metadata
  silently would confuse curriculum authors and potentially reorder learner content.
