# Phase BG — Curriculum Content Management System Architecture Report

**Date:** 2026-06-14
**Scope:** Build the admin tooling required to scale curriculum content
from a handful of seeded levels (3 levels × 8 categories, ~9 distinct
missions) to a full multilingual learning program — Level Editor,
Categories overview, 4-state content workflow, and a CSV/XLSX bulk
import pipeline. No learner-facing behavior changes; no modifications to
curriculum progression logic (`get_daily_missions`,
`get_curriculum_missions`, `complete_mission`,
`complete_curriculum_mission`, `category_effective_language` all still
read `published` exactly as before — `complete_curriculum_mission`
(migration 027) is byte-for-byte unmodified).

---

## 1. Content workflow — migration 028

`mission_versions` gains a 4-state lifecycle, additive to the existing
`published` boolean:

```sql
alter table mission_versions
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'review', 'published', 'archived'));
```

A `before insert or update` trigger derives `published` from `status`:

| `status` | `published` |
|---|---|
| `draft` | `false` |
| `review` | `false` |
| `published` | `true` |
| `archived` | `false` |

```sql
create or replace function sync_mission_version_published()
returns trigger language plpgsql as $$
begin
  new.published := (new.status = 'published');
  return new;
end;
$$;

create trigger trg_sync_mission_version_published
  before insert or update on mission_versions
  for each row execute function sync_mission_version_published();
```

Existing rows are backfilled (`status = 'published'` if `published` was
true, else `'draft'`) — so every currently-live mission version keeps
`published = true` and every existing draft stays `published = false`.
"Review" and "Archived" are **new** hidden states that didn't exist
before; "Published" yields exactly the same learner-facing visibility as
the old `published = true` flag did. Every curriculum/daily-mission RPC
keys off `published` only, so none of them needed to change or were
touched.

Migration 028 also adds the admin-write RLS policy on `level_missions`
(read-only since migration 026) needed by the new Level Editor, following
the same `is_admin()`-bypass pattern as migration 013:

```sql
create policy "admin: full access" on level_missions
  for all using (is_admin()) with check (is_admin());
```

---

## 2. Bulk import RPC — migration 029

`admin_bulk_import_missions(p_rows jsonb) returns jsonb`, `security
definer`, gated by `is_admin()`.

**Input** — a JSON array of row objects:

```
category_slug, sequence, type, stars, duration_minutes,
language, title, subtitle, tip_text, media_url, content_json
```

**Two-pass, all-or-nothing** (one Postgres function = one transaction —
the first validation failure raises and rolls back the entire batch):

- **Pass 1 — validate every row:**
  - `category_slug` must exist in `categories`
  - `sequence` must be a positive integer
  - `type` ∈ `{sing, move, color, watch, read, story}`
  - `language` ∈ `{en, fr, rw}`
  - `title` non-empty
  - `content_json`, if present, must be a JSON object
  - `(category_slug, sequence, language)` must be unique **within the
    batch** (rejects duplicate rows in one file)
- **Pass 2 — find-or-create:**
  - `missions` are matched on `(category_slug, sequence)`. New missions
    are inserted with **`active = false`** — the same safe default
    `MissionManager.handleCreate` already uses, so a freshly-imported
    mission stays hidden from learners until an admin reviews it.
  - `mission_versions` are upserted on `(mission_id, language)`:
    - **new row** → inserted with `status = 'draft'` (→
      `published = false` via the migration 028 trigger)
    - **existing row** → only `title/subtitle/tip_text/media_url/
      content_json` are updated; `status`/`published` are **never
      touched**, so re-importing to fix a typo can't silently
      publish or unpublish live content.

**Returns:** `{ missions_created, versions_created, versions_updated }`.

---

## 3. Admin UI — new "Curriculum" section

A new top-level sidebar item (`GraduationCap` icon, indigo accent, table
key `'curriculum'`) opens `app/admin/CurriculumManager.tsx`, a 4-tab
shell wired into `app/admin/page.tsx` via the same `next/dynamic` +
`isCurriculumView` pattern as every other manager (Round 19+).

