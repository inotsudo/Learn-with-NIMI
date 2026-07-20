# Nimipiko — Story Architecture

---

## Overview

Each story is a self-contained learning package. A child works through it sequentially: they watch optional intro content, then complete 6 mission slots (activities). Completing all 6 slots finishes the story and unlocks the next one. The system is fully multilingual — every piece of content has per-language versions (en / fr / rw) with English as the fallback.

```
Story
 ├── story_versions (per-language: title, cover, intro URLs)
 ├── story_slots (6 mission slots: fixed types)
 │    ├── flipflop_audio
 │    ├── story_pdf
 │    ├── coloring
 │    ├── move_explore
 │    ├── sing_along
 │    └── bonus_video
 ├── weekly_challenges (post-completion bonus activities)
 │    └── weekly_challenge_versions (per-language content_json)
 └── personalized_stories (child's photo + name on cover)
```

---

## Database tables

### `stories` (base table)

The canonical story record. Language-neutral metadata lives here.

```sql
stories (
  id                   uuid primary key,
  slug                 text unique,           -- URL key, e.g. "the-lion-and-the-mouse"
  title                text,                  -- fallback English title
  cover_url            text,                  -- fallback cover image
  sort_order           integer,               -- determines unlock sequence
  theme_emoji          text,                  -- e.g. "🦁"
  is_active            boolean,               -- derived from status (trigger-managed)
  is_free              boolean,               -- freemium gate (first story = true)
  status               text,                  -- draft | review | published | retired
  age_min              integer,               -- optional age recommendation (2–12)
  age_max              integer,
  scheduled_publish_at timestamptz,
  published_at         timestamptz,
  retired_at           timestamptz,
  created_at           timestamptz
)
```

**Status trigger:** `stories_sync_is_active_trigger` keeps `is_active` in sync with `status = 'published'` and stamps `published_at` / `retired_at` automatically.

**Status flow:**
```
draft → review → published → retired
```

---

### `story_versions`

Per-language metadata — title, cover image, and intro media URLs. One row per (story, language).

```sql
story_versions (
  id                   uuid primary key,
  story_id             uuid → stories,
  language             text,           -- en | fr | rw
  title                text,
  cover_url            text,
  intro_video_url      text,           -- teaser video shown before the story starts
  theme_song_url       text,
  meet_characters_url  text,
  story_intro_url      text,
  status               text,           -- draft | review | published | archived
  published            boolean,        -- derived from status (trigger-managed)
  unique (story_id, language)
)
```

Every RPC resolves content with: `COALESCE(requested_language, english_fallback, base_table_value)`.

---

### `story_slots`

Maps one of 6 fixed slot types to a mission. Each slot = one learning activity for that story.

```sql
story_slots (
  story_id   uuid → stories,
  slot_key   text,          -- see Slot Keys below
  mission_id uuid → missions,
  sort_order integer,       -- 1–6, determines display order
  primary key (story_id, slot_key)
)
```

**Slot keys (fixed set):**

| slot_key | Type | What it is |
|---|---|---|
| `flipflop_audio` | listen | Audio story playback |
| `story_pdf` | read | Illustrated PDF / reading pages |
| `coloring` | color | Coloring page activity |
| `move_explore` | move | Physical movement activity |
| `sing_along` | sing | Song with lyrics |
| `bonus_video` | watch | Bonus animated video |

A story is **complete** when the child has a `child_progress` record for all 6 of its slot missions in the child's language.

---

### `story_intro_progress`

Tracks which optional intro items the child has watched/consumed. Does not affect unlock logic — intro is separate from the 6 slots.

```sql
story_intro_progress (
  child_id    uuid → children,
  story_id    uuid → stories,
  language    text,
  slot_key    text,   -- intro_video | theme_song | meet_characters | story_intro
  consumed_at timestamptz,
  unique (child_id, story_id, language, slot_key)
)
```

**Intro keys:**

| intro_key | What it is |
|---|---|
| `intro_video` | Short teaser / trailer |
| `theme_song` | Story's musical theme |
| `meet_characters` | Character introduction clip |
| `story_intro` | Narrator intro before the story begins |

---

### `weekly_challenges`

Bonus activities unlocked after a story is complete. Attached to the story, not to the curriculum.

```sql
weekly_challenges (
  id         uuid primary key,
  story_id   uuid → stories,
  sort_order integer,
  type       text,    -- quiz | creative | explore
  stars      integer
)
```

---

### `weekly_challenge_versions`

Per-language content for each challenge. The `content_json` field holds the challenge payload (quiz questions, creative prompts, etc.) — shape varies by `type`.

```sql
weekly_challenge_versions (
  challenge_id uuid → weekly_challenges,
  language     text,
  title        text,
  description  text,
  content_json jsonb,
  status       text,    -- draft | review | published | archived
  published    boolean, -- trigger-derived from status
  unique (challenge_id, language)
)
```

---

### `weekly_challenge_progress`

Records which challenges a child has completed, per language.

```sql
weekly_challenge_progress (
  child_id     uuid → children,
  challenge_id uuid → weekly_challenges,
  language     text,
  stars_earned integer,
  completed_at timestamptz,
  unique (child_id, challenge_id, language)
)
```

---

### `personalized_stories`

A parent can upload a photo and set the child's name, replacing the cover page of any story.

```sql
personalized_stories (
  child_id        uuid → children,
  story_id        uuid → stories,
  child_name      text,
  child_photo_url text,
  cover_url       text,
  unique (child_id, story_id)
)
```

---

### `assignments` (teacher system)

A teacher can link an assignment to any published story. When a student opens the assignment on the home screen, they get a direct "Read: Story Title" button linking to `/stories/${slug}`.

