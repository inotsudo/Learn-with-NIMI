# SA-5.4 — Monitoring & Operations Center

## Overview

A unified operations dashboard giving the team complete visibility into platform health, learner engagement, content readiness, community activity, AI usage, and system failures — all from one screen.

---

## Route

```
/admin/operations
```

Accessible to admins only. Separate from the content-focused admin dashboard.

---

## 1. Operations Dashboard Specification

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Operations Center                          [Live] [24h] │
├─────────────────────────────────────────────────────────┤
│ [Executive Summary Cards — 8 metrics]                   │
├──────────────────────┬──────────────────────────────────┤
│ Platform Health      │ Story Analytics                  │
│ (service status)     │ (completion rates, drop-offs)    │
├──────────────────────┼──────────────────────────────────┤
│ Mission Analytics    │ Community Monitoring              │
│ (per-type metrics)   │ (moderation queue, posts)        │
├──────────────────────┼──────────────────────────────────┤
│ Talk to Nimi         │ Notifications                    │
│ (AI usage, errors)   │ (delivery, failures)             │
├──────────────────────┴──────────────────────────────────┤
│ Alerts Center                                           │
├─────────────────────────────────────────────────────────┤
│ Error Log (last 50 events)                              │
└─────────────────────────────────────────────────────────┘
```

### Time Range Selector

- Live (auto-refresh every 30s)
- Today
- Last 7 days
- Last 30 days
- Custom range

---

## 2. Executive Summary Cards

8 cards across the top row:

| Card | Metric | Source | Color |
|---|---|---|---|
| Active Children | Distinct children with progress today | `child_progress WHERE completed_at >= today` | Blue |
| Stories Started | First mission completions per story today | `child_progress` grouped | Indigo |
| Stories Completed | Stories with 6/6 missions done today | `child_progress` + completion check | Green |
| Certificates | Certificates awarded today | `child_achievements WHERE type='certificate' AND earned_at >= today` | Gold |
| Challenges | Challenges completed today | `weekly_challenge_progress WHERE completed_at >= today` | Purple |
| Community Posts | Posts created today | `creations WHERE created_at >= today` | Pink |
| Nimi Conversations | Talk to Nimi sessions today | Future: `nimi_conversations` table or API log | Teal |
| System Health | Overall platform status | Composite of all health checks | Green/Amber/Red |

### Computation

```typescript
interface ExecutiveSummary {
  activeChildren: number;
  storiesStarted: number;
  storiesCompleted: number;
  certificatesAwarded: number;
  challengesCompleted: number;
  communityPosts: number;
  nimiConversations: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

async function getExecutiveSummary(date: string): Promise<ExecutiveSummary> {
  const [progress, achievements, challenges, posts] = await Promise.all([
    supabase.from('child_progress').select('child_id, mission_id').gte('completed_at', date),
    supabase.from('child_achievements').select('id, type').gte('earned_at', date),
    supabase.from('weekly_challenge_progress').select('id').gte('completed_at', date),
    supabase.from('creations').select('id').gte('created_at', date),
  ]);
  // ... compute and return
}
```

---

## 3. Platform Health Panel

### Services Monitored

| Service | Health Check | Interval |
|---|---|---|
| Database | `SELECT 1` query | 30 seconds |
| Storage | HEAD request to known asset | 60 seconds |
| Authentication | `supabase.auth.getSession()` | 60 seconds |
| RPC Layer | Call `get_story_library` with test child | 60 seconds |
| Notifications | Check `push_subscriptions` count | 300 seconds |
| AI Provider | Ping Talk to Nimi endpoint | 60 seconds |
| Community | Query `creations` count | 300 seconds |

### Status Levels

| Status | Condition | Display |
|---|---|---|
| 🟢 Healthy | All checks pass | Green dot + "Operational" |
| 🟡 Warning | 1-2 checks degraded | Amber dot + "Degraded" |
| 🔴 Critical | Any core service down | Red dot + "Outage" |

### Implementation

```typescript
interface ServiceHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  latencyMs: number;
  lastChecked: string;
  message?: string;
}

