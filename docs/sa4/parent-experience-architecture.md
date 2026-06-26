# SA-4.0 — Parent Experience Architecture

## Overview

The Parent Portal is where parents monitor progress, manage children, approve sharing, and track growth. It must feel like a modern educational dashboard — warm, informative, and mobile-first.

Parents think in terms of: "How is my child doing?" — not databases, missions, or RPCs.

---

## Route Map

```
/parents                          → Parent Dashboard (home)
/parents/child/[childId]          → Child Detail View
/parents/personalization          → Personalized Story Center
/parents/community                → Community Approval Center
/parents/certificates             → Certificates Gallery
/parents/activity                 → Family Activity Feed
/parents/settings                 → Parent Account Settings
```

All routes are authenticated. Parent sees only their own children's data via RLS (`is_my_child()` helper).

---

## Parent Dashboard (`/parents`)

### Welcome Header

```
┌──────────────────────────────────────────────┐
│ Good evening, Sarah! 👋                      │
│ Here's how your children are doing today.    │
│                                              │
│ [Annie ▾]  ← Active child selector           │
└──────────────────────────────────────────────┘
```

Data source: `parents.name`, `children` (filtered by `parent_id`)

### Quick Stats Row

4 cards, horizontally scrollable on mobile:

| Card | Value | Source |
|---|---|---|
| Stories Completed | 2/5 | `child_progress` grouped by story completion |
| Certificates | 2 | `child_achievements WHERE type = 'certificate'` |
| Stars Earned | 150 | `SUM(child_progress.stars_earned)` |
| Day Streak | 5 days | `getActivityDates()` → `computeStreaks()` |

### Child Progress Card

```
┌──────────────────────────────────────────────┐
│ 📖 Current Story                             │
│                                              │
│ Funny Animals                                │
│ ████████████░░░░ 4/6 missions                │
│                                              │
│ Current Mission: Coloring Activity           │
│                                              │
│ Stories Completed: 1                          │
│ Certificates: 1                              │
│ Challenge Stars: 50                           │
└──────────────────────────────────────────────┘
```

Data source: `get_story_library()` → current story, `get_story_slots()` → mission progress

### Weekly Challenge Card

```
┌──────────────────────────────────────────────┐
│ 🏆 This Week's Challenge                    │
│                                              │
│ Make Someone Smile Today!                    │
│ Status: ✅ Completed                         │
│ Reward: ⭐ +50 Stars                        │
│                                              │
│ Challenge History ›                           │
└──────────────────────────────────────────────┘
```

Data source: `weekly_challenges` + `weekly_challenge_progress`

### Recent Certificates

```
┌──────────────────────────────────────────────┐
│ 📜 Recent Certificates                       │
│                                              │
│ [cert] Funny Animals    Jun 20    [↓] [📤]  │
│ [cert] Talking Faces    Jun 15    [↓] [📤]  │
│                                              │
│ View All Certificates ›                       │
└──────────────────────────────────────────────┘
```

Actions: Download (generates PDF), Share to Community (opens parent gate)

Data source: `child_achievements WHERE type = 'certificate'`

### Achievement Showcase

```
┌──────────────────────────────────────────────┐
│ 🏅 Achievements                              │
│                                              │
│ [⭐] Story Explorer  [💜] Kind Heart         │
│ [💧] Healthy Hero    [🔒] Rainbow Star       │
│                                              │
│ Streak: 🔥 5 days                            │
│ View All ›                                    │
└──────────────────────────────────────────────┘
```

Data source: `child_achievements WHERE type = 'badge'`

### Learning Journey Timeline

```
┌──────────────────────────────────────────────┐
│ 📅 Learning Journey                          │
│                                              │
│ Today                                        │
│ ● Completed Coloring Activity     2:30 PM    │
│ ● Started Move & Explore          1:45 PM    │
│                                              │
│ Yesterday                                    │
│ ● Earned Story Certificate        4:00 PM    │
│ ● Completed Funny Animals         3:50 PM    │
│ ● Unlocked Rainbow Colors         3:50 PM    │
│                                              │
│ View Full History ›                           │
└──────────────────────────────────────────────┘
```

Data source: `child_progress` + `child_achievements` ordered by timestamp, merged and grouped by day

---

## Child Detail View (`/parents/child/[childId]`)

Expanded view of a single child with all their data.

### Tabs

1. **Overview** — same as dashboard cards but expanded
2. **Stories** — all stories with progress bars, completion dates
3. **Achievements** — full badge and certificate gallery
4. **Activity** — complete timeline with filters (date range, mission type)
5. **Settings** — edit name, avatar, age, language

### Stories Tab

```
┌──────────────────────────────────────────────┐
│ Story 1: Funny Animals                       │
│ ████████████████████ 6/6 ✅ Complete         │
│ Certificate earned: Jun 20                    │
│                                              │
│ Story 2: Rainbow Colors                      │
│ ████████░░░░░░░░░░░ 3/6 In Progress         │
│ Current: Move & Explore                       │
│                                              │
│ Story 3: My Family                           │
│ 🔒 Locked                                    │
└──────────────────────────────────────────────┘
```