```sql
assignments (
  story_id  uuid → stories (nullable)
)
```

See [SCHOOL_FEATURES.md](SCHOOL_FEATURES.md) for the full assignments schema.

---

## Unlock & completion logic

All unlock and completion checks live in two private DB functions called by every public RPC:

### `_sa_is_story_unlocked(child_id, story_id, language)`

Returns `true` if the child can access this story:
1. Story must be `status = 'published'`
2. If `sort_order` is the lowest published story → always unlocked (first story is free)
3. For every other story → the previous story (by `sort_order`) must be complete
4. If `is_free = false` → parent must have an active subscription (`_sa_parent_has_subscription`)

### `_sa_is_story_complete(child_id, story_id, language)`

Returns `true` when the child has a `child_progress` record for every slot in `story_slots` that has an active, published mission version.

---

## Public RPCs (client-facing)

All 13 RPCs are `SECURITY DEFINER` and verify ownership via `is_my_child(child_id)`.

| RPC | Purpose |
|---|---|
| `get_story_library_progress(child_id, language)` | Full story list with `unlocked`, `complete`, `progress` (0–1), `is_free` per story |
| `get_current_story(child_id, language)` | Returns the ID of the first incomplete story |
| `get_unlocked_stories(child_id, language)` | List of all story IDs the child can access |
| `get_story_details(story_id, language)` | Language-resolved title, cover, intro URLs for one story |
| `get_story_slots(child_id, story_id, language)` | 6 slots with language-resolved titles + `completed` boolean each |
| `get_story_completion(child_id, story_id, language)` | `total_slots`, `completed_slots`, `is_complete` |
| `complete_story_slot(child_id, mission_id)` | Records slot done; awards stars, badges, certificate; returns `CompleteSlotResult` |
| `get_story_certificate(child_id, story_id, language)` | Returns cert slug + earned_at if the story certificate was awarded |
| `get_story_intro_progress(child_id, story_id, language)` | Which intro items the child has consumed |
| `mark_intro_item_consumed(child_id, story_id, slot_key)` | Marks one intro item as watched |
| `get_weekly_challenges(child_id, story_id, language)` | Bonus challenges for a story with completion status |
| `complete_weekly_challenge(child_id, challenge_id)` | Records challenge done; requires story to be complete first |
| `get_story_recommendations(child_id, language)` | All published stories filtered by child age, with `age_match` boolean |

---

## Completion rewards (inside `complete_story_slot`)

When the 6th slot is completed (story becomes complete for the first time):

| Award | Slug pattern | Condition |
|---|---|---|
| Story-complete badge | `story-{slug}-complete-{lang}` | Always |
| Story certificate | `story-{slug}-certificate-{lang}` | Always |
| Streak badge | `story-streak-{3\|5\|10\|20}-{lang}` | N stories completed in this language |
| All-stories certificate | `all-stories-complete-{lang}` | Every published story complete |
| Trilingual badge | `trilingual-story-{slug}` | Same story complete in all 3 languages |

All awards use `ON CONFLICT DO NOTHING` — idempotent, no duplicate awards.

---

## Freemium gating

```
stories.is_free = true   → any logged-in user can access
stories.is_free = false  → requires active subscription (checked via _sa_parent_has_subscription)
```

By default on deploy, the story with the lowest `sort_order` is set `is_free = true`. Admins can change `is_free` on any story through the admin portal.

The `StoryLibraryItem` type carries `is_free` so the front end can show the lock icon before hitting the DB.

---

## Client-side data access

**Repository files:**

| File | Responsibility |
|---|---|
| `lib/storyRepository.ts` | Library list, current story, details, slots, recommendations, popular, featured |
| `lib/storyProgressRepository.ts` | Complete slot, get completion, intro progress tracking |
| `lib/storyCertificateRepository.ts` | Certificate fetch |
| `lib/story-types.ts` | All TypeScript interfaces matching RPC return shapes |

**Caching strategy** (via `lib/queryCache.ts`):

- `getStoryLibrary` — short TTL (invalidated on slot completion)
- `getStoryDetails` — long TTL (content rarely changes)
- `getStorySlots` — short TTL (completion state changes during a session)
- `getStoryBySlug` — long TTL (structure is stable)
- `getPopularStories` — long TTL, fetched via `/api/popular-stories`
- `getFeaturedStories` — fetched via `/api/featured-stories` (server-side, service role, bypasses RLS for unauthenticated landing page)

Cache busting: `completeStorySlot` calls `qinvalidate` on all progress-related cache keys for that child.

---

## App pages

### `/stories` — Story library

Lists all published stories. Shows progress ring, locked/unlocked state, `is_free` badge. Calls `get_story_library_progress`.

### `/stories/[slug]` — Story detail + player

- Loads story details and the 6 mission slots
- Intro section: optional intro_video / theme_song / meet_characters / story_intro (each tracked via `story_intro_progress`)
- Slot grid: 6 activity cards, each navigating to the mission sub-page
- Completion state: progress bar, certificate reveal, next-story unlock animation
- Weekly challenges section below the slots (unlocked after story complete)

### `/stories/[slug]/mission` — Mission player

Individual mission activity inside a story slot. On completion calls `complete_story_slot` and shows the reward animation.

---

## Story content flow (admin)

```
Admin creates story draft
  → fills in base story fields (title, sort_order, emoji, age range)
  → adds story_versions for each language (title, cover, intro URLs)
  → creates story_slots (maps slot_key → existing mission)
  → creates weekly_challenges + weekly_challenge_versions
  → sets status = 'published' (trigger sets is_active = true)
```

The admin portal CMS covers all of the above. Publishing updates `is_active` automatically via the `stories_sync_is_active_trigger`.