async function checkHealth(): Promise<ServiceHealth[]> {
  const checks: ServiceHealth[] = [];
  
  // Database
  const dbStart = Date.now();
  try {
    await supabase.from('stories').select('id').limit(1);
    checks.push({ name: 'Database', status: 'healthy', latencyMs: Date.now() - dbStart, lastChecked: new Date().toISOString() });
  } catch {
    checks.push({ name: 'Database', status: 'critical', latencyMs: Date.now() - dbStart, lastChecked: new Date().toISOString(), message: 'Query failed' });
  }
  
  // ... similar for each service
  return checks;
}
```

---

## 4. Analytics Framework

### Story Analytics

| Metric | Computation | Visualization |
|---|---|---|
| Most Started | Stories with highest first-mission completions | Horizontal bar chart |
| Most Completed | Stories with highest 6/6 completions | Horizontal bar chart |
| Least Completed | Stories with lowest completion rate | Table with warning icons |
| Avg Completion Rate | Completed / Started per story | Percentage bars |
| Avg Completion Time | Mean days from first to last mission | Number + trend |
| Drop-Off Points | Which mission # has highest abandonment | Funnel chart |
| Language Distribution | Completions per language | Pie chart (EN/FR/RW) |

### Mission Analytics

Per mission type (FlipFlop, PDF, Coloring, Move, Sing, Video):

| Metric | Source |
|---|---|
| Started | `child_progress` rows for that type |
| Completed | Same (all completions) |
| Completion % | Completed / children who reached that story |
| Average Time | Time between mission start and completion |
| Abandonment % | Started but not completed within 7 days |

### Challenge Analytics

| Metric | Source |
|---|---|
| Published | `weekly_challenges` count |
| Started | Children with at least one challenge interaction |
| Completed | `weekly_challenge_progress` count |
| Completion % | Completed / total children |
| Reward Distribution | Stars and badges awarded |
| Popular Types | Grouped by `weekly_challenges.type` |

### Certificate Analytics

| Metric | Source |
|---|---|
| Generated | `child_achievements WHERE type='certificate'` count |
| Per Story | Grouped by slug |
| Trilingual | Slugs matching `trilingual-story-*` |
| All-Stories | Slugs matching `all-stories-complete-*` |

---

## 5. Alert Framework

### Alert Definition

```typescript
interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  resolvedAt?: string;
}
```

### Alert Rules

| Rule | Severity | Condition | Action |
|---|---|---|---|
| Database down | Critical | Health check fails 2x consecutive | Page on-call, show banner |
| Storage > 80% | High | Storage usage exceeds threshold | Notify admin |
| AI error rate > 5% | High | Talk to Nimi errors / total > 5% in 1 hour | Disable AI, show fallback |
| Moderation queue > 20 | Medium | Pending community posts > 20 | Notify moderator |
| Push failure rate > 5% | Medium | Failed / sent > 5% in 1 hour | Notify admin |
| Story published with readiness < 100% | Medium | Story status = published but readiness < 100 | Show warning in dashboard |
| No activity in 24 hours | Low | Zero child_progress rows in 24h | Informational |
| Upload failures spike | Medium | > 5 failures in 10 minutes | Notify admin |
| Report volume spike | High | > 3 community reports in 1 hour | Notify moderator |

### Alert Display

```
┌──────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL — Database latency > 5 seconds       2m ago │
│    Average query time has increased significantly.       │
│    [Acknowledge] [Investigate]                           │
├──────────────────────────────────────────────────────────┤
│ 🟡 MEDIUM — Moderation queue: 23 pending         15m ago │
│    Community posts awaiting review.                      │
│    [Go to Moderation]                                    │
├──────────────────────────────────────────────────────────┤
│ 🟢 RESOLVED — AI provider restored              1h ago  │
│    Talk to Nimi is operational again.                     │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Error Monitoring Framework

### Error Categories

| Category | Examples | Capture Method |
|---|---|---|
| Frontend | React render errors, chunk load failures | `window.onerror` + error boundary |
| RPC | Supabase RPC failures, timeouts | Try/catch in repository functions |
| Storage | Upload failures, 404 on media | Fetch error handlers |
| Auth | Session expired, login failures | Supabase auth event listener |
| Media | Audio/video playback failures | `<audio>/<video>` error events |
| AI | Talk to Nimi API errors, timeouts | API route error handling |

