# SA-3.6 — Story Package Validator

## Overview

The validator is the final publishing checkpoint. It prevents incomplete stories from going live by running deep content validation beyond the basic 11-item readiness check from SA-3.2.

The key difference from SA-3.2:
- **SA-3.2 Readiness** = "Does this asset exist?" (binary yes/no)
- **SA-3.6 Validator** = "Is this asset complete and correct?" (deep inspection)

---

## Validation Levels

### Level 1 — Edition Validation

Validates a single language edition (e.g., "Funny Animals EN").

Checks every asset category in depth, produces a detailed report with specific issues.

### Level 2 — Family Validation

Validates all editions within a Story Family, produces a consolidated matrix showing coverage across EN/FR/RW.

---

## Validation Engine

### Architecture

```typescript
// lib/storyValidator.ts

interface ValidationItem {
  category: string;          // "metadata" | "intro" | "flipflop" | etc.
  key: string;               // unique identifier
  label: string;             // human-readable label
  status: "pass" | "warn" | "fail";
  message?: string;          // detail for warnings/failures
  weight: number;            // contribution to total score (sums to 100)
}

interface ValidationReport {
  items: ValidationItem[];
  score: number;             // 0-100 weighted
  status: "ready" | "partial" | "not_ready";
  passCount: number;
  warnCount: number;
  failCount: number;
}

function validateStoryEdition(story, pages, slots, missionVersions): ValidationReport
function validateStoryFamily(editions: ValidationReport[]): FamilyValidationReport
```

### Category Weights

| Category | Weight | What it checks |
|---|---|---|
| Metadata | 10% | Cover image, title, description, age range |
| Intro Experience | 20% | 4 intro items (video, song, characters, intro) |
| FlipFlop | 25% | Page count, audio coverage, ordering integrity |
| PDF | 10% | PDF uploaded, URL valid |
| Coloring | 10% | At least 1 page, ordering integrity |
| Move & Explore | 10% | Published mission content exists |
| Sing Along | 5% | Audio exists, lyrics/content exists |
| Bonus Video | 10% | Video URL exists |
| **Total** | **100%** | |

### Scoring Formula

```
score = Σ (item.weight × (item.status === "pass" ? 1 : item.status === "warn" ? 0.5 : 0))
```

Warnings contribute half weight. Failures contribute zero.

---

## Validation Rules Per Category

### 1. Story Metadata (10%)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Cover Image | URL exists and is non-empty | — | Missing |
| Title | Non-empty, > 3 characters | — | Missing or too short |
| Description | Non-empty | Empty but title exists | Missing |
| Age Range | Both min and max set | Only one set | Neither set |

### 2. Intro Experience (20%)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Intro Video | URL exists | — | Missing |
| Theme Song | URL exists | — | Missing |
| Meet Nimi & Piko | URL exists | — | Missing |
| Story Introduction | URL exists | — | Missing |

Each intro item = 5% weight.

### 3. FlipFlop (25%)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Page count | ≥ 4 pages | 1-3 pages | 0 pages |
| Audio coverage | All pages have audio | > 50% have audio | < 50% or none |
| Page ordering | Sequential, no gaps | — | Gaps or duplicates |
| Page images | All pages have images | > 80% have images | < 80% or none |

Specific warnings:
- "Missing audio: pages 17, 18"
- "Page 5 has no image"
- "Gap in ordering: pages 1-4, 6-10 (missing page 5)"

### 4. PDF Mission (10%)

| Check | Pass | Fail |
|---|---|---|
| Mission version exists | Published version found | No published version |
| Media URL | Non-empty URL | Missing URL |

### 5. Coloring Mission (10%)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Page count | ≥ 1 coloring page | — | 0 pages |
| Page images | All pages have template_image_url | Some missing | None have images |
| Ordering | Sequential | — | Gaps |

### 6. Move & Explore (10%)

| Check | Pass | Fail |
|---|---|---|
| Mission version | Published version exists | No published version |
| Content | Has media_url OR content_json prompts | No content at all |

### 7. Sing Along (5%)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Mission version | Published version exists | — | Missing |
| Audio | media_url exists | — | Missing |
| Lyrics | content_json has lyrics array | No lyrics but audio exists | No audio and no lyrics |

### 8. Bonus Video (10%)

| Check | Pass | Fail |
|---|---|---|
| Mission version | Published version exists | Missing |
| Video URL | media_url exists | Missing |

---

## Readiness Status Thresholds

| Score | Status | Publishing |
|---|---|---|
| 100% | READY | Publish immediately |
| 80–99% | PARTIAL | Publish with warning modal |
| < 80% | NOT READY | Publish blocked |

### Publishing Modal (PARTIAL status)

```
⚠ Story has incomplete content

Missing or incomplete items:
• FlipFlop: Missing audio for pages 17, 18
• Bonus Video: No video uploaded

Score: 90%

[Cancel] [Publish Anyway]
```

