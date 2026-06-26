# SA-4.2 — Parent Notifications & Communication System

## Overview

A notification system that celebrates progress, encourages participation, and keeps parents informed — without becoming spam. Every notification is positive, child-focused, and actionable.

---

## Notification Principles

| Principle | Rule |
|---|---|
| Positive | Never negative ("X failed") — always celebratory or encouraging |
| Child-focused | About the child's journey, not system events |
| Actionable | Every notification has a clear next step (view, continue, share) |
| Minimal | Bundle related events, respect quiet hours |
| Age-appropriate | Language matches the child's age context |

---

## Event Trigger Matrix

### Achievement Notifications (High Priority)

| Trigger | Condition | Message Template | Action |
|---|---|---|---|
| Story Completed | `_sa_is_story_complete()` returns true | "{child} completed {story} and earned a certificate! 🏆" | View Certificate |
| Certificate Earned | `child_achievements` insert, type=certificate | "{child} earned a Story Certificate for {story}!" | View Certificate |
| Challenge Completed | `weekly_challenge_progress` insert | "{child} completed this week's challenge! ⭐ +{stars}" | View Achievement |
| Milestone Reached | Badge slug matches streak pattern | "{child} reached a {N}-day learning streak! 🔥" | View Achievements |

### Progress Notifications (Medium Priority)

| Trigger | Condition | Message Template | Action |
|---|---|---|---|
| Story Started | First `child_progress` for a story | "{child} started a new adventure: {story}! 📚" | View Story |
| Nearly Complete | 5/6 missions done | "{child} is one activity away from completing {story}!" | Continue Story |
| Story Unlocked | Previous story complete, next available | "A new story unlocked: {story}! 🔓" | View Story |
| Daily Summary | End of day, child was active | "{child} completed {N} activities today! Great job! 🌟" | View Progress |

### Challenge Notifications (Medium Priority)

| Trigger | Condition | Message Template | Action |
|---|---|---|---|
| New Challenge | Admin publishes weekly challenge | "This week's challenge is ready: {title}! 🏆" | View Challenge |
| Expiring Soon | Challenge end date approaching (48hrs) | "Only 2 days left for this week's challenge!" | View Challenge |

### Community Notifications (Low Priority)

| Trigger | Condition | Message Template | Action |
|---|---|---|---|
| Share Approved | `creations.status` → 'approved' | "Your shared achievement is now visible! 🌍" | View Post |
| Post Liked | `likes` count increases | "Someone loved {child}'s creation! ❤️" | View Post |

### Content Release Notifications (Medium Priority)

| Trigger | Condition | Message Template | Action |
|---|---|---|---|
| New Story | Admin publishes story | "New adventure available: {story}! 📚" | View Story |
| New Language | Story version published in new language | "{story} is now available in {language}!" | View Story |

---

## Smart Bundling Rules

### Problem

A child completes 4 missions in one session. Without bundling, the parent gets 4 separate push notifications.

### Solution

Bundle related events within a time window.

```typescript
interface BundlingRule {
  eventType: string;
  windowMinutes: number;
  bundleTemplate: string;
}

const BUNDLING_RULES: BundlingRule[] = [
  {
    eventType: 'mission_completed',
    windowMinutes: 30,
    bundleTemplate: '{child} completed {count} activities today! 🌟',
  },
  {
    eventType: 'badge_earned',
    windowMinutes: 60,
    bundleTemplate: '{child} earned {count} new badges! 🏅',
  },
];
```

### Bundling Logic

```
Event arrives
  ↓
Check: is there a pending bundle for this event type + child within the window?
  ↓
  Yes → increment bundle count, extend window
  No  → create new bundle, start window timer
  ↓
Window expires → deliver bundled notification
```

### Exceptions (Never Bundle)

- Story Completed → always immediate
- Certificate Earned → always immediate
- Challenge Completed → always immediate

These are milestone moments. Parents should feel them in real-time.

---

## Notification Channels

### Channel 1: In-App (Primary)

- Bell icon in top navigation bar (already built)
- Unread count badge
- Dropdown panel with notification list
- Mark as read on click
- "Mark all read" action

Uses existing `notifications` table.

### Channel 2: Push (Optional, Opt-in)

- Browser/PWA push notifications
- Uses existing `push_subscriptions` table + `sw.js` handler
- Parent must explicitly enable
- Respects quiet hours
- Respects bundling rules

### Channel 3: Email (Future — Architecture Only)

```typescript
interface EmailNotification {
  to: string;               // parent email
  subject: string;
  template: string;         // 'certificate_earned' | 'daily_summary' | etc.
  data: Record<string, any>;
  scheduledAt?: string;      // for delayed/batched delivery
}
```

Not implemented in MVP. Table design:

```sql
-- Future: email_notifications
-- id, parent_id, template, subject, data jsonb, status, sent_at, created_at
```

