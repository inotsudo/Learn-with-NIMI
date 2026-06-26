# SA-4.1 — Parent Analytics & Learning Insights

## Overview

Transform raw learner data into meaningful, parent-friendly insights. Parents see educational progress, not database statistics. Every number tells a story about their child's learning journey.

---

## Route

```
/parents/analytics
/parents/analytics/child/[childId]    — per-child deep dive
```

---

## Parent Insight Model

### Core Principle

Raw data → Human insight → Actionable recommendation

| Raw Data | Parent Sees | Recommendation |
|---|---|---|
| 45 `child_progress` rows | "3 stories completed" | — |
| 12 consecutive activity dates | "12-day learning streak 🔥" | "Keep it going!" |
| 80% flipflop, 20% coloring | "Loves listening to stories" | "Try coloring activities" |
| 0 French missions this month | "French not used recently" | "Explore French stories" |
| 5/6 missions on current story | "Almost done!" | "One mission left in Rainbow Colors" |

### Data Pipeline

```
child_progress + child_achievements + weekly_challenge_progress
        ↓
   Aggregation functions (no new tables)
        ↓
   Insight computations (client-side)
        ↓
   Human-readable cards + recommendations
```

---

## Dashboard Layout

### Top Row — Quick Stats (4 cards)

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ 📚         │ │ 📜         │ │ ⭐         │ │ 🔥         │
│ Stories    │ │ Certs      │ │ Challenge  │ │ Current    │
│ Completed  │ │ Earned     │ │ Stars      │ │ Streak     │
│            │ │            │ │            │ │            │
│    3       │ │    3       │ │   150      │ │  12 days   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

**Computation:**

```typescript
interface QuickStats {
  storiesCompleted: number;    // stories where all 6 slots done
  certificates: number;        // child_achievements type=certificate count
  challengeStars: number;      // SUM stars from challenge completions
  currentStreak: number;       // computeStreaks(activityDates).current
}
```

### Middle Row — Three insight panels

#### Panel 1: Story Progress

```
┌──────────────────────────────┐
│ 📖 Story Progress            │
│                              │
│ ✅ Talking Faces    Complete │
│ ✅ Funny Animals    Complete │
│ 🔶 Rainbow Colors   4/6     │
│ 🔒 My Family       Locked   │
│                              │
│ Avg completion: 3.2 days     │
│ per story                    │
└──────────────────────────────┘
```

**Computation:**

```typescript
interface StoryProgress {
  stories: {
    title: string;
    status: 'complete' | 'in_progress' | 'locked';
    missions: number;      // completed missions count
    total: number;         // always 6
    completedAt?: string;  // date of last mission completion
  }[];
  avgCompletionDays: number; // avg days from first to last mission per story
}
```

Source: `get_story_library()` + `child_progress` timestamps

#### Panel 2: Language Usage

```
┌──────────────────────────────┐
│ 🌍 Language Usage            │
│                              │
│ 🇬🇧 English      ████████ 65% │
│ 🇫🇷 French       ████░░░░ 25% │
│ 🇷🇼 Kinyarwanda  ██░░░░░░ 10% │
│                              │
│ 3 missions in French         │
│ this month                   │
└──────────────────────────────┘
```

**Computation:**

```typescript
interface LanguageUsage {
  languages: {
    code: string;
    label: string;
    percentage: number;      // missions in this lang / total missions
    missionsThisMonth: number;
  }[];
}
```

Source: `child_progress.language` grouped and counted

#### Panel 3: Challenge Participation

```
┌──────────────────────────────┐
│ 🏆 Challenges                │
│                              │
│ Completed:    18             │
│ Missed:        2             │
│ Participation: 90%           │
│                              │
│ Stickers: 🏅🏅🏅🏅🏅          │
│ Stars: ⭐ 150                │
└──────────────────────────────┘
```

**Computation:**

```typescript
interface ChallengeAnalytics {
  completed: number;
  missed: number;
  participationRate: number;  // completed / (completed + missed)
  stickersEarned: number;
  starsEarned: number;
}
```

Source: `weekly_challenge_progress` + `child_achievements` filtered by challenge badges

### Bottom Row — Three detail panels

#### Panel 4: Mission Activity Breakdown

