# SA-3.5 — Story Family Architecture

## Problem

Current structure: each language edition is an independent `stories` row.

| Story | Language | ID |
|---|---|---|
| Funny Animals | EN | e13b7f64 |
| Funny Animals | FR | (would be separate row) |
| Funny Animals | RW | (would be separate row) |

At 50 stories × 3 languages = 150 rows. Publishing, readiness, and analytics become unmanageable.

## Solution

Introduce `story_families` as the primary content unit. Each family groups its language editions.

```
Story Family: "Funny Animals"
├── English Edition (stories row, family_id = X)
├── French Edition (stories row, family_id = X)
└── Kinyarwanda Edition (stories row, family_id = X)
```

---

## Schema Proposal

### New Table: `story_families`

```sql
CREATE TABLE story_families (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  description text,
  cover_url   text,
  sort_order  integer NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE story_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_read ON story_families FOR SELECT USING (true);
CREATE POLICY family_admin ON story_families FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE INDEX idx_story_families_sort ON story_families(sort_order);
CREATE INDEX idx_story_families_status ON story_families(status);
```

### Alter `stories` Table

```sql
ALTER TABLE stories ADD COLUMN family_id uuid REFERENCES story_families(id) ON DELETE SET NULL;
CREATE INDEX idx_stories_family ON stories(family_id);
```

### No changes to:
- `story_versions` — stays per-story (per-language edition)
- `story_pages` — stays per-story
- `story_slots` — stays per-story
- `missions` / `mission_versions` — unchanged
- `child_progress` / `child_achievements` — unchanged

---

## Migration Strategy

### Step 1 — Create `story_families` table

```sql
-- Migration: 049_story_families.sql
CREATE TABLE story_families ( ... );  -- as above
```

### Step 2 — Backfill existing stories

Each existing story gets its own family (1:1 for now):

```sql
INSERT INTO story_families (slug, title, description, cover_url, sort_order, status)
SELECT s.slug, s.title, s.theme_title, s.cover_url, s.sort_order, s.status
FROM stories s
ORDER BY s.sort_order;
```

### Step 3 — Link stories to families

```sql
UPDATE stories s SET family_id = (
  SELECT sf.id FROM story_families sf WHERE sf.slug = s.slug
);
```

### Step 4 — Verify

```sql
SELECT s.id, s.slug, s.family_id, sf.title as family_title
FROM stories s
LEFT JOIN story_families sf ON sf.id = s.family_id
ORDER BY s.sort_order;
```

All stories should have a `family_id`.

### Step 5 — Future: group multilingual editions

When FR/RW editions are created for the same conceptual story, they share the same `family_id`. The admin creates them from the Family Detail page, not as standalone stories.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `family_id` is NULL for existing stories | Certain | Low | Backfill in same migration |
| Existing learner RPCs break | None | None | RPCs query `stories` directly, `family_id` is additive |
| Admin views break | Low | Medium | Graceful fallback when `family_id` is null |
| Story ordering conflicts | Low | Low | Family `sort_order` takes precedence for display |

---

## Family Readiness Engine

### Per-Edition Readiness

Same as SA-3.2 `computeReadiness()` — 11 requirements per edition.

### Family Readiness

Average of all editions' readiness scores:

```typescript
function computeFamilyReadiness(editions: StoryRow[]): number {
  if (editions.length === 0) return 0;
  const sum = editions.reduce((acc, e) => acc + computeReadiness(e).score, 0);
  return Math.round(sum / editions.length);
}
```

### Family Status

| Condition | Status |
|---|---|
| All editions 100% | Ready |
| At least one edition 100% | Partial — publishable |
| No edition 100% | Missing Content |

---

## Admin UI Map

### Sidebar Update

```
📚 Story Studio
   ├── Story Families (primary entry point)
   ├── Stories (language editions — for direct access)
   ├── Story Slots
   └── Story Publishing
```

### Story Families List

Card layout per family:

```
┌─────────────────────────────────────┐
│ [Cover]  Funny Animals              │
│                                     │
│  EN ✅  FR ⚠️  RW ❌               │
│                                     │
│  Readiness: 64%                     │
│  Status: In Progress                │
│                                     │
│  [Open Family]                      │
└─────────────────────────────────────┘
```

### Family Detail Page

5 tabs:

**Tab 1 — Overview**
- Family cover, title, description
- Sort order
- Language coverage matrix (11 requirements × 3 languages)
- Overall readiness ring