---

## Notification Center (`/parents/notifications`)

### Layout

```
┌──────────────────────────────────────────────┐
│ 🔔 Notifications                              │
│                                              │
│ Tabs: [All] [Unread] [Achievements]          │
│       [Challenges] [Community] [System]      │
│                                              │
│ ┌──────────────────────────────────────┐     │
│ │ 🏆 Certificate Earned        2h ago │     │
│ │ Annie completed Funny Animals and    │     │
│ │ earned a certificate!                │     │
│ │ [View Certificate]                   │     │
│ └──────────────────────────────────────┘     │
│                                              │
│ ┌──────────────────────────────────────┐     │
│ │ ⭐ Challenge Complete       Yesterday │     │
│ │ Annie completed Make Someone Smile!  │     │
│ │ +50 Stars earned.                    │     │
│ │ [View Achievement]                   │     │
│ └──────────────────────────────────────┘     │
│                                              │
│ ┌──────────────────────────────────────┐     │
│ │ 📚 Story Progress            2d ago │     │
│ │ Annie is one activity away from      │     │
│ │ completing Rainbow Colors!           │     │
│ │ [Continue Story]                     │     │
│ └──────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

### Notification Card Structure

```typescript
interface NotificationCard {
  id: string;
  icon: string;           // emoji
  title: string;
  body: string;
  type: 'achievement' | 'progress' | 'challenge' | 'community' | 'system';
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  actionLabel?: string;   // "View Certificate"
  actionUrl?: string;     // "/stories/funny-animals"
  childName: string;
  createdAt: string;
}
```

### Tabs

| Tab | Filter |
|---|---|
| All | Everything |
| Unread | `read = false` |
| Achievements | `type = 'achievement'` |
| Challenges | `type = 'challenge'` |
| Community | `type = 'community'` |
| System | `type = 'system'` (content releases, updates) |

---

## Parent Preferences

### Settings Location

`/parents/settings` → Notifications tab

### Preference Model

```typescript
interface NotificationPreferences {
  // Category toggles
  certificateAlerts: boolean;      // default: true
  challengeAlerts: boolean;        // default: true
  progressAlerts: boolean;         // default: true
  communityAlerts: boolean;        // default: true
  storyReleaseAlerts: boolean;     // default: true

  // Channel toggles
  inAppEnabled: boolean;           // default: true (cannot disable)
  pushEnabled: boolean;            // default: false (opt-in)
  emailEnabled: boolean;           // default: false (future)

  // Quiet hours
  quietHoursEnabled: boolean;      // default: false
  quietHoursStart: string;         // "21:00" (9 PM)
  quietHoursEnd: string;           // "07:00" (7 AM)

  // Bundling
  bundleEnabled: boolean;          // default: true
}
```

### Storage

Uses existing `parental_settings` table:

```sql
-- Already exists, add notification preferences as JSONB
-- parental_settings.notification_prefs jsonb
```

Or store in `parents` table as a JSONB column if `parental_settings` doesn't fit. No new table needed.

### Settings UI

```
┌──────────────────────────────────────────────┐
│ ⚙️ Notification Settings                     │
│                                              │
│ What to notify:                              │
│ ✅ Certificates & Achievements               │
│ ✅ Challenge Updates                          │
│ ✅ Story Progress                             │
│ ✅ Community Activity                         │
│ ✅ New Story Releases                         │
│                                              │
│ How to notify:                               │
│ ✅ In-App (always on)                         │
│ ☐ Push Notifications                         │
│ ☐ Email (coming soon)                        │
│                                              │
│ Quiet Hours:                                 │
│ ☐ Enable quiet hours                         │
│    From: [21:00] To: [07:00]                │
│                                              │
│ [Save Preferences]                            │
└──────────────────────────────────────────────┘
```

---

## Quiet Hours

### Behavior

```
Notification triggered at 10:30 PM
  ↓
Check: is current time within quiet hours?
  ↓
  Yes → store in notifications table (in-app visible)
        do NOT send push notification
        queue push for quiet hours end time
  No  → deliver immediately (in-app + push)
```

### Implementation

```typescript
function shouldDeliverPush(prefs: NotificationPreferences): boolean {
  if (!prefs.pushEnabled) return false;
  if (!prefs.quietHoursEnabled) return true;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 21:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= endMinutes && currentMinutes < startMinutes;
  }
  return currentMinutes < startMinutes || currentMinutes >= endMinutes;
}
```

In-app notifications are ALWAYS stored immediately regardless of quiet hours. Only push delivery is delayed.

---

## Child Celebration Sync

### Real-Time Flow

```
Child completes mission 6/6
  ↓
complete_story_slot RPC fires
  ↓
Returns: story_complete = true, new_certificate = "story-funny-animals-certificate-en"
  ↓
Child sees: confetti, WATATAWOWO, certificate reveal
  ↓