### Error Record

```typescript
interface ErrorRecord {
  id: string;
  timestamp: string;
  category: 'frontend' | 'rpc' | 'storage' | 'auth' | 'media' | 'ai';
  severity: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  userRole: 'learner' | 'parent' | 'admin';
  storySlug?: string;
  language?: string;
  device: string;
  url: string;
}
```

### Storage Options

| Option | Pros | Cons | Recommended Phase |
|---|---|---|---|
| Console.error (current) | Zero cost | No persistence, no alerting | Phase 1 only |
| Sentry | Rich UI, alerting, source maps | $26/mo for team plan | Phase 2+ |
| Supabase table | Free, queryable, self-hosted | No source maps, basic UI | Phase 1-2 |
| Vercel Log Drain | Integrated with deploy | Limited query capability | Supplement |

**Recommendation:** Sentry for Phase 2+. Supabase `error_log` table as immediate lightweight option.

### Error Dashboard Widget

```
Recent Errors (last 24h)

Errors: 12 | Warnings: 34 | Info: 156

Top Issues:
  RPC timeout: get_story_library (5 occurrences)
  Storage 404: storyBook/covers/... (3 occurrences)
  Media playback: audio load failed (2 occurrences)

[View All Errors →]
```

---

## 7. Reporting Framework

### Daily Operations Report (Auto-generated)

```
Daily Report — June 24, 2026

📊 Engagement
  Active Children: 45
  Stories Started: 12
  Stories Completed: 3
  Missions Completed: 78
  Certificates Awarded: 3
  Challenges Completed: 8

🌍 Languages
  English: 62%
  French: 25%
  Kinyarwanda: 13%

🏆 Top Story: Funny Animals (15 completions)
📉 Drop-off: Rainbow Colors Mission 4 (40% abandonment)

🔔 Notifications
  Sent: 89
  Delivered: 84
  Failed: 5 (5.6%)

🌍 Community
  New Posts: 4
  Pending Review: 2
  Approved: 3

⚠️ Incidents: 0 critical, 1 medium (storage latency spike at 14:32)

🤖 Talk to Nimi
  Conversations: 23
  Messages: 112
  Error Rate: 0.8%
```

### Weekly Executive Report

```
Weekly Report — June 18-24, 2026

📈 Growth
  New Children: +12 (4 → 16)
  New Parents: +5 (4 → 9)
  Stories Published: 0 (total: 3)
  
📊 Engagement
  WAU (Weekly Active Users): 45
  Avg Daily Active: 18
  Avg Session Time: 12 min
  
📚 Content Performance
  Story Completion Rate: 34%
  Best Performing: Funny Animals (45% completion)
  Worst Performing: My Family (12% completion)
  Most Skipped Mission: Story PDF (28% skip rate)
  
🌍 Language Adoption
  English: 65% of all activity
  French: 22%
  Kinyarwanda: 13%
  
💡 Recommendations
  - My Family needs more engaging content (low completion)
  - Story PDF missions have high skip rate — consider making them more interactive
  - French content gap: only 22% usage vs 33% target
  - Consider adding audio narration to Rainbow Colors (no audio uploaded)
```

---

## KPI Catalog

### Engagement KPIs

| KPI | Definition | Target | Frequency |
|---|---|---|---|
| DAU | Distinct children with activity per day | Growing | Daily |
| WAU | Distinct children with activity per week | Growing | Weekly |
| Session Duration | Average time between first and last activity per day | > 8 min | Daily |
| Story Completion Rate | Stories completed / stories started | > 40% | Weekly |
| Mission Completion Rate | Missions completed / missions started | > 70% | Weekly |
| Return Rate | Children active 2+ days per week | > 50% | Weekly |

### Content KPIs

| KPI | Definition | Target | Frequency |
|---|---|---|---|
| Content Readiness | Average readiness score across all stories | 100% | Daily |
| Language Coverage | Stories available in all 3 languages / total | > 80% | Weekly |
| Media Completeness | Stories with all media uploaded / total | 100% | Daily |
| Challenge Participation | Children attempting weekly challenge / total | > 30% | Weekly |

