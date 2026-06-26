# SA-3.4 — Content Studio Redesign

## Architecture Analysis

### What changes vs what stays

The 10 changes fall into 3 categories:

**A. Schema changes needed (Changes 1, 8):**
- Story Family concept requires a `story_families` table
- Media Library reuse requires an `asset_library` table

**B. New admin UI only — no schema changes (Changes 2, 3, 4, 5, 6, 7, 10):**
- Bulk importers, organizers, asset dashboard, text-optional pages — all work with existing tables
- FlipFlop pages already support image-only (text is nullable)
- Page ordering already exists via `page_number`

**C. Future-ready — design now, build later (Change 9):**
- Full story package import — architecture placeholder only

---

## Database Impact Analysis

### New Table: `story_families`

```sql
CREATE TABLE story_families (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  cover_url text,
  age_min integer,
  age_max integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

The existing `stories` table gets a new column:

```sql
ALTER TABLE stories ADD COLUMN family_id uuid REFERENCES story_families(id);
```

Each story becomes a language edition inside a family:
- `story_families` = "The Talking Faces" (the concept)
- `stories` where `family_id = X` AND `language = 'en'` = English edition
- `stories` where `family_id = X` AND `language = 'fr'` = French edition

**Migration risk: LOW** — adds a column and a table, doesn't break existing data.

### New Table: `asset_library`

```sql
CREATE TABLE asset_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('cover','intro','flipflop','coloring','pdf','video','audio','certificate','general')),
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Migration risk: LOW** — new table only, no existing data affected.

### No changes needed to:
- `story_pages` — already supports null text
- `story_page_versions` — text is already nullable
- `coloring_pages` — already has page_number for ordering
- `story_slots` / `missions` / `mission_versions` — unchanged

---

## Implementation Plan

### Phase 1 — Build now (no migrations)

These use existing tables and only add new admin UI:

**1. Bulk FlipFlop Importer** (`app/admin/FlipFlopImporter.tsx`)
- Upload ZIP → extract pages/*.jpg + audio/*.mp3
- Auto-detect page count and matching audio
- Create `story_pages` + `story_page_versions` rows in bulk
- Show progress bar during import

**2. FlipFlop Organizer** (`app/admin/FlipFlopOrganizer.tsx`)
- Visual grid of page thumbnails
- Drag-and-drop reordering (updates `page_number`)
- Audio status indicator per page (has audio / missing)
- Missing asset warnings

**3. Coloring Batch Import** (`app/admin/ColoringImporter.tsx`)
- Upload ZIP → extract *.png
- Auto-create `coloring_pages` rows with ordering
- Show import results

**4. Coloring Organizer** (`app/admin/ColoringOrganizer.tsx`)
- Thumbnail grid with drag-and-drop
- Publish/unpublish individual pages
- Bulk delete

**5. Text-Optional FlipFlop** (already supported)
- Remove required text validation from FlipFlop Books manager
- Render image + audio without text in the learner FlipFlop reader
- The `StoryContent.tsx` component already handles null text pages

**6. Asset Completeness Dashboard** (already built in SA-3.2)
- Readiness engine covers all 11 requirements
- Story Editor Tab 3 shows the full checklist

**7. Updated Content Studio Navigation**
```
Content Studio
├── FlipFlop Books (list + organizer + importer)
├── Coloring Pages (list + organizer + importer)
├── PDFs (list)
├── Videos (list)
├── Audio (list)
└── Media Library (browse + upload)
```

### Phase 2 — Requires migration

**8. Story Families**
- Migration: `story_families` table + `stories.family_id` column
- Admin UI: Family list → expand to see EN/FR/RW editions
- Readiness computed per edition AND per family
- Publishing gate: family publishes when at least one edition is ready

**9. Asset Library**
- Migration: `asset_library` table
- Admin UI: Canva-style media browser with folders, search, tags
- Asset picker in Story Editor — browse library instead of uploading new file each time
- Deduplication: same audio file reused across stories

### Phase 3 — Future

**10. Story Package Import**
- ZIP structure: cover/ + intro/ + flipflop/ + coloring/ + pdf/ + move/ + sing/ + bonus-video/
- Scanner parses folder structure and auto-populates all story assets
- V1 supports FlipFlop + Coloring only
- Architecture ready for full package support

---

## Updated CMS Navigation Map

```
📊 Overview
📚 Story Studio
   └── (stories list → editor with 5 tabs)
🎨 Content Studio
   ├── FlipFlop Books
   │   ├── Book List (per story)
   │   ├── Page Organizer (drag-and-drop grid)
   │   └── Bulk Import (ZIP upload)
   ├── Coloring Pages
   │   ├── Page List (per story)
   │   ├── Page Organizer (drag-and-drop grid)
   │   └── Batch Import (ZIP upload)
   ├── PDFs (media URL management)
   ├── Videos (media URL management)
   ├── Audio (media URL management)
   └── Media Library (Supabase Storage browser)
🏆 Weekly Challenges
🌟 Rewards
👨‍👩‍👧 Families
🌍 Community
📜 Certificates
🔔 Notifications
⚙️ Settings
```

---

## Recommendation

**Build Phase 1 immediately** — all 7 items use existing tables, no migrations needed, biggest UX win for content creators.

**Plan Phase 2 for next sprint** — Story Families and Asset Library require migrations that should be reviewed with the team before deploying.

**Phase 3 is aspirational** — full package import is a nice-to-have that builds on Phase 1 + 2.

The most impactful single change is the **Bulk FlipFlop Importer** — it eliminates the #1 pain point (creating 20+ pages manually). Combined with the **FlipFlop Organizer**, content creators can import an entire story in under 30 seconds.