### 3a. Levels — `app/admin/LevelEditor.tsx`

Renders `level_missions` (joined to `missions` + their EN
`mission_versions` for display titles) as a grid: rows = levels
`1..maxLevel`, columns = `CATEGORY_ORDER` (the 8 fixed categories from
`missionMeta.ts`). Each cell shows the assigned mission's sequence # +
EN title + a `STATUS_META` badge, with a `<select>` dropdown (scoped to
missions in that category only) to reassign.

- **Add Level** — one atomic insert of 8 rows
  `(level_number = maxLevel + 1, category_slug, mission_id)`, defaulting
  every `mission_id` to **level 1's** mission for that category (mirrors
  the seeding pattern from migration 026). Admins then edit individual
  cells.
- **Delete Level** — only enabled for the current `maxLevel` (levels
  can't have gaps). Before deleting, queries
  `child_achievements` for `level-{N}-complete-%` rows so the
  confirmation dialog (`useConfirmDialog`) tells the admin how many
  children have already earned that level's completion badge, then
  deletes all 8 rows for that `level_number`.
- Cell edits are a single `update level_missions set mission_id = ...
  where level_number = ... and category_slug = ...`.
- Standard `loading` → `Skeleton`/`SkeletonTable`, `loadError` →
  retry-card, `reloadKey` pattern (Round 14+).

### 3b. Categories — `app/admin/CategoriesOverview.tsx`

A mostly-read-only table over `categories` joined to
`missions`/`mission_versions`:

| Column | Source |
|---|---|
| Category | `CATEGORY_META`/`FALLBACK_META` icon + label |
| Order | `categories.sort_order` |
| Default Type | **editable** `<select>` over `MISSION_TYPES` → `update categories set default_type = ...` |
| # Missions | `count(missions)` for that category |
| EN / FR / RW Published | `count(mission_versions where language = X and published)` |
| Incomplete Sets | missions with `< 3` `mission_versions` rows (any language) |

`slug`/`sort_order` are **not** editable — both are hardcoded into the
learner-facing 8-category `ACTIVITIES`/`CATEGORY_ORDER` lists and the
admin UI itself, so changing them here would desync the two. `default_type`
needed a new admin-write RLS policy (migration 030, below) since
`categories` was read-only since migration 012.

"Incomplete Sets" is the reporting-only implementation of validation
requirement #6 ("prevent incomplete multilingual lesson sets") — it
surfaces gaps without **blocking** anything, because migration 020's
per-category EN-fallback intentionally allows a category to ship with
only EN content while FR/RW translation catches up.

### 3c. Bulk Import — `app/admin/BulkImportManager.tsx`

New `xlsx` (SheetJS) dependency parses both `.csv` and `.xlsx`
client-side (`XLSX.read()` → `sheet_to_json()`).

- **Download CSV Template** — client-generated blob with header row
  `category_slug, sequence, type, stars, duration_minutes, language,
  title, subtitle, tip_text, media_url, content_json` plus one example
  row.
- **Choose File** → parses every row through `validateRow()` (the same
  rules as migration 029's pass 1, plus duplicate-row detection within
  the file via a `Set<string>` of `category_slug:sequence:language`
  keys) and renders a preview table: Row | Category | Seq | Type |
  Language | Title | Status, with a green "✓ OK" or a red
  per-row error message.
- A "N valid" / "N with errors" badge pair summarizes the batch; **"Import
  N valid rows"** calls `supabase.rpc('admin_bulk_import_missions', {
  p_rows: validRows })` and shows the
  `{missions_created, versions_created, versions_updated}` result (or the
  RPC's error message) as a banner.
- New missions start `active = false` and new content starts as
  **Draft** — the UI's description text says so explicitly, so admins
  know to review/publish via the Levels/Daily Adventures tabs afterward.

### 3d. Quick Links

A small panel of cards — one per `CATEGORY_ORDER` category (deep-links to
`MissionManager` via `onNavigate('mission:' + slug)`, the existing Round 5
deep-link convention) plus a "Languages & Translations" card
(`onNavigate('mission_versions')` → `LanguagesManager`). This ties all
four areas named in the original requirements — Levels, Categories,
Languages, Mission Content — into one entry point without duplicating the
existing Mission/Languages managers.

---

## 4. Multilingual content editor & workflow integration

- **`app/admin/missionMeta.ts`** — new `CONTENT_STATUSES =
  ['draft','review','published','archived']`, `ContentStatus` type,
  `STATUS_META` (label + Tailwind badge classes: gray/blue/emerald/zinc);
  `MissionVersionRow` gained `status: ContentStatus`.
- **`app/admin/MissionEditor.tsx`** — the old Draft/Published toggle is
  now a 4-state `STATUS_META`-driven selector per language. `saveMission`
  writes `status`; the migration 028 trigger derives `published`.
  `missions.active` is still derived from "any language `status ===
  'published'`" — same `anyPublished` logic as before, just keyed off
  `status` instead of `published`.
- **`app/admin/MissionManager.tsx`** — the mission list's status pill now
  shows all 4 `STATUS_META` colors instead of a flat green/amber
  published/draft badge. `handleCreate`/`handleDuplicate` set
  `status: 'draft'` for the new EN version.
- **`app/admin/LanguagesManager.tsx`** — gained a workflow-breakdown row
  (counts per `status` per language) alongside the existing
  published-coverage table.

---

## 5. Categories admin policy — migration 030

```sql
create policy "admin: full access" on categories
  for all using (is_admin()) with check (is_admin());
