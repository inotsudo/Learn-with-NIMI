# SA-4.3 — Family Settings & Permissions

## Overview

A centralized family governance system where parents control every aspect of their children's Nimipiko experience. Simple enough for non-technical parents — toggle switches, not configuration files.

---

## Route Structure

```
/parents/settings                    → Settings hub
/parents/settings/family             → Family profile
/parents/settings/children           → Child management
/parents/settings/privacy            → Privacy controls
/parents/settings/nimi               → Talk to Nimi controls
/parents/settings/community          → Community permissions
/parents/settings/language           → Language preferences
/parents/settings/notifications      → Notification preferences
/parents/settings/challenges         → Challenge settings
/parents/settings/personalization    → Personalization settings
/parents/settings/safety             → Safety & screen time
/parents/settings/data               → Data & export
/parents/settings/security           → Account security
```

Mobile: single page with collapsible sections instead of separate routes.

---

## Settings Data Model

### Storage Strategy

All settings stored in a single JSONB column on the `parents` table or `parental_settings` table. No new tables needed.

```typescript
interface FamilySettings {
  // Family Profile
  family: {
    preferredLanguage: 'en' | 'fr' | 'rw';
    timezone: string;
    country: string;
  };

  // Privacy (defaults: all OFF for safety)
  privacy: {
    allowCommunitySharing: boolean;       // default: false
    allowPublicCertificates: boolean;     // default: false
    allowChallengeSharing: boolean;       // default: false
    allowPhotoUploads: boolean;           // default: false
    allowAudioUploads: boolean;           // default: false
    allowVideoUploads: boolean;           // default: false
  };

  // Talk to Nimi
  aiControls: {
    allowTalkToNimi: boolean;             // default: true
    enableVoiceInput: boolean;            // default: true
    enableVoiceOutput: boolean;           // default: true
    allowStoryAssistance: boolean;        // default: true
    allowPersonalizedResponses: boolean;  // default: true
  };

  // Community
  community: {
    mode: 'private' | 'family' | 'community'; // default: 'private'
    // Note: parent approval always required, cannot be disabled
  };

  // Notifications (detailed in SA-4.2)
  notifications: {
    certificateAlerts: boolean;
    challengeAlerts: boolean;
    storyAlerts: boolean;
    communityAlerts: boolean;
    pushEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };

  // Challenges
  challenges: {
    enableWeeklyChallenges: boolean;      // default: true
    enableReminders: boolean;             // default: true
    enableCelebrations: boolean;          // default: true
  };

  // Personalization
  personalization: {
    allowPersonalizedStories: boolean;    // default: true
    allowChildNameInStories: boolean;     // default: true
    allowPersonalizedCertificates: boolean; // default: true
    allowPersonalizedRewards: boolean;    // default: true
  };

  // Safety
  safety: {
    dailyLimitMinutes: number | null;     // null = unlimited, or 15/30/60
    bedtimeEnabled: boolean;              // default: false
    bedtimeStart: string;                 // "20:00"
    bedtimeEnd: string;                   // "07:00"
  };

  // Activity Visibility
  activityVisibility: 'full' | 'summary' | 'hidden'; // default: 'full'
}
```

### Default Values

Every setting defaults to the safest, most private option:
- Privacy: all OFF
- Community: private mode
- AI: enabled (educational tool)
- Challenges: enabled
- Personalization: enabled
- Safety: no limits (parent chooses to set them)
- Activity: full visibility

---

## Permission Matrix

| Feature | Child Can | Parent Can |
|---|---|---|
| Stories | View, Play, Complete | Manage, Personalize, Choose language |
| Certificates | View earned certificates | Share, Download, Print |
| Challenges | View, Complete | Approve sharing, Control celebrations |
| Community | View (if enabled) | Moderate all child content, Approve/Reject |
| Talk to Nimi | Use (if enabled) | Control access, Set limits |
| Settings | No access | Full access |
| Progress | See own progress UI | See analytics, Export data |
| Notifications | See in-app encouragement | Control all notification channels |

### Enforcement

```typescript
// In learner-facing code, check parent settings before showing features
function canChildAccess(feature: string, settings: FamilySettings): boolean {
  switch (feature) {
    case 'talk_to_nimi': return settings.aiControls.allowTalkToNimi;
    case 'community_view': return settings.community.mode !== 'private';
    case 'challenges': return settings.challenges.enableWeeklyChallenges;
    case 'personalization': return settings.personalization.allowPersonalizedStories;
    default: return true;
  }
}

// Screen time enforcement
function isWithinAllowedTime(settings: FamilySettings): boolean {
  if (!settings.safety.bedtimeEnabled) return true;
  // Check current time against bedtime window
  // Return false during bedtime hours
}

function hasTimeRemaining(settings: FamilySettings, usedMinutes: number): boolean {
  if (!settings.safety.dailyLimitMinutes) return true; // unlimited
  return usedMinutes < settings.safety.dailyLimitMinutes;
}
```

---

## Settings UI Sections