---

## Personalized Story Center (`/parents/personalization`)

### How It Works

1. Parent sees list of available stories
2. Clicks "Personalize" on a story
3. Enters/confirms child's name
4. Sees live preview of personalized title and certificate
5. Clicks "Apply" — stores preference (uses existing `personalize()` from SA-2.3)

### UI

```
┌──────────────────────────────────────────────┐
│ ✨ Personalize Stories                        │
│                                              │
│ Funny Animals                                │
│ Personalized: "Annie's Funny Animals         │
│                Adventure"                     │
│ [Preview] [Change Name]                       │
│                                              │
│ Rainbow Colors                               │
│ Not personalized yet                          │
│ [Personalize]                                 │
└──────────────────────────────────────────────┘
```

### Preview

```
┌──────────────────────────────────────────────┐
│ Certificate Preview                           │
│                                              │
│ ┌──────────────────────────────┐             │
│ │ 🏆 Story Certificate         │             │
│ │ Awarded to: Annie            │             │
│ │ Story: Funny Animals         │             │
│ │ Signed: Nimi 💜 Piko 💜      │             │
│ └──────────────────────────────┘             │
│                                              │
│ [Apply Personalization]                       │
└──────────────────────────────────────────────┘
```

No new database tables needed — uses existing `children.name` for token replacement at render time.

---

## Community Approval Center (`/parents/community`)

### Layout

```
┌──────────────────────────────────────────────┐
│ 🌍 Community Sharing                         │
│                                              │
│ Tabs: [Pending] [Approved] [All]             │
│                                              │
│ ┌──────────────────────────────┐             │
│ │ 🏆 Challenge Badge           │             │
│ │ Annie completed "Make        │             │
│ │ Someone Smile"               │             │
│ │ [✅ Approve] [❌ Reject]     │             │
│ └──────────────────────────────┘             │
│                                              │
│ ┌──────────────────────────────┐             │
│ │ 📜 Story Certificate         │             │
│ │ Annie earned Funny Animals   │             │
│ │ certificate                  │             │
│ │ [✅ Approve] [❌ Reject]     │             │
│ └──────────────────────────────┘             │
└──────────────────────────────────────────────┘
```

Data source: `creations WHERE parent_id = auth.uid()` filtered by status

### Actions

| Action | Effect |
|---|---|
| Approve | Sets `creations.status = 'approved'`, `is_public = true` |
| Reject | Sets `creations.status = 'rejected'`, `is_public = false` |
| Delete | Removes the creation row |

Parent gate is already enforced — only parent can see their children's creations.

---

## Family Activity Feed (`/parents/activity`)

### Filters

- Date range: Today / This Week / This Month / Custom
- Child: All children / specific child
- Type: All / Stories / Missions / Certificates / Challenges

### Events

| Event Type | Source | Display |
|---|---|---|
| Story Started | First `child_progress` for a story | "Annie started Funny Animals" |
| Mission Completed | `child_progress` row created | "Annie completed FlipFlop Audio" |
| Certificate Earned | `child_achievements` type=certificate | "Annie earned Funny Animals certificate 🏆" |
| Challenge Completed | `weekly_challenge_progress` | "Annie completed Make Someone Smile ⭐" |
| Story Unlocked | Derived from completion + sort_order | "Rainbow Colors unlocked! 🔓" |
| Badge Earned | `child_achievements` type=badge | "Annie earned Story Explorer badge 🏅" |

### Grouping

Events grouped by day with relative headers:

```
Today
  ● Event 1 — 2:30 PM
  ● Event 2 — 1:45 PM

Yesterday
  ● Event 3 — 4:00 PM

June 18
  ● Event 4 — 3:00 PM
```

---

## Parent Notifications

### Types

| Notification | Trigger | Message |
|---|---|---|
| Certificate Earned | `child_achievements` insert, type=certificate | "Annie earned a Story Certificate! 🏆" |
| Challenge Completed | `weekly_challenge_progress` insert | "Annie completed this week's challenge! ⭐" |
| Story Unlocked | Story completion triggers next unlock | "A new story is available: Rainbow Colors! 📚" |
| New Story Released | Admin publishes new story | "New story available: The Kindness Quest! 🆕" |
| Weekly Challenge | Admin creates new challenge | "New weekly challenge: Help a Friend! 🏆" |

### Delivery

- In-app: `notifications` table → bell icon panel (already built in SA-3.2)
- Push: `push_subscriptions` + SW handler (already built)
- Both created simultaneously when event fires

---

## Insights Dashboard

### Metrics