```
┌──────────────────────────────┐
│ 🎯 Activity Breakdown        │
│                              │
│ 🎧 FlipFlop     ████████ 8  │
│ 📄 Story PDF    ██████░░ 6  │
│ 🎨 Coloring     ████████ 8  │
│ 🤸 Move         ██████░░ 6  │
│ 🎵 Sing Along   ████░░░░ 4  │
│ 🎬 Bonus Video  ██████░░ 6  │
│                              │
│ Favorite: FlipFlop & Coloring│
│ Least used: Sing Along       │
└──────────────────────────────┘
```

**Computation:**

```typescript
interface MissionBreakdown {
  activities: {
    slotKey: string;
    label: string;
    completions: number;
    icon: string;
  }[];
  favorite: string;     // highest completions
  leastUsed: string;    // lowest completions
}
```

Source: `child_progress` joined with `missions.type`, grouped by type

#### Panel 5: Activity Timeline

```
┌──────────────────────────────┐
│ 📅 Activity Timeline         │
│                              │
│ Today                        │
│ ● Completed Coloring  2:30pm │
│ ● Started Move        1:45pm │
│                              │
│ Yesterday                    │
│ ● Certificate earned  4:00pm │
│ ● Completed story     3:50pm │
│                              │
│ June 18                      │
│ ● Started Rainbow     10am   │
└──────────────────────────────┘
```

Source: `child_progress` + `child_achievements` merged by timestamp, grouped by day

#### Panel 6: Achievements & Recommendations

```
┌──────────────────────────────┐
│ 🌟 Achievements              │
│                              │
│ Certificates: 3              │
│ Badges: 5                    │
│ Streak Record: 14 days       │
│                              │
│ ── Recommendations ──        │
│                              │
│ 💡 Annie loves FlipFlop!     │
│    Try the Sing Along too.   │
│                              │
│ 💡 French not used recently. │
│    Explore French stories.   │
│                              │
│ 💡 One mission left in       │
│    Rainbow Colors!           │
└──────────────────────────────┘
```

---

## Learning Streaks

### Current Streaks Display

```
┌──────────────────────────────┐
│ 🔥 Learning Streaks          │
│                              │
│ Current:  12 days            │
│ Longest:  14 days            │
│ This Month: 8 stories        │
│ This Year: 24 stories        │
│                              │
│ Milestones:                  │
│ ✅ 3 days   ✅ 7 days        │
│ ✅ 14 days  🔒 30 days       │
│ 🔒 60 days  🔒 100 days      │
└──────────────────────────────┘
```

**Computation:**

```typescript
interface StreakData {
  current: number;           // consecutive days with activity
  longest: number;           // max consecutive days ever
  storiesThisMonth: number;  // completed stories this calendar month
  storiesThisYear: number;   // completed stories this calendar year
  milestones: { days: number; achieved: boolean }[];
}
```

Source: `getActivityDates()` → `computeStreaks()` (existing), plus filtered counts

### Milestones

| Days | Name | Badge |
|---|---|---|
| 3 | Getting Started | 🌱 |
| 7 | Week Warrior | 🗓️ |
| 14 | Two-Week Champion | 💪 |
| 30 | Monthly Master | 🏆 |
| 60 | Dedication Star | ⭐ |
| 100 | Century Explorer | 🎯 |

---

## Multi-Child Comparison

When parent has 2+ children, show a side-by-side view (not competitive — progress visibility only).

```
┌──────────────────────────────────────────────┐
│ 👨‍👩‍👧‍👦 Family Progress                         │
│                                              │
│ ┌─────────────┐   ┌─────────────┐           │
│ │ 🦁 Annie    │   │ 🐧 Nathan   │           │
│ │             │   │             │           │
│ │ Stories: 3  │   │ Stories: 1  │           │
│ │ Certs: 3    │   │ Certs: 1    │           │
│ │ Stars: 150  │   │ Stars: 50   │           │
│ │ Streak: 12d │   │ Streak: 3d  │           │
│ │             │   │             │           │
│ │ ████████░░  │   │ ████░░░░░░  │           │
│ │ 60%         │   │ 20%         │           │
│ └─────────────┘   └─────────────┘           │
│                                              │
│ No ranking. Just progress visibility.        │
└──────────────────────────────────────────────┘
```

**Rule:** Never show "X is ahead of Y." Show each child's individual progress only. No competitive framing.

---

## Recommendation Engine

### Architecture

```typescript
interface Recommendation {
  icon: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

function generateRecommendations(
  progress: ChildProgress[],
  achievements: ChildAchievement[],
  stories: StoryLibraryItem[],
  streaks: StreakData,
  language: string
): Recommendation[]
```

