# BK.3.5 — Publishing Center Architecture

## Overview

`PublishingCenter.tsx` is the "Publishing" tab of the Curriculum CMS. It provides a
structured workflow view for advancing mission content through the
`draft → review → published` lifecycle without needing to open each mission in the
full MissionEditor. It focuses on the English (`en`) version as the publishing gate —
per-language coverage is tracked separately in CoverageDashboard.

## Schema dependencies

| Table | Columns used | Purpose |
|---|---|---|
| `curriculum_levels` | `level_number, framework_name, age_range_label` | Level pills |
| `curriculum_units` | `level_number, unit_number, title` | Unit pills |
| `level_missions` | `level_number, unit_number, category_slug, mission_id` | Slot mapping |
| `missions` | `id, active` | Mission identity |
| `mission_versions` | `id, mission_id, language, title, status, is_current, published` | Workflow state |

Only English (`language = 'en'`) `is_current` versions drive the readiness metric
because English is the authoring language — translators work in French/Kinyarwanda
after the English version is published.

## Data derivation

Same 4-query parallel fetch as LessonManager and CoverageDashboard:

```
curriculum_levels → levelPills
curriculum_units  → unitsByLevel
level_missions    → slots { "level:unit:slug" → mission_id }
missions + mission_versions (nested) → missionsById
```

**Readiness** for a unit:
```ts
readyCount(level, unit)
  = count of CATEGORY_ORDER slugs where:
      slot exists AND mission has an en is_current version with status === 'published'
readinessPct(level, unit) = Math.round(readyCount / 8 * 100)
```

Unit pill badge: emerald if `readyCount === 8`, amber otherwise.

## Component design

```
PublishingCenter (accent: ACCENT.indigo)
  ├── Level pills
  ├── Unit pills with "N/8 Published" badge (emerald 8/8, amber otherwise)
  └── Per-unit 4-column table
      ├── Category (icon + label)
      ├── Status badge (STATUS_META for EN is_current status; "Missing" if no slot)
      ├── Actions (contextual per status — see workflow below)
      └── ExternalLink button → onNavigate(`mission:${slug}:${mission.id}`) → MissionEditor
```

## Workflow actions

| Current status | Available actions |
|---|---|
| (no slot) | — |
| `draft` | **Send to Review** → direct UPDATE SET status='review' |
| `review` | **Back to Draft** → UPDATE SET status='draft'; **Publish** → RPC |
| `published` | **Publish** disabled (already live); **Create Revision** (future) |

**"Send to Review"** and **"Back to Draft"** are direct `UPDATE` statements on the
`mission_versions` row. Status is a workflow label — moving backward is safe because
`published` boolean is only set by the trigger when `status='published'`.

**"Publish"** calls `publish_mission_version_revision(p_version_id)` RPC (from migration
037). The RPC: (1) demotes any existing published sibling to 'archived', (2) sets
`status='published'` + `is_current=true` on the target version, (3) syncs
`missions.active`. Publish is blocked (`disabled`) if `title.trim()` is empty.

## Bulk action: "Publish All Ready"

A "Publish All Ready" button in the section header iterates all `review`-status EN
is_current versions for the selected Level/Unit, confirms once via `useConfirmDialog`,
then calls the RPC for each in series. Results in a single `fetchData()` refresh.

## Design decisions

- **Read English, gate on English**: CoverageDashboard handles per-language coverage;
  PublishingCenter handles the content-approval gate. Mixing both concerns in one view
  would make neither clear.
- **Direct status updates for draft↔review**: these are editorial workflow transitions
  (no partial-index invariants at stake). Only the `published` state has a constraint
  (partial unique index `mission_versions_one_published_idx`) and therefore requires
  the RPC.
- **MissionEditor link per row**: admins who need to edit content mid-workflow go to
  MissionEditor directly rather than through a separate lookup step.