### 1. Family Profile

```
┌──────────────────────────────────────────────┐
│ 👨‍👩‍👧 Family Profile                            │
│                                              │
│ Parent Name     [Sarah Johnson         ]     │
│ Email           sarah@example.com (locked)   │
│ Language        [English ▾]                  │
│ Country         [Rwanda ▾]                   │
│ Timezone        [Africa/Kigali ▾]           │
│                                              │
│ [Save Changes]                                │
└──────────────────────────────────────────────┘
```

### 2. Child Management

```
┌──────────────────────────────────────────────┐
│ 👶 Children                                   │
│                                              │
│ ┌──────────────────────────────┐             │
│ │ 🦁 Annie — Age 5 — English  │             │
│ │ [Edit] [Archive]             │             │
│ └──────────────────────────────┘             │
│                                              │
│ ┌──────────────────────────────┐             │
│ │ 🐧 Nathan — Age 3 — French  │             │
│ │ [Edit] [Archive]             │             │
│ └──────────────────────────────┘             │
│                                              │
│ [+ Add Child]                                 │
└──────────────────────────────────────────────┘
```

Edit opens: name, avatar picker, age, language selector.

Archive: soft-delete, preserves data, can be restored.

### 3. Privacy Controls

```
┌──────────────────────────────────────────────┐
│ 🔒 Privacy                                    │
│                                              │
│ Community Sharing                    [OFF]   │
│ Share child content with other families       │
│                                              │
│ Public Certificates                  [OFF]   │
│ Show certificates in community feed           │
│                                              │
│ Challenge Sharing                    [OFF]   │
│ Share challenge completions                   │
│                                              │
│ Photo Uploads                        [OFF]   │
│ Allow uploading photos to community           │
│                                              │
│ Audio Uploads                        [OFF]   │
│ Video Uploads                        [OFF]   │
│                                              │
│ ℹ All defaults are OFF for child safety.     │
└──────────────────────────────────────────────┘
```

### 4. Talk to Nimi Controls

```
┌──────────────────────────────────────────────┐
│ 🤖 Talk to Nimi                               │
│                                              │
│ Enable Talk to Nimi                  [ON]    │
│ Allow AI conversations with your child        │
│                                              │
│ Voice Input                          [ON]    │
│ Allow speaking to Nimi                        │
│                                              │
│ Voice Output                         [ON]    │
│ Nimi speaks responses aloud                   │
│                                              │
│ Story Assistance                     [ON]    │
│ Nimi can help with story activities            │
│                                              │
│ Personalized Responses               [ON]    │
│ Nimi uses child's name and progress           │
└──────────────────────────────────────────────┘
```

### 5. Safety & Screen Time

```
┌──────────────────────────────────────────────┐
│ ⏰ Safety & Screen Time                       │
│                                              │
│ Daily Time Limit                             │
│ [No Limit ▾]                                 │
│ Options: No Limit / 15 min / 30 min / 60 min │
│                                              │
│ Bedtime Mode                         [OFF]   │
│ Block access during sleeping hours            │
│ From: [20:00] To: [07:00]                   │
│                                              │
│ When limit reached:                           │
│ "Great job today! Time for a break. 🌙"     │
│                                              │
│ ℹ Screen time is tracked per child per day.  │
└──────────────────────────────────────────────┘
```

### 6. Data & Export

```
┌──────────────────────────────────────────────┐
│ 📊 Data & Export                              │
│                                              │
│ [↓ Download Certificates]                    │
│ All earned certificates as PDF                │
│                                              │
│ [↓ Download Achievements]                    │
│ Badges, stars, and milestones                 │
│                                              │
│ [↓ Export Learning History]                   │
│ Complete activity log as CSV                  │
│                                              │
│ [↓ Export Community Posts]                    │
│ All shared content                            │
│                                              │
│ ℹ Your data belongs to you.                  │
└──────────────────────────────────────────────┘
```

### 7. Account Security

```
┌──────────────────────────────────────────────┐
│ 🔐 Security                                   │
│                                              │
│ [Change Password]                             │
│                                              │
│ Two-Factor Authentication            [OFF]   │
│ (future feature)                              │
│                                              │
│ Active Sessions                               │
│ 🖥 Chrome on Windows — Active now            │
│ 📱 Safari on iPhone — 2 days ago             │
│ [Sign out all other sessions]                 │
│                                              │
│ [🔴 Delete Account]                          │
│ Permanently remove all data                   │
└──────────────────────────────────────────────┘
```

---

## Screen Time Enforcement

### How It Works

```
Child opens app
  ↓
Check: is bedtime mode active?
  ↓
  Yes → show "Bedtime! See you tomorrow 🌙" screen, block all interaction
  No  → continue
  ↓
Check: daily limit set?
  ↓
  No  → no restriction
  Yes → start/resume timer
  ↓
Track active minutes (page visible, not idle)
  ↓
5 minutes before limit: "5 more minutes of adventure time! ⏰"
  ↓
Limit reached: "Great job today! Time for a break. 🌙"
Block further interaction until next day.
```

