# SA-3.7 — Visual Content Organizers

## Overview

Drag-and-drop visual organizers for FlipFlop Books and Coloring Pages. These replace table-based editing as the primary content management experience after bulk import.

---

## FlipFlop Organizer

### Access Path

```
Admin → Content Studio → FlipFlop Books → [Story] → Organizer
```

### Layout

Responsive grid of page cards. Desktop: 4-6 columns. Tablet: 3 columns. Mobile: 2 columns.

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 📄 1 │ │ 📄 2 │ │ 📄 3 │ │ 📄 4 │ │ 📄 5 │
│ [img] │ │ [img] │ │ [img] │ │ [img] │ │ [img] │
│ 🔊 ✅ │ │ 🔊 ✅ │ │ 🔊 ✅ │ │ 🔊 ⚠️ │ │ 🔊 ✅ │
│ Pub   │ │ Pub   │ │ Draft │ │ Draft │ │ Pub   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

### Page Card Anatomy

```
┌─────────────────────┐
│ ☐  Page 3      🟢   │  ← Checkbox + number + status dot
│                     │
│   [Image Preview]   │  ← Thumbnail (aspect 3:4)
│                     │
│ 🔊 Audio: ✅ Ready  │  ← Audio status
│ 📝 Text: Optional   │  ← Text status (not required)
│ EN | Published      │  ← Language + publish state
│                     │
│ [▶ Play] [⋮ More]  │  ← Actions
└─────────────────────┘
```

### Visual Status Indicators

| Color | Meaning | Condition |
|---|---|---|
| 🟢 Green | Complete | Image + audio both present |
| 🟡 Yellow | Partial | Image present, audio missing |
| 🔴 Red | Broken | Image missing |
| ⚪ Gray | Draft | Exists but unpublished |

### Drag-and-Drop

**Behavior:**
1. Admin grabs any page card
2. Drags it to a new position in the grid
3. Drop zone highlights between cards
4. On drop, all `page_number` values update automatically
5. No manual numbering — system handles sequential assignment

**Implementation approach:**
- Use `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, React-native)
- `SortableContext` wraps the grid
- `useSortable` hook on each card
- On drag end: compute new order, batch-update `page_number` via Supabase

```typescript
// On drag end
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  
  const oldIndex = pages.findIndex(p => p.id === active.id);
  const newIndex = pages.findIndex(p => p.id === over.id);
  const reordered = arrayMove(pages, oldIndex, newIndex);
  
  // Update page_number for all affected pages
  const updates = reordered.map((p, i) => ({
    id: p.id,
    page_number: i + 1,
  }));
  
  // Batch update
  for (const u of updates) {
    await supabase.from('story_pages')
      .update({ page_number: u.page_number })
      .eq('id', u.id);
  }
};
```

### Multi-Select

**Selection:**
- Checkbox on each card
- "Select All" checkbox in toolbar
- Shift+click for range selection

**Bulk Actions (appear in toolbar when selection > 0):**

| Action | Behavior |
|---|---|
| Publish | Set selected page versions to published |
| Unpublish | Set selected to draft |
| Delete | Remove pages + versions (with confirmation) |
| Replace Audio | Opens file picker, maps files to selected pages by order |

### Audio Manager

Click the audio area on any page card:

```
┌─────────────────────────┐
│ Page 4 — Audio          │
│                         │
│ ▶ [====●=========] 1:23 │  ← Preview player
│                         │
│ [Replace] [Remove]      │  ← Actions
│ [Upload New]            │
└─────────────────────────┘
```

- **Preview**: inline `<audio>` player with play/pause, progress, duration
- **Replace**: file picker → uploads new audio → updates `audio_url`
- **Remove**: clears `audio_url`
- **Upload New**: same as Replace for pages without audio

### Language Switcher

Top bar toggle:

```
[🇬🇧 English] [🇫🇷 French] [🇷🇼 Kinyarwanda]
```

Switching language:
- Reloads `story_page_versions` for selected language
- Updates audio status per page
- Updates text content (if shown)
- Updates publish status per language
- Grid layout stays the same (same pages, different versions)

### Filters

Toolbar filter pills:

```
[All] [Complete] [Missing Audio] [Missing Image] [Draft] [Published]
```

| Filter | Shows |
|---|---|
| All | Every page |
| Complete | Image + audio present |
| Missing Audio | Image present, no audio |
| Missing Image | No image_url |
| Draft | Version not published |
| Published | Version published |

---

## Coloring Organizer

### Access Path

```
Admin → Content Studio → Coloring Pages → [Story] → Organizer
```

### Layout

Same responsive grid as FlipFlop but simpler cards (no audio).

```
┌──────┐ ┌──────┐ ┌──────┐
│ 🎨 1 │ │ 🎨 2 │ │ 🎨 3 │
│ [img] │ │ [img] │ │ [img] │
│ Pub   │ │ Draft │ │ Pub   │
└──────┘ └──────┘ └──────┘
```

### Coloring Card Anatomy

```
┌─────────────────────┐
│ ☐  Page 2      🟢   │
│                     │
│   [Template Image]  │  ← Coloring template preview
│                     │
│ Published           │
│                     │
│ [Preview] [⋮ More]  │
└─────────────────────┘
```

### Features

Same as FlipFlop Organizer minus audio:
- Drag-and-drop reordering
- Multi-select + bulk actions (publish, unpublish, delete)
- Filter by status

### Quick Preview Modal

Click any thumbnail to open:

```
┌───────────────────────────────┐
│              ✕                │
│                               │
│   [Full-size coloring page]   │
│                               │
│   ◀  Page 2 of 8  ▶         │
│                               │
│   [🔍 Zoom] [Download]       │
└───────────────────────────────┘
```

- Left/right navigation
- Zoom to see detail
- Download original file
- Keyboard: arrow keys for navigation, Escape to close

---

## Content Health Sidebar

Fixed right sidebar in organizer view (collapsible on mobile):

```
┌─────────────────────┐
│ Story Health        │
│                     │
│ Talking Faces (EN)  │
│                     │
│ Pages:        21    │
│ Audio:     19 / 21  │
│ Coverage:     90%   │
│                     │
│ ⚠ Missing Audio:   │
│   Page 17           │
│   Page 18           │
│                     │
│ Published:    18    │
│ Draft:         3    │
│                     │
│ ████████████░░ 90%  │
│                     │
│ [Run Validator]     │
│ [Publish All]       │
└─────────────────────┘
```

Updates live as admin makes changes. "Run Validator" triggers SA-3.6 deep validation.

---

## Publishing Guard

When admin clicks "Publish All" or bulk-publishes:

**If validator passes:**
```
✅ All 21 pages validated
   21 images ✓
   21 audio files ✓
   Sequential ordering ✓