**Tab 2 — English Edition**
- Opens existing Story Editor for the EN story row
- All 5 editor tabs available (Info, Activities, Readiness, Publish)

**Tab 3 — French Edition**
- Same, for FR story row
- "Create French Edition" button if it doesn't exist yet

**Tab 4 — Kinyarwanda Edition**
- Same, for RW story row
- "Create Kinyarwanda Edition" button if it doesn't exist yet

**Tab 5 — Publishing**
- Family-level publishing controls
- Per-language publishing status
- Warnings for missing content per language
- "Publish Family" button (requires at least one edition at 100%)

### Coverage Matrix (Overview Tab)

```
                    EN    FR    RW
Cover               ✅    ✅    ❌
Intro Video         ✅    ❌    ❌
Theme Song          ✅    ✅    ❌
Meet Nimi & Piko    ✅    ❌    ❌
Story Introduction  ✅    ✅    ❌
FlipFlop            ✅    ✅    ❌
Story PDF           ✅    ❌    ❌
Coloring            ✅    ✅    ✅
Move & Explore      ✅    ✅    ❌
Sing Along          ✅    ❌    ❌
Bonus Video         ✅    ✅    ❌
─────────────────────────────────
Readiness          100%   64%    9%
```

---

## Publishing Workflow

### Rules

1. A family can be published when **at least one language edition has 100% readiness**
2. Unpublishable editions show **warnings, not blocks** — "French is missing 4 assets"
3. The family `status` field reflects the overall state
4. Individual editions can be published/unpublished independently within the family

### Warning Examples

```
⚠ French Edition: Missing Intro Video, Story PDF, Sing Along, Move & Explore
⚠ Kinyarwanda Edition: Not yet created
```

These are informational. They do not block publishing the English edition.

---

## Analytics Specification

### Family-Level Metrics

| Metric | Source |
|---|---|
| Total Families | `COUNT(story_families)` |
| Published Families | `WHERE status = 'published'` |
| Languages Complete | Editions with 100% readiness |
| Languages Missing | Editions with < 100% or not created |
| Average Readiness | Mean of all edition scores |
| Top Viewed | Join with `child_progress` grouped by `family_id` |

### Dashboard Widget

```
Story Families Overview

Total: 12 families
Published: 8
Languages: 24/36 complete (67%)
Average Readiness: 78%

Needs Attention:
  Rainbow Colors — FR 45%, RW missing
  My Family — RW 0%
```

---

## Learner Impact

**None.** The learner-facing RPCs (`get_story_library`, `get_story_slots`, `complete_story_slot`) query the `stories` table directly. Adding `family_id` is additive — no existing queries break.

The learner sees stories in their language, ordered by `sort_order`. The family grouping is invisible to them.

---

## Rollout Plan

### Phase 1 — Migration (1 day)
1. Create `story_families` table
2. Backfill from existing stories
3. Add `stories.family_id` column
4. Link existing stories to families
5. Verify with SQL queries

### Phase 2 — Admin UI (2-3 days)
1. Story Families list page
2. Family Detail page with 5 tabs
3. Coverage matrix component
4. Family readiness engine
5. Update sidebar navigation

### Phase 3 — Publishing (1 day)
1. Family-level publishing controls
2. Per-language publishing warnings
3. Update Story Publishing Center to show families

### Phase 4 — Analytics (1 day)
1. Family metrics on dashboard
2. "Needs Attention" widget update
3. Family-level progress tracking

### Total Estimate: 5-6 days

---

## Files to Create (When Implementing)

```
supabase/migrations/049_story_families.sql
lib/storyFamilyReadiness.ts
components/admin/families/
  FamilyCard.tsx
  FamilyDetail.tsx
  FamilyCoverageMatrix.tsx
  FamilyReadinessSummary.tsx
  FamilyPublishingControls.tsx
  CreateEditionButton.tsx
app/admin/StoryFamiliesManager.tsx
app/admin/StoryFamilyDetail.tsx
```

---

## Decision Record

| Decision | Rationale |
|---|---|
| `family_id` is nullable | Allows gradual migration without breaking existing stories |
| Family `sort_order` separate from story `sort_order` | Families control display order; editions within a family are ordered by language |
| No changes to learner RPCs | Family grouping is admin-only; learners see individual stories |
| Coverage matrix is 11 × 3 | Same 11 readiness requirements from SA-3.2, evaluated per language |
| Family publishes when 1+ edition is ready | Matches real workflow — EN first, FR/RW follow later |
| `story_families.status` is independent | Family status reflects intent; edition statuses reflect readiness |