### Publishing Block (NOT READY status)

```
✗ Story cannot be published

Required items missing:
• Cover Image not uploaded
• FlipFlop: 0 pages
• PDF: No content
• Coloring: No pages

Score: 35%

Complete the missing items before publishing.

[Go to Editor]
```

---

## Family Validation Matrix

### Data Structure

```typescript
interface FamilyValidationReport {
  familyTitle: string;
  editions: {
    language: string;
    report: ValidationReport;
  }[];
  matrix: {
    category: string;
    en: "pass" | "warn" | "fail" | "missing";
    fr: "pass" | "warn" | "fail" | "missing";
    rw: "pass" | "warn" | "fail" | "missing";
  }[];
  overallScore: number;
}
```

### Matrix Display

```
Funny Animals Family

                    EN      FR      RW
Metadata            ✅      ✅      ❌
Intro Video         ✅      ✅      ✅
Theme Song          ✅      ✅      ✅
Meet Characters     ✅      ✅      ✅
Story Intro         ✅      ✅      ✅
FlipFlop            ✅      ✅      ⚠️ (missing audio 17,18)
PDF                 ✅      ✅      ✅
Coloring            ✅      ✅      ✅
Move                ✅      ✅      ✅
Sing                ✅      ✅      ✅
Bonus Video         ✅      ❌      ✅

Score              100%     91%    82%
Status            READY  PARTIAL  PARTIAL
```

Legend:
- ✅ = Pass
- ⚠️ = Warning (partial, details available)
- ❌ = Fail (missing or broken)
- ➖ = Edition not created

---

## Dashboard Integration

### Content Health Card

```
Content Health

🟢 Ready        8 stories
🟡 Partial      4 stories
🔴 Blocked      2 stories

Average Readiness: 84%

Needs Attention:
  Rainbow Colors (FR) — 45%
  My Family (RW) — not created
```

---

## Import Integration

After FlipFlop Bulk Import completes, the validator runs automatically:

```
Import Complete ✅

21 pages detected
21 audio files detected

Validation:
✅ Page ordering: sequential 1-21
✅ All pages have images
✅ All pages have matching audio
✅ FlipFlop readiness: 100%
```

Or with issues:

```
Import Complete ✅

21 pages detected
19 audio files detected

Validation:
✅ Page ordering: sequential 1-21
✅ All pages have images
⚠ Missing audio: pages 17, 18
⚠ FlipFlop readiness: 90%

[Fix Missing Audio]
```

---

## UI Components (When Implementing)

```
lib/storyValidator.ts                              — Validation engine
components/admin/validator/
  ValidationReport.tsx                              — Full report view
  ValidationMatrix.tsx                              — Family matrix
  ValidationBadge.tsx                               — Pass/Warn/Fail badge
  ValidationPublishModal.tsx                        — Warning modal for PARTIAL
  ValidationBlockMessage.tsx                        — Block message for NOT READY
  ContentHealthCard.tsx                             — Dashboard widget
```

### Story Editor Integration

New tab added to Story Editor:

```
Story Information | Adventure Activities | Readiness | Validation Report | Publish
```

The Validation Report tab shows the full detailed report with expandable categories.

---

## Relationship to SA-3.2 Readiness

| Feature | SA-3.2 Readiness | SA-3.6 Validator |
|---|---|---|
| Granularity | Binary (exists/missing) | Deep (pass/warn/fail with details) |
| Scope | 11 items, equal weight | 8 categories, weighted |
| FlipFlop depth | "Has pages" yes/no | Page count, audio coverage, ordering, gaps |
| Publishing gate | Blocks at < 100% | Blocks at < 80%, warns at 80-99% |
| Family support | Per-edition only | Full family matrix |
| Messages | "Completed" / "Missing" | Specific issues: "Missing audio pages 17, 18" |
| Where used | Editor Tab 3 (quick check) | Editor Tab 4 (detailed report) |

SA-3.2 remains as the quick-glance indicator. SA-3.6 is the detailed pre-publish audit.

---

## Implementation Estimate

| Component | Effort |
|---|---|
| `storyValidator.ts` engine | 1 day |
| Validation Report UI | 1 day |
| Family Matrix UI | 0.5 day |
| Publishing modal integration | 0.5 day |
| Dashboard Content Health card | 0.5 day |
| Import integration | 0.5 day |
| Testing | 1 day |
| **Total** | **5 days** |

---

## Dependencies

- SA-3.2 (Readiness Engine) — coexists, not replaced
- SA-3.3 (Publishing Center) — validator feeds into publishing decisions
- SA-3.4 (Content Studio) — import integration
- SA-3.5 (Story Families) — family validation matrix (Phase 2)

No database changes required. The validator reads existing tables only.