[Publish]
```

**If validator has warnings:**
```
⚠ 2 issues found

   Missing audio: pages 17, 18
   
   19/21 pages fully complete (90%)

[Cancel] [Publish Anyway]
```

**If validator has failures:**
```
✗ Cannot publish

   3 pages have no image
   Page ordering has gaps (missing page 7)
   
   Fix these issues before publishing.

[Go to Page 7]
```

---

## Dashboard Integration

New widgets for the admin Overview:

### Recent Content Changes

```
Recent Changes

📄 Talking Faces: 5 pages updated (2 min ago)
🎨 Funny Animals: 3 coloring pages added (1 hr ago)
🔊 Rainbow Colors: Audio uploaded for pages 1-15 (3 hrs ago)
```

### Needs Attention Queue

```
Needs Attention

⚠ Talking Faces (FR) — 2 pages missing audio
⚠ My Family (EN) — No coloring pages
⚠ Rainbow Colors (RW) — Edition not created
```

Clickable items navigate directly to the affected organizer/editor.

---

## Component Architecture (When Implementing)

```
components/admin/organizer/
  PageCard.tsx              — Individual page card (FlipFlop or Coloring)
  PageGrid.tsx              — Sortable grid container
  AudioManager.tsx          — Inline audio preview/replace/upload
  LanguageSwitcher.tsx      — EN/FR/RW toggle bar
  ContentFilters.tsx        — Filter pills
  BulkActionBar.tsx         — Toolbar when items selected
  ContentHealthSidebar.tsx  — Live stats sidebar
  PreviewModal.tsx          — Full-size image preview with navigation
  PublishGuard.tsx          — Pre-publish validation dialog

app/admin/
  FlipFlopOrganizer.tsx     — Full organizer page for FlipFlop
  ColoringOrganizer.tsx     — Full organizer page for Coloring
```

### Dependencies

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop
- `@dnd-kit/utilities` — `arrayMove` helper

### Installation (when building)

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## UX Flow Diagrams

### FlipFlop Import → Organize → Publish

```
[Bulk Import ZIP]
       ↓
[Auto-detect pages + audio]
       ↓
[Create pages in database]
       ↓
[Open Organizer] ← land here after import
       ↓
[Review grid — check status dots]
       ↓
[Drag to reorder if needed]
       ↓
[Fix missing audio — click yellow cards]
       ↓
[Select All → Publish]
       ↓
[Publishing Guard validates]
       ↓
[Confirm → Published ✅]
```

### Coloring Batch Import → Organize → Publish

```
[Batch Import images]
       ↓
[Auto-create coloring pages]
       ↓
[Open Organizer]
       ↓
[Preview each page — click thumbnails]
       ↓
[Drag to reorder]
       ↓
[Remove bad pages — multi-select + delete]
       ↓
[Publish All]
       ↓
[Done ✅]
```

---

## Implementation Estimate

| Component | Effort |
|---|---|
| DnD library setup + PageGrid | 0.5 day |
| PageCard (FlipFlop variant) | 0.5 day |
| PageCard (Coloring variant) | 0.25 day |
| AudioManager | 0.5 day |
| LanguageSwitcher | 0.25 day |
| BulkActionBar | 0.5 day |
| ContentHealthSidebar | 0.5 day |
| PreviewModal | 0.25 day |
| PublishGuard | 0.25 day |
| FlipFlopOrganizer page | 0.5 day |
| ColoringOrganizer page | 0.25 day |
| Dashboard widgets | 0.5 day |
| Testing | 1 day |
| **Total** | **5.75 days** |

---

## Dependencies on Previous SAs

| SA | Dependency |
|---|---|
| SA-3.2 | Readiness engine (quick status indicators) |
| SA-3.4 | Bulk importers (organizer opens after import) |
| SA-3.6 | Validator (publishing guard) |
| SA-3.5 | Story Families (family-aware organizer — Phase 2) |

No database changes required. Uses existing `story_pages`, `story_page_versions`, `coloring_pages` tables.
