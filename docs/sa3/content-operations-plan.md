# SA-3.6 — Content Operations Architecture

## Problem

A content manager receives a folder like:

```
The-Talking-Faces/
  cover.jpg
  English/
    intro-video.mp4
    theme-song.mp3
    meet-characters.mp4
    story-intro.mp4
    pages/
      page-001.jpg ... page-020.jpg
    audio/
      audio-001.mp3 ... audio-020.mp3
    story.pdf
    sing-along.mp3
    bonus-video.mp4
  French/
    (same structure)
  Kinyarwanda/
    (same structure)
  coloring/
    color-01.png ... color-05.png
```

Today they must:
1. Create story manually
2. Switch to EN tab, upload cover
3. Upload 4 intro files one by one
4. Open FlipFlop importer, select 20 images + 20 audio files
5. Upload PDF, sing-along, bonus video one by one
6. Switch to FR tab, repeat steps 3-5
7. Switch to RW tab, repeat steps 3-5
8. Open coloring importer, select 5 templates
9. Check readiness per language
10. Publish each language

That's ~30+ manual upload actions per story.

## Solution: Story Package Import Wizard

A step-by-step wizard inside the Story Editor that accepts a batch of files organized by type, auto-detects structure, and uploads everything in one flow.

### Wizard Steps

```
Step 1: Story Details
  → Title, description, age range (auto-filled if editing existing)

Step 2: Select Language
  → Pick EN, FR, or RW (run wizard once per language)

Step 3: Drop All Files
  → Single file picker: select ALL files for this language at once
  → System auto-categorizes by filename/extension:
    - intro-video.* → Intro Video
    - theme-song.* → Theme Song  
    - meet-characters.* → Meet Characters
    - story-intro.* → Story Introduction
    - page-*.jpg/png → FlipFlop pages (sorted by number)
    - audio-*.mp3 → FlipFlop audio (matched to pages by number)
    - *.pdf → Story PDF
    - sing-along.* → Sing Along
    - bonus-video.* → Bonus Video
    - color-*.png → Coloring templates (shared, not per-language)

Step 4: Review & Confirm
  → Shows detected files in categories with checkmarks
  → Admin can reassign misdetected files
  → Shows "X files detected, Y matched"

Step 5: Upload
  → Progress bar per file
  → Overall progress: "Uploading 14/23 files..."
  → Auto-creates DB records (story_pages, story_page_versions, etc.)
  → Auto-links to story_versions and mission_versions

Step 6: Done
  → Shows readiness score for this language
  → "Upload another language" or "Go to Story Editor"
```

### File Detection Rules

| Pattern | Maps To |
|---|---|
| `intro-video.*` or `intro.*mp4` | Intro Video |
| `theme-song.*` or `theme.*mp3` | Theme Song |
| `meet-characters.*` or `meet.*mp4` | Meet Characters |
| `story-intro.*` or `intro.*` (not video) | Story Introduction |
| `page-NNN.*` or `NNN.jpg/png` (image) | FlipFlop page #NNN |
| `audio-NNN.*` or `NNN.mp3` (audio) | FlipFlop audio #NNN |
| `*.pdf` | Story PDF |
| `sing-along.*` or `sing.*mp3` | Sing Along |
| `bonus-video.*` or `bonus.*mp4` | Bonus Video |
| `color-*.*` (image) | Coloring template |

### What It Creates

Per language run:
- `story_versions` row (if not exists)
- Updates intro fields on story_versions
- `story_pages` + `story_page_versions` for FlipFlop
- `mission_versions.media_url` for PDF, Move, Sing, Video
- `coloring_pages` (shared, only on first run)

### What Already Exists

| Component | Status |
|---|---|
| `smartUpload()` | ✅ XHR progress + compression |
| `FlipFlopImporter` | ✅ Pages + audio matching |
| `ColoringImporter` | ✅ Batch template import |
| `StoryEditor` language tabs | ✅ Per-language uploads |
| `getOrCreateVersion()` | ✅ Auto-creates story_versions |
| `getOrCreateMissionVersion()` | ✅ Auto-creates mission_versions |
| Story auto-creation (slots + missions) | ✅ In StoryManager.handleCreate |

### What Needs Building

1. **StoryPackageWizard.tsx** — New component: multi-step wizard
2. **File categorizer** — `categorizeFiles(files: File[])` utility
3. **Batch uploader** — Sequential upload with overall progress
4. Integration into StoryEditor (button: "Import Package")

---

## Per-Language Readiness Validation

Already implemented in StoryEditor:
- `langReadiness` computed per active language tab
- Checks: 4 intros + 4 single missions + flipflop audio coverage
- Progress bar and publish button are per-language

No additional work needed.

---

## Publishing Workflow

Already implemented:
- `publishLang()` publishes active language's story_version + mission_versions
- Per-language publish button in StoryEditor
- Language status overview (Published / Draft / Not started)

No additional work needed.

---

## Implementation Plan

| Step | What | Effort |
|---|---|---|
| 1 | `lib/fileCategories.ts` — file detection rules | 30 min |
| 2 | `StoryPackageWizard.tsx` — 6-step wizard UI | 2 hours |
| 3 | Batch upload logic with progress | 1 hour |
| 4 | Integration button in StoryEditor | 15 min |
| 5 | Testing with real folder structure | 30 min |
| **Total** | | **~4 hours** |

---

## What NOT To Change

- Sequential story progression ✅
- Independent language progress ✅
- Existing readiness engine ✅
- Existing publishing flow ✅
- Existing language switcher ✅
