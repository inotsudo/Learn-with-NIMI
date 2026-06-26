# SA-3.2 — Story Readiness Engine & Preview Mode

## Overview

The Story Readiness Engine ensures no story can be published unless all 11 required assets and activities are present. It provides real-time readiness scoring, visual feedback, and a publishing gate.

## Architecture

### Readiness Utility (`lib/storyReadiness.ts`)

Pure function `computeReadiness(story)` evaluates a story against 11 requirements:

**Story Assets (5):**
1. Cover Image
2. Intro Video
3. Theme Song
4. Meet Nimi & Piko
5. Story Introduction

**Adventure Activities (6):**
6. FlipFlop Audio Book
7. Story PDF
8. Coloring Activity
9. Move & Explore
10. Sing Along
11. Bonus Video

**Formula:** `completedRequirements / 11 * 100`

**Status Thresholds:**
| Score | Status | Color |
|-------|--------|-------|
| 0–49% | Draft | Gray |
| 50–89% | In Progress | Amber |
| 90–99% | Nearly Ready | Blue |
| 100% | Ready To Publish | Green |

### Components (`components/admin/story-readiness/`)

- **ReadinessRing** — SVG donut chart, color-coded by score
- **ReadinessBadge** — status pill with color
- **ReadinessChecklist** — grouped checklist (assets + activities)
- **StoryReadinessCard** — full card combining ring + checklist + badge
- **PreviewBanner** — fixed top banner for preview mode

## Publishing Gate

In the Story Editor's Publish Settings tab:
- If readiness < 100%, the "Published" status option is disabled
- A warning banner shows: "Complete all X remaining requirements before publishing"
- The publish button only enables at 100%

## Preview Mode

### How it works:
1. Admin clicks "Preview Story" in the Story Editor
2. Opens `/stories/{slug}?preview=true` in a new tab
3. A fixed amber banner appears: "Preview Mode — Viewing as Child — Read-only"
4. Admin sees the exact learner UI (story detail, missions, certificate)
5. Mission completion in preview mode does NOT write to the database
6. Preview returns mock data: `{ stars_earned: 10, story_complete: false }`

### What preview blocks:
- No `child_progress` rows created
- No `child_achievements` rows created
- No stars awarded
- No certificates generated
- No story unlocks
- No notifications sent

## Dashboard Integration

The Overview dashboard includes a "Story Readiness Overview" widget:
- Average readiness score as a ring chart
- Ready / In Progress / Missing counts
- "Needs Attention" section showing top 5 lowest-readiness stories
- Each story links to its editor

## Files

```
lib/storyReadiness.ts                          — Readiness computation engine
components/admin/story-readiness/
  ReadinessRing.tsx                             — SVG donut chart
  ReadinessBadge.tsx                            — Status pill
  ReadinessChecklist.tsx                        — Grouped checklist
  StoryReadinessCard.tsx                        — Full readiness card
  PreviewBanner.tsx                             — Preview mode banner + hook
app/admin/StoryEditor.tsx                      — Tab 3 (Readiness) + Tab 4 (Publish gate)
app/admin/DashboardHome.tsx                    — Readiness overview widget
app/stories/[slug]/page.tsx                    — Preview banner integration
app/stories/[slug]/mission/[slot]/page.tsx     — Preview mode data write blocking
```

## No Database Changes

This feature is entirely client-side. No migrations, no new tables, no schema changes.