### Rules

| Condition | Recommendation | Priority |
|---|---|---|
| Current story 5/6 missions | "Only one mission left in {story}!" | High |
| No activity in 3+ days | "It's been a while. Continue {story}?" | High |
| One language < 10% usage | "{Language} not used recently. Try it!" | Medium |
| One activity type < 15% of total | "{Child} might enjoy {activity} too" | Medium |
| Highest activity type > 40% | "{Child} loves {activity}!" | Low |
| Streak approaching milestone | "3 more days to reach {milestone}!" | Medium |
| Challenge available, not started | "This week's challenge is waiting!" | Medium |
| All stories complete | "Amazing! All stories finished! 🎉" | Low |

### Display

Recommendations appear in the Achievements & Recommendations panel, sorted by priority.

Maximum 3 recommendations shown at once. Rotate daily if more exist.

---

## School Readiness Metrics (Future)

Placeholder section — not computed yet, but architecture-ready.

### Categories

| Category | Maps To |
|---|---|
| Listening Skills | FlipFlop Audio completions |
| Creative Expression | Coloring Activity completions |
| Physical Activity | Move & Explore completions |
| Reading Readiness | Story PDF completions |
| Musical Awareness | Sing Along completions |
| Visual Learning | Bonus Video completions |
| Consistency | Learning streak data |
| Multilingual Exposure | Language usage distribution |

### Display (Future)

```
School Readiness

Listening:    ████████░░  80%
Creative:     ██████████  100%
Movement:     ██████░░░░  60%
Reading:      ████████░░  80%
Music:        ████░░░░░░  40%
Visual:       ██████░░░░  60%
Consistency:  ████████░░  80%
Multilingual: ██░░░░░░░░  20%
```

Not implemented in SA-4.1. Data model supports it — just needs the UI when product team defines thresholds.

---

## Implementation Components

```
components/parents/analytics/
  QuickStatsRow.tsx             — 4 stat cards
  StoryProgressPanel.tsx        — Story list with progress bars
  LanguageUsagePanel.tsx        — Language distribution bars
  ChallengeAnalyticsPanel.tsx   — Challenge stats
  MissionBreakdownPanel.tsx     — Activity type breakdown
  ActivityTimeline.tsx          — Chronological event list
  AchievementsPanel.tsx         — Badges + recommendations
  StreakDisplay.tsx              — Current/longest streak + milestones
  MultiChildComparison.tsx      — Side-by-side family view
  RecommendationCard.tsx        — Single recommendation item

lib/parentAnalytics.ts          — All computation functions
```

---

## Data Sources

| Component | Tables/RPCs |
|---|---|
| Quick Stats | `child_progress`, `child_achievements`, `getActivityDates()` |
| Story Progress | `get_story_library()`, `child_progress` timestamps |
| Language Usage | `child_progress.language` grouped |
| Challenges | `weekly_challenge_progress`, `child_achievements` |
| Mission Breakdown | `child_progress` joined with `missions.type` |
| Timeline | `child_progress` + `child_achievements` merged |
| Streaks | `getActivityDates()` → `computeStreaks()` |
| Recommendations | All of the above, processed through rules engine |

No new database tables. No new RPCs. All computed client-side from existing data.

---

## Implementation Estimate

| Component | Effort |
|---|---|
| `parentAnalytics.ts` computation library | 1 day |
| QuickStatsRow | 0.25 day |
| StoryProgressPanel | 0.5 day |
| LanguageUsagePanel | 0.25 day |
| ChallengeAnalyticsPanel | 0.25 day |
| MissionBreakdownPanel | 0.5 day |
| ActivityTimeline | 0.5 day |
| AchievementsPanel + Recommendations | 0.5 day |
| StreakDisplay | 0.25 day |
| MultiChildComparison | 0.5 day |
| Analytics page layout | 0.5 day |
| Mobile responsiveness | 0.5 day |
| Testing | 1 day |
| **Total** | **6.5 days** |

---

## Dependencies

| SA | What it provides |
|---|---|
| SA-2.0 | Challenge system, `weekly_challenge_progress` |
| SA-2.3 | Personalization (child name in recommendations) |
| SA-4.0 | Parent dashboard layout, route structure |
| Existing | `computeStreaks()`, `getActivityDates()`, `getChildAchievements()`, `getStoryLibrary()` |
