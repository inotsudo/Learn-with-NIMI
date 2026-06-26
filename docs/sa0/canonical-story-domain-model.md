# SA.0.2 — Canonical Story Domain Model (Final)

## 1. Story Entity

**Table: `stories` (EXTENDED)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated |
| `slug` | text UNIQUE | URL-safe identifier |
| `title` | text NOT NULL | Admin display title |
| `cover_url` | text | Cover illustration path |
| `sort_order` | integer UNIQUE NOT NULL | Unlock sequence order |
| `status` | text CHECK `draft/review/published/retired` | Lifecycle state |
| `is_active` | boolean (derived) | Trigger: `status = 'published'` |
| `age_min` | integer CHECK 2-12 | Lower age bound |
| `age_max` | integer CHECK 2-12 | Upper age bound |
| `theme_emoji` | text | Card emoji |
| `scheduled_publish_at` | timestamptz | Future auto-publish time |
| `published_at` | timestamptz | Actual publish timestamp |
| `retired_at` | timestamptz | Retirement timestamp |
| `created_at` | timestamptz | Auto |

**Lifecycle:** `draft → review → published → retired`

## 2. Story Structure (Final: 4 intro + 6 missions)

```
Story
├── INTRO SEQUENCE (4 items on story_versions, not missions)
│   ├── intro_video_url        (sort: 0)
│   ├── theme_song_url         (sort: 1)
│   ├── meet_characters_url    (sort: 2)  ← NEW from validation
│   └── story_intro_url        (sort: 3)
│
├── ACTIVE MISSIONS (6 items via story_slots → missions)
│   ├── flipflop_audio   type:'story'  (sort: 4)
│   ├── story_pdf        type:'read'   (sort: 5)
│   ├── coloring         type:'color'  (sort: 6)
│   ├── move_explore     type:'move'   (sort: 7)
│   ├── sing_along       type:'sing'   (sort: 8)
│   └── bonus_video      type:'watch'  (sort: 9)
│
└── POST-COMPLETION
    ├── Certificate    (sort: 10)
    └── Weekly Challenge (sort: 11)
```

**Completion = 6/6 active missions.** Intro is tracked but not required.

## 3. New Tables

**`story_versions`** (per-language metadata + intro URLs)

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `story_id` | uuid FK → stories |
| `language` | text CHECK en/fr/rw |
| `title` | text NOT NULL |
| `cover_url` | text |
| `intro_video_url` | text |
| `theme_song_url` | text |
| `meet_characters_url` | text |
| `story_intro_url` | text |
| `status` | text CHECK draft/review/published/archived |
| `published` | boolean (derived) |
| UNIQUE | (story_id, language) |

**`story_slots`** (6 mission slots per story)

| Column | Type |
|--------|------|
| `story_id` | uuid FK → stories |
| `slot_key` | text CHECK flipflop_audio/story_pdf/coloring/move_explore/sing_along/bonus_video |
| `mission_id` | uuid FK → missions |
| `sort_order` | integer 1-6 |
| PK | (story_id, slot_key) |

**`story_intro_progress`** (lightweight intro tracking)

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `child_id` | uuid FK → children |
| `story_id` | uuid FK → stories |
| `language` | text CHECK en/fr/rw |
| `slot_key` | text CHECK intro_video/theme_song/meet_characters/story_intro |
| `consumed_at` | timestamptz |
| UNIQUE | (child_id, story_id, language, slot_key) |

**`weekly_challenges`**

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `story_id` | uuid FK → stories |
| `type` | text CHECK quiz/creative/explore |
| `stars` | integer |
| `sort_order` | integer |

**`weekly_challenge_versions`**

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `challenge_id` | uuid FK → weekly_challenges |
| `language` | text CHECK en/fr/rw |
| `title` | text |
| `description` | text |
| `content_json` | jsonb |
| `status` | text CHECK draft/review/published/archived |
| `published` | boolean (derived) |
| UNIQUE | (challenge_id, language) |

**`weekly_challenge_progress`**

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `child_id` | uuid FK → children |
| `challenge_id` | uuid FK → weekly_challenges |
| `language` | text CHECK en/fr/rw |
| `stars_earned` | integer |
| `completed_at` | timestamptz |
| UNIQUE | (child_id, challenge_id, language) |

## 4. Progression Rules

- Stories ordered by `sort_order`
- Story 1 always unlocked
- Story N+1 unlocked when N's 6 missions complete (per child+language)
- Retired stories skipped in predecessor chain
- Progress is per (child_id, language)
- No time-gating; child can complete all 6 slots in one session

## 5. Achievement Slugs

| Pattern | Type | Trigger |
|---------|------|---------|
| `story-{slug}-complete-{lang}` | badge | 6/6 missions done |
| `story-{slug}-certificate-{lang}` | certificate | 6/6 missions done (simultaneous with badge) |
| `story-streak-{N}-{lang}` | badge | N stories completed (3, 5, 10, 20) |
| `all-stories-complete-{lang}` | certificate | Every published story done |
| `trilingual-story-{slug}` | badge | Same story done in en+fr+rw |

## 6. Weekly Challenges

- 1 per story (1:1)
- Unlocked after story completion
- Not required for next story
- Not time-gated
- Types: quiz, creative, explore
- Awards bonus stars

## 7. Personalization

- Token: `{child_name}` — client-side `replaceAll` at render time
- Scope: story page text, mission content, NOT titles
- Cover: client-side text overlay on template image
- Age filtering: stories filtered by `children.age BETWEEN age_min AND age_max`
- Photo injection: NOT in scope for SA.0

## 8. Publishing Rules

**10 blocking checks:**
1. English `story_version` published
2. Cover URL exists
3. All 6 `story_slots` exist
4. All slot missions active
5. All slot missions have published English version
6. FlipFlop has story_pages
7. FlipFlop pages have English versions
8. Coloring has coloring_pages
9. `sort_order` unique and set
10. `age_min <= age_max`, both set

**Non-blocking warnings:** Full 3-language coverage, all intro URLs set, weekly challenge exists

## 9. Content Release

- Primary: manual publish via admin
- Optional: `scheduled_publish_at` + cron auto-publishes at scheduled time
- Retirement: manual, preserves data, skipped in unlock chain

## 10. Dormant BK Tables

| Table | Status |
|-------|--------|
| `categories` | DORMANT — freeze, don't delete |
| `level_missions` | DORMANT |
| `curriculum_levels` | DORMANT |
| `curriculum_units` | DORMANT |
| `child_badges` | DORMANT |

All existing RPCs (`get_current_level`, `get_curriculum_missions`, `complete_curriculum_mission`) remain in database but are not called from new Story Adventure code.