### Storage

```typescript
// Track daily usage in localStorage (client-side, per child)
interface DailyUsage {
  childId: string;
  date: string;        // "2026-06-24"
  minutesUsed: number;
}
```

No server-side enforcement needed for MVP. Client-side timer with localStorage is sufficient — a determined child could bypass it, but that's acceptable for the age range (2-6).

---

## Community Approval Flow

### Hardcoded Rule

**All child-generated content requires parent approval before publication. This cannot be disabled.**

```
Child completes challenge → "Share to Community" appears
  ↓
ShareAchievementFlow triggers ParentGateModal
  ↓
Parent confirms → creation saved with status = 'pending'
  ↓
Parent reviews in Community Approval Center
  ↓
Parent approves → status = 'approved', is_public = true
  ↓
Content visible in community feed
```

The `community.mode` setting controls what the child can SEE:
- `private` → child sees no community content
- `family` → child sees only their own family's posts
- `community` → child sees all approved community posts

But POSTING always requires parent approval regardless of mode.

---

## Mobile UX Specification

### Layout

Single scrollable page with collapsible sections (accordion):

```
[▾] Family Profile
[▸] Children
[▸] Privacy
[▸] Talk to Nimi
[▸] Community
[▸] Language
[▸] Notifications
[▸] Challenges
[▸] Personalization
[▸] Safety & Screen Time
[▸] Data & Export
[▸] Security
```

### Design Rules

| Rule | Implementation |
|---|---|
| Large touch targets | All toggles 48px+ height |
| Simple language | "Allow Sharing" not "Enable Community Content Distribution" |
| Toggle switches | iOS-style toggles for all boolean settings |
| No dropdowns on mobile | Radio buttons or button groups instead |
| Instant feedback | "Saved ✓" appears after every change |
| Section headers | Clear icons + labels, collapsible |
| Safe defaults | All privacy settings OFF, clearly labeled |

### Saving

Auto-save on every toggle change with debounce (500ms). No "Save" button needed for toggles. Text fields save on blur.

Visual feedback: brief "Saved ✓" toast after each change.

---

## Implementation Components

```
app/parents/settings/page.tsx           — Settings hub (accordion layout)

components/parents/settings/
  FamilyProfileSection.tsx              — Parent info, language, country
  ChildManagementSection.tsx            — Child list, add/edit/archive
  PrivacySection.tsx                    — Privacy toggles
  NimiControlsSection.tsx              — AI access controls
  CommunitySection.tsx                  — Community mode selector
  LanguageSection.tsx                   — Learning language preferences
  NotificationSection.tsx               — Notification preferences
  ChallengeSection.tsx                  — Challenge toggles
  PersonalizationSection.tsx            — Name/story personalization
  SafetySection.tsx                     — Screen time, bedtime
  DataExportSection.tsx                 — Download/export buttons
  SecuritySection.tsx                   — Password, sessions
  SettingsToggle.tsx                    — Reusable toggle component
  SettingsSection.tsx                   — Reusable collapsible section
```

---

## Database Impact

### Option A: Extend `parental_settings` (preferred)

```sql
ALTER TABLE parental_settings
  ADD COLUMN IF NOT EXISTS settings_json jsonb DEFAULT '{}';
```

### Option B: Add to `parents` table

```sql
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS family_settings jsonb DEFAULT '{}';
```

Either way: single JSONB column, no new tables, no schema complexity.

### Reading Settings

```typescript
async function getFamilySettings(parentId: string): Promise<FamilySettings> {
  const { data } = await supabase
    .from('parental_settings')
    .select('settings_json')
    .eq('parent_id', parentId)
    .maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data?.settings_json ?? {}) };
}
```

Merge with defaults so missing keys always have safe values.

---

## Implementation Estimate

| Component | Effort |
|---|---|
| Settings data model + defaults | 0.5 day |
| Settings hub page (accordion) | 0.5 day |
| Reusable SettingsToggle + SettingsSection | 0.25 day |
| Family Profile section | 0.25 day |
| Child Management section | 0.5 day |
| Privacy section | 0.25 day |
| Nimi Controls section | 0.25 day |
| Community section | 0.25 day |
| Notification section | 0.25 day |
| Safety & Screen Time | 0.5 day |
| Screen time enforcement (client) | 0.5 day |
| Data Export section | 0.5 day |
| Security section | 0.25 day |
| Learner-side permission checks | 0.5 day |
| Mobile responsiveness | 0.5 day |
| Testing | 1 day |
| **Total** | **6.75 days** |

---

## Dependencies

| SA | Provides |
|---|---|
| SA-2.3 | Personalization engine (controlled by personalization settings) |
| SA-2.4 | Community sharing (controlled by privacy + community settings) |
| SA-4.0 | Parent dashboard layout, route structure |
| SA-4.2 | Notification preferences (subset of family settings) |
| Existing | `parental_settings` table, `children` CRUD, `ParentGateModal` |
