# SA-3.3 — Story Publishing Center

## Overview

A central publishing hub where content managers can see the status of every story, manage language coverage, run readiness checks, and perform bulk publishing operations — all without opening individual story editors.

## Architecture

### Components (`components/admin/publishing/`)

| Component | Purpose |
|---|---|
| `PublishingStats.tsx` | 4 metric cards: Published, Ready, In Review, Missing Assets |
| `PublishingFilters.tsx` | Search + filter tabs (All/Draft/Review/Published/Retired/Ready/Missing) |
| `PublishingTable.tsx` | Main table with checkboxes, readiness rings, language badges, actions |
| `PublishingChecklistModal.tsx` | Modal showing full 11-item readiness checklist for a story |

### Main Page (`app/admin/StoryPublishingManager.tsx`)

Wires all components together with:
- Data fetching from `stories` + `story_versions` + `story_slots`
- Readiness computation via `computeReadiness()` engine
- Bulk selection state
- Publish/unpublish/retire actions
- Confirmation dialogs

## Table Columns

| Column | Content |
|---|---|
| Checkbox | Bulk selection |
| Story | Title + slug, clickable to editor |
| Readiness | Mini ring + percentage + "View checklist" link |
| Languages | EN/FR/RW badges — Complete (green), Incomplete (amber), Missing (gray) |
| Status | Readiness badge or "Published" badge |
| Actions | Preview (eye) + Publish/Unpublish button |

## Language Coverage

For each story, 3 language indicators:
- **Complete** (green ✅): `story_versions` row exists with `published = true`
- **Incomplete** (amber ⚠): version exists but not published
- **Missing** (gray ✕): no version for that language

## Publishing Rules

A story can be published only when:
1. Readiness = 100% (all 11 requirements met)
2. At least one language version is published

The Publish button is disabled (grayed out with tooltip) when either condition fails.

## Bulk Operations

When stories are selected via checkboxes:
- **Publish Selected** — publishes only stories meeting both rules above, skips others
- **Unpublish Selected** — moves all to draft status, clears `published_at`
- **Retire Selected** — sets status to "retired"

All bulk actions require confirmation dialog.

## Filters

| Filter | Shows |
|---|---|
| All Stories | Everything |
| Draft | `status = 'draft'` |
| Review | `status = 'review'` |
| Published | `status = 'published'` |
| Retired | `status = 'retired'` |
| Ready To Publish | readiness = 100% AND not published |
| Missing Assets | readiness < 100% |

## Future Ready

The `stories` table already has `published_at` (timestamptz). The architecture supports adding `scheduled_publish_at` column and a cron-based publishing job without structural changes. The publishing gate and bulk operations already set/clear `published_at`.

## Files

```
components/admin/publishing/
  PublishingStats.tsx          — 4 metric cards
  PublishingFilters.tsx        — Search + filter tabs
  PublishingTable.tsx          — Main table with selection, readiness, language badges
  PublishingChecklistModal.tsx — Full checklist modal
app/admin/StoryPublishingManager.tsx — Main publishing center page
docs/sa3/story-publishing-center.md — This documentation
```

## No Database Changes

Uses existing tables and the `computeReadiness()` engine from SA-3.2. No migrations needed.
