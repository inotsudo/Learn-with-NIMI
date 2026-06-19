# BK.3.4 — Archive Safety System Architecture

## Overview

The Archive Safety System prevents silent removal of curriculum content by detecting
whether a mission is currently assigned as a lesson slot in the curriculum before
archiving it. When a curriculum reference is found, a structured impact modal replaces
the generic confirm dialog, offering three choices instead of one.

## Components changed

### `ArchiveImpactModal.tsx` (new)

A modal dialog rendered when the mission targeted for archiving has one or more
`level_missions` rows. Props:

```ts
interface ArchiveImpactModalProps {
  missionLabel: string          // "{category} #{sequence}"
  usages: ArchiveUsage[]        // [{ level_number, unit_number }, ...]
  onCancel:        () => void
  onArchiveAnyway: () => void
  onReplaceLesson: () => void
}
```

Renders:
- A red `AlertTriangle` icon header
- A prose warning ("assigned in the curriculum... will remove it from every Level/Unit
  below until you assign a replacement")
- A "Used In" list of Level/Unit pills (one per `level_missions` row)
- Three action buttons: **Cancel** · **Replace Lesson** · **Archive Anyway**

"Replace Lesson" navigates to the Curriculum tab (`onNavigate('curriculum')`) where the
admin can assign a different mission to the affected slot(s) before archiving.

### `MissionManager.tsx` (edited)

Two changes:

1. `level_missions` query gained `unit_number`:
   ```ts
   supabase.from('level_missions').select('level_number, unit_number, category_slug, mission_id')
   ```

2. Archive path split:
   ```
   handleArchiveClick(mission)
     ├── collect usages from level_missions where mission_id = mission.id
     ├── usages.length > 0 → setArchiveTarget({ mission, usages }) → shows ArchiveImpactModal
     └── usages.length === 0 → useConfirmDialog → runArchive(mission.id)
   ```

3. `runArchive(missionId)` extracted as shared async helper (called by both paths).

## Decision flowchart

```
Admin clicks Archive on a mission
  │
  ├─ Has level_missions references?
  │    YES → ArchiveImpactModal
  │           ├─ Cancel       → modal closes, no change
  │           ├─ Archive Anyway → runArchive(mission.id), close modal
  │           └─ Replace Lesson → navigate to Curriculum tab
  │
  └─ No references → ConfirmDialog ("Archive and hide from learners?")
                      ├─ Cancel → no change
                      └─ Confirm → runArchive(mission.id)
```

## Design decisions

- **`unit_number` in the impact list**: the original `level_missions` query only
  fetched `level_number`. Adding `unit_number` makes the "Used In: Level X / Unit Y"
  display accurate, particularly important as Unit 2+ content is planned.
- **`runArchive()` extraction**: both code paths need the same DB mutation
  (`mission_versions` status → 'archived', `missions.active = false`). Extracting
  avoids duplicating error handling and ensures the archive + active-sync are atomic.
- **"Archive Anyway" is not blocked**: the system informs and gives choices, but does
  not prevent archiving referenced content. This is a deliberate CMS design choice —
  curriculum references can always be repaired afterwards, and blocking would create
  a worse deadlock scenario where a corrupted or wrong mission can never be archived.