### Platform KPIs

| KPI | Definition | Target | Frequency |
|---|---|---|---|
| Uptime | Minutes without critical outage / total minutes | > 99.5% | Monthly |
| Error Rate | Errors / total requests | < 1% | Daily |
| Page Load Time | P95 load time for learner pages | < 3s | Daily |
| Push Delivery Rate | Delivered / sent | > 95% | Daily |
| Moderation SLA | Time from post creation to review | < 24h | Daily |

### Business KPIs

| KPI | Definition | Target | Frequency |
|---|---|---|---|
| Total Families | Parent accounts | Growing | Monthly |
| Certificates Issued | Total certificates ever awarded | Growing | Monthly |
| Community Growth | Approved posts per week | Growing | Weekly |
| Multilingual Adoption | Children using 2+ languages | > 20% | Monthly |

---

## Implementation Components

```
app/admin/OperationsCenter.tsx         — Main operations page
components/admin/operations/
  ExecutiveSummaryCards.tsx             — 8 metric cards
  PlatformHealthPanel.tsx              — Service status grid
  StoryAnalyticsPanel.tsx              — Story metrics + charts
  MissionAnalyticsPanel.tsx            — Per-type mission metrics
  ChallengeAnalyticsPanel.tsx          — Challenge metrics
  CommunityMonitorPanel.tsx            — Moderation + posts
  NimiMonitorPanel.tsx                 — AI usage + errors
  NotificationMonitorPanel.tsx         — Push delivery metrics
  AlertsCenter.tsx                     — Alert list with actions
  ErrorLogPanel.tsx                    — Recent errors table
  DailyReportGenerator.tsx             — Auto-generate daily report
  WeeklyReportGenerator.tsx            — Auto-generate weekly report

lib/operationsMetrics.ts               — All computation functions
lib/healthCheck.ts                     — Service health check functions
lib/alertEngine.ts                     — Alert rule evaluation
```

---

## Data Sources

All metrics come from existing tables. No new tables required for MVP.

| Component | Tables |
|---|---|
| Executive Summary | `child_progress`, `child_achievements`, `weekly_challenge_progress`, `creations` |
| Platform Health | Direct queries to each service |
| Story Analytics | `child_progress` joined with `stories`, `missions` |
| Mission Analytics | `child_progress` joined with `missions.type` |
| Challenge Analytics | `weekly_challenges`, `weekly_challenge_progress` |
| Community | `creations` filtered by status |
| Notifications | `notifications`, `push_subscriptions` |
| Error Log | New: `error_log` table OR Sentry integration |

### Optional New Table (lightweight error logging)

```sql
CREATE TABLE error_log (
  id bigserial PRIMARY KEY,
  timestamp timestamptz DEFAULT now(),
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  user_role text,
  url text
);

-- Auto-cleanup: keep only 30 days
CREATE INDEX idx_error_log_ts ON error_log(timestamp DESC);
```

---

## Implementation Estimate

| Component | Effort |
|---|---|
| `operationsMetrics.ts` computation lib | 1 day |
| `healthCheck.ts` service checks | 0.5 day |
| `alertEngine.ts` rule evaluation | 0.5 day |
| Executive Summary cards | 0.5 day |
| Platform Health panel | 0.5 day |
| Story + Mission analytics panels | 1 day |
| Community + Notification panels | 0.5 day |
| Talk to Nimi panel | 0.25 day |
| Alerts Center | 0.5 day |
| Error Log panel | 0.5 day |
| Daily/Weekly report generators | 1 day |
| Operations page layout | 0.5 day |
| Testing | 1 day |
| **Total** | **8.25 days** |

---

## Dependencies

| SA | Provides |
|---|---|
| SA-3.2 | Readiness engine (content readiness monitor) |
| SA-3.3 | Publishing data (story status tracking) |
| SA-5.0 | Security audit (error categories, RLS gaps) |
| SA-5.1 | Production readiness (launch checklist items) |
| SA-5.2 | Performance targets (benchmarks for health checks) |
| SA-5.3 | Backup status (health panel includes backup check) |
