# SA.0.2 — Implementation Readiness Report

## 1. Database Readiness

### New Tables (6)

| Table | Rows per story | Scope |
|-------|---------------|-------|
| `story_versions` | 1-3 (per language) | Medium |
| `story_slots` | 6 | Small |
| `story_intro_progress` | 0-4 per child per story | Small |
| `weekly_challenges` | 1 | Small |
| `weekly_challenge_versions` | 1-3 | Small |
| `weekly_challenge_progress` | 0-1 per child | Small |

### Table Extensions (1)

| Table | New Columns |
|-------|-------------|
| `stories` | `status`, `age_min`, `age_max`, `scheduled_publish_at`, `published_at`, `retired_at` |

### New RPCs (13)

| RPC | Scope |
|-----|-------|
| `get_current_story(child_id, language)` | Medium |
| `is_story_unlocked(child_id, story_id, language)` | Small |
| `is_story_complete(child_id, story_id, language)` | Small |
| `complete_story_mission(child_id, mission_id)` | Large |
| `get_story_progress(child_id, story_id)` | Medium |
| `get_all_stories_with_progress(child_id, language)` | Medium |
| `record_intro_consumed(child_id, story_id, slot_key)` | Small |
| `complete_weekly_challenge(child_id, challenge_id)` | Medium |
| `admin_validate_story_publishable(story_id)` | Medium |
| `admin_publish_story(story_id)` | Small |
| `admin_retire_story(story_id)` | Small |
| `admin_reorder_stories(story_ids[])` | Small |
| `get_story_integrity_report()` | Medium |

## 2. CMS Readiness

| Admin Section | Change | Scope |
|---|---|---|
| StoryManager | Add status lifecycle, age range, scheduled_publish_at, validation | Large |
| StoryEditor | Add 4 intro URLs, story_versions per language, 6-slot grid, weekly challenge | Large |
| MissionEditor | No change (reused) | None |
| PublishingCenter | Story publishing integration | Medium |
| Sidebar | Add "Legacy Curriculum" collapsed section for BK admin | Small |
| **NEW:** Story Slot Editor | Assign/create missions per slot | Medium |
| **NEW:** Weekly Challenge Editor | CRUD in StoryEditor | Medium |

## 3. Learner Flow Readiness

### New Routes (6)

| Route | Components Needed | Scope |
|-------|------------------|-------|
| `/stories` | StoryLibraryGrid, StoryCard | Large |
| `/stories/[slug]` | StoryDetailView, IntroPlayer, MeetCharacters | Large |
| `/stories/[slug]/intro/[step]` | IntroPlayer (video/audio/animation) | Medium |
| `/stories/[slug]/mission/[slot]` | Reuses all 6 existing renderers | Medium |
| `/stories/[slug]/certificate` | StoryCertificateView | Medium |
| `/stories/[slug]/challenge` | WeeklyChallengePlayer | Large |

### Components to Create (9)

| Component | Scope |
|-----------|-------|
| StoryLibraryGrid | Medium |
| StoryCard (cover + progress + lock) | Small |
| StoryDetailView | Large |
| IntroPlayer | Medium |
| MeetCharacters | Medium |
| StoryCertificateView | Medium |
| WeeklyChallengeCard | Small |
| WeeklyChallengePlayer (quiz/creative/explore) | Large |
| CoverNameOverlay | Small |

### Components to Adapt (7)

| Component | Change |
|-----------|--------|
| StoryJourney.tsx | Dynamic data from `get_story_progress` |
| CertificatePanel.tsx | Support 6-step story certificates |
| DashboardHero.tsx | Show current story |
| TalkToNimi.tsx | Pass story context to AI |
| _achievementData.ts | Add story achievement tier |
| ActivityGrid.tsx | Story mode vs legacy mode |
| app/page.tsx | Story-focused homepage |

## 4. Content Readiness (Minimum Viable Story)

| Item | Requirement |
|------|-------------|
| Story record | 1 published story |
| Story version (en) | Title + cover URL |
| 4 intro URLs | All set on English version |
| FlipFlop mission | + 3 story pages with English versions |
| Story PDF mission | + PDF media_url |
| Coloring mission | + 1 coloring page |
| Move & Explore mission | + video media_url |
| Sing Along mission | + audio + lyrics |
| Bonus Video mission | + video media_url |
| 6 story_slots | All mapped |
| Weekly Challenge (optional) | 1 with English version |

## 5. Migration Safety

| Risk | Severity | Mitigation |
|------|----------|------------|
| Adding columns to `stories` | Low | All nullable or defaulted |
| `is_active` derivation trigger | Medium | Set `status` from existing `is_active` first |
| Existing `child_progress` | None | Table unchanged |
| Existing `child_achievements` | None | New slugs coexist |
| Token migration `[NAME]` → `{child_name}` | Low | Support both in client |

## 6. Dependency Order (Critical Path)

```
SA-1.1: Schema (tables + columns)
  ↓
SA-1.2: Core RPCs (complete_story_mission, is_story_complete, etc.)
  ↓
SA-1.3: Progress RPCs (get_story_progress, get_all_stories_with_progress)
  ↓
SA-1.4: Admin RPCs (validate, publish, retire, reorder)
  │
  ├──→ SA-2.1: Admin CMS (StoryManager + StoryEditor updates)
  │      ↓
  │    SA-2.2: Admin Weekly Challenge editor
  │      ↓
  │    SA-2.3: Content seed (create first story via CMS)
  │
  ├──→ SA-3.1: Learner Story Library (/stories)
  │      ↓
  │    SA-3.2: Learner Story Detail (/stories/[slug])
  │      ↓
  │    SA-3.3: Learner Mission Player (/stories/[slug]/mission/[slot])
  │      ↓
  │    SA-3.4: Learner Certificate
  │      ↓
  │    SA-3.5: Learner Weekly Challenge
  │
  └──→ SA-1.5: Weekly Challenge schema
       SA-1.6: Scheduled publishing (cron)
       SA-3.6: Personalization ({child_name} + age filter)
       SA-3.7: Dashboard integration
```

## 7. Scope Estimates

| Phase | Work Items | Estimate |
|-------|-----------|----------|
| SA-1 (Database) | 1 migration + 13 RPCs + RLS | Large |
| SA-2 (Admin CMS) | 2 major component updates + content seed | Large |
| SA-3 (Learner UI) | 6 routes + 9 new components + 7 adaptations | Very Large |
| Total | | ~3-4 sprints |

## 8. Go/No-Go Checklist

| # | Condition | Status |
|---|---|---|
| 1 | SA.0.2 validation approved by product owner | **PENDING** |
| 2 | "Meet Nimi & Piko" confirmed as 4th intro item | **PENDING** |
| 3 | Scheduled publishing scope confirmed | **PENDING** |
| 4 | Weekly Challenge content types confirmed | **PENDING** |
| 5 | Age filtering behavior confirmed (hard vs soft) | **PENDING** |
| 6 | Token standardization approved | **PENDING** |
| 7 | Existing `stories` table data audited | **PENDING** |
| 8 | BK coexistence rule confirmed (dormant) | **PENDING** |
| 9 | Cover name overlay design spec exists | **PENDING** |
| 10 | First story assets identified/available | **PENDING** |
| 11 | RLS policy patterns reviewed | **PENDING** |
| 12 | No breaking changes to existing data | **CONFIRMED** |

---

**Do not start SA-1 until conditions 1-11 are resolved.**