```

`categories` (migration 012) was read-only for authenticated users. The
new Categories tab's editable `default_type` dropdown needs admin write
access — added with the same `is_admin()`-bypass pattern as
`level_missions` (migration 028) and every other admin-write policy since
migration 013.

---

## 6. Validation rules recap

| Rule | Enforcement |
|---|---|
| Duplicate level/category combo | existing PK `(level_number, category_slug)` on `level_missions` |
| Duplicate mission/language version | existing UNIQUE `(mission_id, language)` on `mission_versions`; bulk import additionally rejects duplicate `(category_slug, sequence, language)` **within one batch** (client preview + RPC pass 1) |
| Incomplete multilingual lesson sets | **reported, not blocked** — Categories overview "Incomplete Sets" column + Languages manager workflow breakdown. Hard-blocking would conflict with migration 020's intentional EN-fallback / normal EN-first authoring flow. |

---

## 7. New/changed files

| File | Change |
|---|---|
| `supabase/migrations/028_mission_content_workflow.sql` | new — `status` column, sync trigger, backfill, `level_missions` admin policy |
| `supabase/migrations/029_admin_bulk_import_missions.sql` | new — `admin_bulk_import_missions` RPC |
| `supabase/migrations/030_categories_admin_policy.sql` | new — `categories` admin-write policy |
| `supabase/tests/curriculum_cms_test.sql` | new — 7-scenario self-cleaning suite |
| `app/admin/LevelEditor.tsx` | new — Levels tab |
| `app/admin/CategoriesOverview.tsx` | new — Categories tab |
| `app/admin/BulkImportManager.tsx` | new — Bulk Import tab |
| `app/admin/CurriculumManager.tsx` | new — 4-tab shell |
| `app/admin/missionMeta.ts` | `ContentStatus`/`CONTENT_STATUSES`/`STATUS_META`, `MissionVersionRow.status` |
| `app/admin/MissionEditor.tsx` | 4-state status selector replaces Draft/Published toggle |
| `app/admin/MissionManager.tsx` | status badge uses `STATUS_META`; create/duplicate set `status: 'draft'` |
| `app/admin/LanguagesManager.tsx` | new workflow-breakdown row |
| `app/admin/Sidebar.tsx` | new "Curriculum" nav item (`GraduationCap`, table key `curriculum`) |
| `app/admin/page.tsx` | `CurriculumManager` wired via `next/dynamic` + `isCurriculumView` |
| `package.json` | `xlsx` dependency added |

See the [verification report](./phase-bg-cms-verification.md) for test
results.