Simultaneously:
  Insert into notifications table for parent
  Send push notification (if enabled, not in quiet hours)
  ↓
Parent receives within seconds:
  "Annie completed Funny Animals and earned a certificate! 🏆"
```

### Implementation Note

The celebration sync happens client-side after the RPC returns. The learner app (mission player page) creates the parent notification after receiving the `story_complete` result:

```typescript
// In mission player, after completeStorySlot returns
if (result.story_complete) {
  // Create parent notification (non-blocking)
  supabase.from('notifications').insert({
    parent_id: parentId,
    child_id: childId,
    title: '🏆 Certificate Earned!',
    body: `${childName} completed ${storyTitle} and earned a certificate!`,
    type: 'achievement',
    url: `/stories/${storySlug}`,
  });
}
```

---

## Notification Priority System

### Priority Levels

| Level | Types | Push Behavior | Bundling |
|---|---|---|---|
| High | Certificate, Story Complete, Challenge Complete | Immediate push | Never bundled |
| Medium | Progress, New Challenge, Story Release | Bundled push | 30-min window |
| Low | Likes, Community, System | In-app only | 60-min window |

### Delivery Matrix

| Priority | In-App | Push | Email (Future) |
|---|---|---|---|
| High | Immediate | Immediate | Next digest |
| Medium | Immediate | Bundled | Next digest |
| Low | Immediate | Never | Never |

---

## Dashboard Integration

### Recent Notifications Widget (Parent Dashboard)

```
┌──────────────────────────────────────────────┐
│ 🔔 Recent Notifications                      │
│                                              │
│ 🏆 Annie earned a certificate!      2h ago  │
│ ⭐ Challenge completed!            Yesterday │
│ 📚 New story available!            2 days   │
│                                              │
│ View All Notifications ›                      │
└──────────────────────────────────────────────┘
```

Shows latest 5 notifications, prioritized by type. "View All" links to `/parents/notifications`.

---

## Analytics Model

### Metrics to Track

| Metric | Source | Purpose |
|---|---|---|
| Notifications sent | `COUNT(notifications)` per type | Volume monitoring |
| Read rate | `read = true / total` per type | Engagement measurement |
| Push open rate | Push click-through tracking | Channel effectiveness |
| Time to read | `read_at - created_at` average | Responsiveness |
| Opt-in rate | `push_subscriptions / total parents` | Channel adoption |
| Preference distribution | Aggregated preference toggles | Feature usage |
| Most effective type | Highest read rate per category | Content optimization |

### Admin Dashboard Widget

```
Notification Analytics

Sent this week:      142
Read rate:           78%
Push opt-in:         45%
Most effective:      Certificates (95% read rate)
Least effective:     Community (32% read rate)
```

---

## Implementation Components

```
lib/notificationEngine.ts           — Event processing, bundling, priority, delivery
lib/notificationTemplates.ts        — Message templates per event type

components/parents/notifications/
  NotificationCenter.tsx            — Full page notification list
  NotificationCard.tsx              — Single notification item
  NotificationFilters.tsx           — Tab filters
  NotificationPreferences.tsx       — Settings panel
  RecentNotificationsWidget.tsx     — Dashboard widget
  QuietHoursSelector.tsx            — Time range picker

app/parents/notifications/page.tsx  — Notification center page
```

---

## Data Sources

| Component | Tables |
|---|---|
| Notification list | `notifications WHERE parent_id = auth.uid()` |
| Preferences | `parental_settings` or `parents` JSONB column |
| Push delivery | `push_subscriptions` + `sw.js` handler |
| Event triggers | `child_progress`, `child_achievements`, `weekly_challenge_progress` |
| Analytics | `notifications` aggregated by type, read status, timestamps |

No new tables required for MVP. The existing `notifications` table covers in-app. Push uses existing infrastructure. Preferences can store as JSONB in existing tables.

---

## Implementation Estimate

| Component | Effort |
|---|---|
| `notificationEngine.ts` | 1 day |
| `notificationTemplates.ts` | 0.25 day |
| Notification Center page | 0.5 day |
| Notification cards + filters | 0.5 day |
| Preferences panel | 0.5 day |
| Quiet hours logic | 0.25 day |
| Bundling logic | 0.5 day |
| Celebration sync (mission player) | 0.25 day |
| Dashboard widget | 0.25 day |
| Push delivery integration | 0.5 day |
| Testing | 1 day |
| **Total** | **5.5 days** |

---

## Dependencies

| SA | Provides |
|---|---|
| SA-2.0 | Challenge completion events |
| SA-2.4 | Community sharing events, `ParentGateModal` |
| SA-3.2 | Bell icon + notification panel (already built) |
| SA-4.0 | Parent dashboard layout, route structure |
| Existing | `notifications` table, `push_subscriptions`, `sw.js` push handler |