| Metric | Calculation |
|---|---|
| Stories Completed | Count distinct completed stories |
| Languages Used | Distinct `child_progress.language` values |
| Most Played Story | Story with most `child_progress` rows |
| Avg Completion Rate | Mean of all story progress percentages |
| Challenge Participation | Challenges attempted / total challenges |
| Learning Streak | `computeStreaks()` from activity dates |
| Weekly Active Days | Days with at least one `child_progress` this week |
| Total Stars | `SUM(child_progress.stars_earned)` |

### Display

```
┌──────────────────────────────────────────────┐
│ 📊 Learning Insights                         │
│                                              │
│ Stories: 2/5 completed                        │
│ Languages: EN, FR                             │
│ Favorite: Funny Animals (played 12 times)     │
│ Completion Rate: 78%                          │
│ Challenges: 3/4 completed                     │
│ Streak: 🔥 5 days                            │
│ Weekly Active: 4/7 days                       │
│ Total Stars: 350 ⭐                          │
└──────────────────────────────────────────────┘
```

---

## Mobile-First UX

### Layout Rules

| Rule | Implementation |
|---|---|
| Cards stack vertically | Single column on mobile, 2-col on tablet, 3-col on desktop |
| Large touch targets | All buttons ≥ 48px height |
| No tables on mobile | Replace with card lists |
| Minimal text | Icons + numbers first, labels second |
| Bottom nav accessible | Parent pages use the same bottom nav |
| Swipe for tabs | Horizontal swipe to switch child tabs |
| Pull to refresh | Standard mobile refresh pattern |

### Breakpoints

```
Mobile (< 640px):   1 column, cards stack, bottom nav
Tablet (640-1024):  2 columns, cards grid
Desktop (> 1024):   3 columns with sidebar
```

### Typography (matching learner app)

- Headers: Baloo 2 (playful but parental)
- Body: Nunito (clean, readable)
- Stats: Baloo 2 bold numbers

---

## Data Sources Summary

| Feature | Tables Used |
|---|---|
| Child Progress | `stories`, `story_slots`, `child_progress`, `get_story_library` RPC |
| Certificates | `child_achievements WHERE type = 'certificate'` |
| Badges | `child_achievements WHERE type = 'badge'` |
| Challenges | `weekly_challenges`, `weekly_challenge_progress` |
| Activity Feed | `child_progress`, `child_achievements` merged by timestamp |
| Notifications | `notifications` table |
| Community | `creations WHERE parent_id = auth.uid()` |
| Personalization | `children.name` + `personalize()` utility |
| Insights | Aggregations over `child_progress` |

No new database tables required. All data already exists.

---

## Implementation Estimate

| Component | Effort |
|---|---|
| Parent Dashboard layout + header | 0.5 day |
| Quick Stats cards | 0.5 day |
| Child Progress card | 0.5 day |
| Weekly Challenge card | 0.25 day |
| Certificates card + download | 0.5 day |
| Achievement showcase | 0.25 day |
| Learning Journey timeline | 0.5 day |
| Child Detail view (5 tabs) | 1.5 days |
| Personalized Story Center | 0.5 day |
| Community Approval Center | 0.5 day |
| Family Activity Feed | 0.5 day |
| Insights dashboard | 0.5 day |
| Mobile responsiveness | 0.5 day |
| Testing | 1 day |
| **Total** | **8 days** |

---

## Dependencies

| SA | Dependency |
|---|---|
| SA-2.3 | Personalization engine (`personalize()`, `personalizeTitle()`) |
| SA-2.4 | Community sharing flow (`ShareAchievementFlow`, `ParentGateModal`) |
| SA-3.2 | Notification panel (bell icon, `notifications` table) |
| Existing | `getStoryLibrary`, `getStorySlots`, `computeStreaks`, `getChildAchievements` |

No new RPCs needed. All data accessible through existing functions and direct Supabase queries with RLS.

---

## Files to Create (When Implementing)

```
app/parents/page.tsx                    — Dashboard (rebuild from current)
app/parents/child/[childId]/page.tsx    — Child Detail
app/parents/personalization/page.tsx    — Personalized Story Center
app/parents/community/page.tsx          — Community Approval
app/parents/certificates/page.tsx       — Certificates Gallery
app/parents/activity/page.tsx           — Family Activity Feed
app/parents/settings/page.tsx           — Parent Account Settings

components/parents/
  ParentHeader.tsx                      — Welcome header + child selector
  QuickStatsRow.tsx                     — 4 stat cards
  ChildProgressCard.tsx                 — Current story progress
  WeeklyChallengeCard.tsx               — Challenge status
  CertificatesCard.tsx                  — Recent certificates
  AchievementShowcase.tsx               — Badge grid
  LearningTimeline.tsx                  — Activity timeline
  ChildStoryList.tsx                    — Stories with progress
  InsightsPanel.tsx                     — Metrics display
  CommunityApprovalList.tsx             — Pending shares
  PersonalizationPreview.tsx            — Name + certificate preview
```
