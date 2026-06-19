# BK.3.6 — Bulk Import V2 Architecture

## Overview

BK.3.6 replaces the original 12-column import pipeline with a 7-column,
editor-friendly format that guarantees no orphaned content. Every imported row always
produces entries in all three tables of the curriculum hierarchy: `missions`,
`mission_versions`, and `level_missions`. Unit support and per-row status control are
new capabilities.

## Why the old importer was insufficient

| Gap | Consequence |
|---|---|
| `level_number` was optional | `mission_versions` rows created with no `level_missions` entry — invisible to LessonManager, CoverageDashboard, PublishingCenter |
| No `unit_number` column | Unit 2+ content could not be imported |
| Status hardcoded to `draft` | Every lesson required manual review/publish after import |
| Schema-internal fields exposed (`sequence`, `type`, `stars`, `duration_minutes`) | Content editors needed DB knowledge |

## New 7-column schema

```
level | unit | category | language | title | content | status
```

All fields required. `level` and `unit` are now mandatory — the import pipeline always
writes `level_missions`, so no orphans can be created.

Fields moved server-side:
- `sequence` — `coalesce(max(sequence),0)+1` per `category_slug` at mission create time
- `type` — derived from `categories.default_type` for the slug
- `stars`, `duration_minutes` — defaults to 10/10
- `subtitle`, `tip_text`, `media_url` — set via MissionEditor post-import

## Migration 040: `admin_bulk_import_missions` rewrite

File: `supabase/migrations/040_bulk_import_v2.sql`

Same RPC signature — client call unchanged. Input rows use keys:
`level_number, unit_number, category_slug, language, title, content_json, status`.

### Pass 1 — batch validation (error → rollback all)

| Check | Error condition |
|---|---|
| `level_number` | not in `curriculum_levels` |
| `unit_number` | not a positive integer |
| `category_slug` | not in `categories` table |
| `language` | not in `('en','fr','rw')` |
| `title` | empty after trim |
| `content_json` | null, or `jsonb_typeof <> 'object'` |
| `status` | not in `('draft','review','published')` — 'archived' rejected |
| Duplicate key | `category_slug:level_number:unit_number:language` within batch |

### Pass 2 — write per row

**Step A — resolve or create mission via slot lookup:**
```sql
SELECT mission_id FROM level_missions
WHERE level_number=v_level AND unit_number=v_unit AND category_slug=v_slug;
-- if null → auto-sequence, auto-type, INSERT missions
```

**Step B — always upsert level_missions (no-orphan guarantee):**
```sql
INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
VALUES (...) ON CONFLICT DO UPDATE SET mission_id = excluded.mission_id;
```

**Step C — upsert is_current mission_version:**
- If no `is_current` version → INSERT new version
- If `is_current` exists AND new status = 'published' → demote other published sibling
  first (guards `mission_versions_one_published_idx` partial unique index)
- UPDATE title/content_json/status on found version

**Step D — sync missions.active:**
```sql
UPDATE missions SET active=(
  EXISTS(SELECT 1 FROM mission_versions WHERE mission_id=v_id AND published=true)
) WHERE id=v_id;
```

Return: `{ missions_created, level_missions_linked, versions_created, versions_updated }`

## `BulkImportManager.tsx` key changes

### Template columns
```ts
const TEMPLATE_COLUMNS = ['level', 'unit', 'category', 'language', 'title', 'content', 'status']
```

### Content skeletons
```ts
const CONTENT_SKELETON: Record<string, Record<string, unknown>> = {
  sing:  { lyrics: ['Verse 1 here', 'Verse 2 here', 'Verse 3 here'] },
  move:  { prompts: [{ emoji: '🏃', label: 'Action here' }, { emoji: '🤸', label: 'Another action' }] },
  color: { instructions: 'Drawing prompt here' },
  watch: { instructions: 'What to watch or discover' },
  read:  { text: 'Story or history text here' },
  story: { pages: [{ text: 'Page 1 text here' }, { text: 'Page 2 text here' }] },
}
```
Type-specific skeletons guide content editors on the expected JSON shape for each
category type — reducing import errors from malformed content objects.

### Level XLSX template
`handleDownloadLevelTemplate(level)` generates a 24-row XLSX (8 slugs × 3 languages)
pre-filled with the correct content skeleton per category type. Editors fill only
`title`, adjust `content`, and choose `status`.

### Validation
`validateRow(row, seen, levelNumbers: Set<number>)` — validates all 7 fields client-side
before the RPC call. `levelNumbers` is fetched at component mount from `curriculum_levels`
so the "level must exist" check mirrors the server-side Pass 1 check.

### Duplicate key
`${level_number}:${unit_number}:${category_slug}:${language}` — detected client-side
during parse and rejected with an inline row error.

## Design decisions

- **Explicit `status` per row**: avoids the post-import manual-advance workflow. Content
  imported as 'published' is immediately live (missions.active = true after Step D).
- **Server-side sequencing and typing**: keeping `sequence` and `type` out of the template
  prevents content editors from creating gaps, duplicate sequences, or type mismatches.
- **Same RPC name**: client call site in BulkImportManager is unchanged — only the JSON
  key set and the SQL body differ.
- **Validation-first (Pass 1)**: the entire batch is validated before any write, so a
  single bad row rolls back the whole import rather than leaving a partial state.
