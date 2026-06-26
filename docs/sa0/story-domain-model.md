# SA.0.1 — NIMIPIKO Story Domain Model Specification

---

# DOCUMENT 1: story-domain-model.md

---

### 1. What Is a Story?

**Definition:** A Story is the top-level content container in the Story Adventure model. One Story = one narrative experience (e.g., "Nathan and the Talking Faces"). A child works through all slots within a Story before unlocking the next.

**Required Fields:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | no | Auto-generated |
| `slug` | text UNIQUE | no | URL-safe identifier, e.g. `nathan-talking-faces` |
| `title` | text | no | Default/admin display title (English) |
| `cover_url` | text | yes | Cover illustration storage path |
| `sort_order` | integer | no | Global ordering across all stories; determines unlock sequence |
| `status` | text | no | `draft` / `review` / `published` / `retired` |
| `age_min` | integer | no | Lower age bound (2-12) |
| `age_max` | integer | no | Upper age bound (2-12) |
| `theme_emoji` | text | yes | Display emoji for cards |
| `created_at` | timestamptz | no | Auto |
| `published_at` | timestamptz | yes | Set when status first transitions to `published` |
| `retired_at` | timestamptz | yes | Set when status transitions to `retired` |

**New table: `story_versions`** (per-language metadata):

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | no | Auto-generated |
| `story_id` | uuid FK -> stories | no | |
| `language` | text `en/fr/rw` | no | |
| `title` | text | no | Localized title |
| `cover_url` | text | yes | Language-specific cover (supports `{child_name}` on cover) |
| `published` | boolean | no | Derived from status via trigger, same pattern as `mission_versions` |
| `status` | text | no | `draft` / `review` / `published` / `archived` |
| UNIQUE | `(story_id, language)` | | |

**Lifecycle States:**

```
draft ──→ review ──→ published ──→ retired
  ↑          │            │
  └──────────┘            │  (can create new revision while published)
                          ↓
                     retired (soft delete; invisible to children; keeps progress data)
```

**Key design note:** The existing `stories` table (001) is retained and extended. The `is_active` boolean column becomes derived from `status = 'published'` via trigger, identical to the `mission_versions` pattern established in migration 028.

---

### 2. Story Structure -- THE KEY ARCHITECTURAL DECISION

**RECOMMENDATION: Option (c) -- 3 intro steps (consumed once) + 6 active missions (tracked for completion)**

**Justification:**

| Factor | Why option (c) wins |
|--------|-------------------|
| Toddler UX (ages 2-5) | The intro sequence (video, song, story introduction) is a "warm-up ritual." Tracking it as consumed/not-consumed prevents the child from being stuck on passive content but does not pollute the star/completion model with things the child didn't "do." |
| Parent expectations | A certificate that says "completed 6 activities" makes intuitive sense. Parents understand "watched a video" is not the same as "completed a coloring activity." |
| Certificate meaning | Stars are earned through interactive effort. The certificate reflects real engagement (listen, read, color, move, sing, watch-bonus). |
| Simplicity | The intro sequence maps to 3 media URLs on the `story_versions` table (no separate mission rows needed). The 6 active missions map cleanly to `story_slots` + `missions` + `mission_versions`, reusing the existing mission infrastructure. |
| Replay value | Intro content is always accessible (no lock). Active missions can be replayed for fun but only count for completion once. |

**Formal Model:**

```
Story
├─ INTRO SEQUENCE (3 items, stored as columns on story_versions)
│  ├─ intro_video_url     (slot_key: 'intro_video')
│  ├─ theme_song_url      (slot_key: 'theme_song')
│  └─ story_intro_url     (slot_key: 'story_intro')
│
├─ ACTIVE MISSIONS (6 items, stored as story_slots → missions → mission_versions)
│  ├─ Slot 1: flipflop_audio  (type: 'story',  listen page-by-page)
│  ├─ Slot 2: story_pdf       (type: 'read',   read along)
│  ├─ Slot 3: coloring        (type: 'color',  coloring activity)
│  ├─ Slot 4: move_explore    (type: 'move',   movement activity)
│  ├─ Slot 5: sing_along      (type: 'sing',   singing activity)
│  └─ Slot 6: bonus_video     (type: 'watch',  bonus video)
│
└─ POST-COMPLETION
   ├─ Certificate (auto-awarded)
   └─ Weekly Challenge (unlocked)
```

**Intro tracking:** A single `story_intro_progress` table records when a child has consumed each intro item. This is lightweight -- no stars, no missions, just a timestamp.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `child_id` | uuid FK -> children | |
| `story_id` | uuid FK -> stories | |
| `language` | text `en/fr/rw` | |
| `slot_key` | text CHECK `intro_video/theme_song/story_intro` | |
| `consumed_at` | timestamptz | |
| UNIQUE | `(child_id, story_id, language, slot_key)` | |

**Intro is NOT required for story completion.** The intro sequence is always accessible regardless of completion state. It exists to build context and excitement, not gate progress.

---

### 3. Mission Model

**Relationship chain:**

```
Story (1) ──→ (6) story_slots ──→ (1) mission ──→ (N) mission_versions (per language, per revision)
```

**New table: `story_slots`**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `story_id` | uuid FK -> stories | no | |
| `slot_key` | text | no | One of: `flipflop_audio`, `story_pdf`, `coloring`, `move_explore`, `sing_along`, `bonus_video` |
| `mission_id` | uuid FK -> missions | no | The mission assigned to this slot |
| `sort_order` | integer | no | Display order within the story (1-6) |
| PRIMARY KEY | `(story_id, slot_key)` | | |

**Key architectural decisions:**

**Q: Can the same mission row be used in multiple stories?**
**A: No.** Every mission is unique to one story. Rationale:
- The content (lyrics, prompts, media) is story-specific. "Color the characters from Nathan's story" is not reusable for a different story.
- The existing `missions.story_id` FK already implies this 1:1 conceptual binding.
- If truly generic activities are needed (e.g., "Drink Water"), they belong in the legacy BK Curriculum model, not the Story Adventure model.

**Q: What about intro content -- are those missions?**
**A: No.** Intro content is stored as media URL columns on `story_versions`:
- `intro_video_url` (text, nullable)
- `theme_song_url` (text, nullable)
- `story_intro_url` (text, nullable)

This avoids creating 3 mission rows per story that have no stars, no completion logic, and no language-versioned content beyond a URL.

**Missions table changes:**
- The existing `missions` table is reused as-is.
- `missions.category_slug` remains required. For Story Adventure missions, the category_slug maps to the legacy BK category that most closely matches the slot type:
  - `flipflop_audio` -> category `flipflop`
  - `story_pdf` -> category `discovery`
  - `coloring` -> category `coloring`
  - `move_explore` -> category `movement`
  - `sing_along` -> category `morning`
  - `bonus_video` -> category `zoom`
- `missions.story_id` FK is set for all Story Adventure missions.
- `missions.type` CHECK must be extended to include all needed types. Current: `'sing','move','color','watch','read','story'`. No new types needed.

**mission_versions:** Reused exactly as-is. Each story slot mission has up to 3 language versions (en/fr/rw), with the same `status`/`published`/`revision_number`/`is_current` lifecycle from migrations 028/037.

---

### 4. Progression Rules

See Document 3 (story-progression-spec.md) for full pseudocode.

**Summary:**
- Stories are ordered by `stories.sort_order` globally
- Story 1 is always unlocked
- Story N+1 unlocks when Story N's 6 active missions are all completed (for the child's current language)
- Progress is per `(child_id, language)` -- switching languages starts a separate journey (same pattern as existing curriculum)
- No time-gating; no "daily" restriction. A child can complete all 6 slots in one session or across multiple sessions.

---

### 5. Achievement Rules

See Document 3 (story-progression-spec.md) for full trigger logic.

**Achievement slug catalog:**

| Slug Pattern | Type | Trigger | Example |
|-------------|------|---------|---------|
| `story-{slug}-complete-{lang}` | badge | All 6 active slots completed for this story in this language | `story-nathan-talking-faces-complete-en` |
| `story-{slug}-certificate-{lang}` | certificate | Same trigger as badge (awarded simultaneously) | `story-nathan-talking-faces-certificate-en` |
| `all-stories-complete-{lang}` | certificate | Every published story completed in this language | `all-stories-complete-en` |
| `story-streak-{N}-{lang}` | badge | N stories completed in this language (milestone: 3, 5, 10, 20) | `story-streak-5-en` |
| `trilingual-story-{slug}` | badge | Same story completed in all 3 languages | `trilingual-story-nathan-talking-faces` |

**Compatibility:** These use the existing `child_achievements` table (migration 012) with its `(child_id, language, type, slug)` unique constraint. For language-independent achievements (trilingual badges), use `language = 'en'` as canonical (the slug itself encodes the cross-language nature).

---

### 6. Weekly Challenge Rules

**Definition:** A Weekly Challenge is a bonus activity that unlocks after a child completes all 6 active missions in a Story. It is NOT time-gated.

**New table: `weekly_challenges`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `story_id` | uuid FK -> stories | The story this challenge belongs to |
| `sort_order` | integer | If multiple challenges per story (future-proofing), ordering |
| `type` | text CHECK `quiz/creative/explore` | Challenge type |
| `stars` | integer | Bonus stars awarded |
| `created_at` | timestamptz | |

**New table: `weekly_challenge_versions`** (per-language)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `challenge_id` | uuid FK -> weekly_challenges | |
| `language` | text `en/fr/rw` | |
| `title` | text | |
| `description` | text | |
| `content_json` | jsonb | Challenge-type-specific payload (quiz questions, creative prompt, exploration checklist) |
| `status` | text CHECK `draft/review/published/archived` | Same workflow as mission_versions |
| `published` | boolean | Trigger-derived from status |
| UNIQUE | `(challenge_id, language)` | |

**Rules:**
- One challenge per story at launch (cardinality: 1:1, Story -> WeeklyChallenge)
- The challenge is unlocked when `is_story_complete(child_id, story_id, language)` returns true
- The challenge is NOT required to unlock the next story
- The challenge is always available once unlocked (no weekly time window)
- Naming: "Weekly Challenge" is a UX label, not a temporal constraint. The name conveys "this is a special/bonus activity."

**New table: `weekly_challenge_progress`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `child_id` | uuid FK -> children | |
| `challenge_id` | uuid FK -> weekly_challenges | |
| `language` | text `en/fr/rw` | |
| `stars_earned` | integer | |
| `completed_at` | timestamptz | |
| UNIQUE | `(child_id, challenge_id, language)` | |

---

### 7. Personalization Rules

**Name substitution:**
- The `{child_name}` token (and its language variants `{prénom}` for French, `{izina}` for Kinyarwanda) is substituted at **render time** in the client, not stored as personalized data.
- Scope of substitution:
  - Story page text (`story_page_versions.text`): YES
  - Mission content (`mission_versions.content_json` lyrics/prompts): YES (already established, see migration 041 `[NAME]` tokens)
  - Story titles (`story_versions.title`): NO. Titles are fixed. The cover might show the child's name, but that is an overlay, not a data mutation.
  - Cover images: The child's name is rendered as a text overlay on the cover image at display time. `story_versions.cover_url` points to a template image. The client composites `{child_name}` on top.

**Token convention (standardize):**
- Adopt `{child_name}` as the universal token across all languages
- Deprecate `[NAME]`, `[PRENOM]`, `[IZINA]` from migration 041
- Client performs: `text.replaceAll('{child_name}', child.name)`

**Photo injection:**
- NOT in scope for SA.0.1
- Future consideration: `children.photo_url` already effectively exists via `children.avatar_url`
- When implemented: client-side composition (overlay child photo onto illustration template), not server-side image generation

**Storage vs rendering:**
- All personalization is **render-time, client-side**
- Database stores templates with tokens
- No per-child content rows are generated
- This keeps storage O(stories * languages), not O(stories * languages * children)

---

### 8. Story Publishing Rules

**Validation checklist for `status: draft -> published`:**

| # | Check | Rule |
|---|-------|------|
| 1 | Story has a `story_version` with `status = 'published'` for at least English (`en`) | Minimum 1 language required |
| 2 | Story has a cover URL (either `stories.cover_url` or `story_versions.cover_url` for en) | Visual required for card display |
| 3 | All 6 `story_slots` exist for this story | No empty slots allowed |
| 4 | Every slot's `mission_id` references an active mission (`missions.active = true`) | No dangling slot references |
| 5 | Every slot's mission has at least 1 published `mission_version` in English | Content must be available |
| 6 | For FlipFlop Audio slot: `stories` has associated `story_pages` with at least 1 page | FlipFlop requires page content |
| 7 | For FlipFlop Audio slot: every `story_page` has a `story_page_version` published for English | Pages must have text |
| 8 | For Coloring slot: `stories` has associated `coloring_pages` with at least 1 page | Coloring requires templates |
| 9 | `stories.sort_order` is unique and not null | Ordering must be unambiguous |
| 10 | `stories.age_min <= stories.age_max` | Age range valid |

**Recommended (warning, not blocking):**
- All 6 slots have published `mission_versions` in all 3 languages (en, fr, rw)
- Story pages have page versions in all 3 languages
- Intro content URLs are set (intro_video_url, theme_song_url, story_intro_url) on at least the English story_version
- Weekly Challenge exists and has at least 1 published language version

**Implementation:** This checklist is encoded as an RPC `admin_validate_story_publishable(p_story_id uuid)` that returns a JSONB object with `{publishable: boolean, errors: string[], warnings: string[]}`. The admin UI calls this before allowing status transition.

---

### 9. Admin Workflow

**Creating a Story:**

1. Admin clicks "New Story" in StoryManager
2. System creates `stories` row with `status = 'draft'`, auto-generates slug from title
3. System creates `story_versions` row for `language = 'en'` with `status = 'draft'`
4. Admin fills in: title, cover, age range, theme emoji
5. Admin optionally adds French and Kinyarwanda story versions

**Adding Content to Slots:**

1. Admin navigates to Story detail view
2. Admin sees 6 slot cards (flipflop_audio, story_pdf, coloring, move_explore, sing_along, bonus_video) -- all empty initially
3. For each slot, admin clicks "Create Mission":
   a. System creates `missions` row (category_slug auto-mapped from slot_key, active = false)
   b. System creates `story_slots` row linking story -> mission
   c. Admin fills in English `mission_versions` content (title, subtitle, tip, media_url, content_json)
   d. Admin optionally adds FR/RW versions
   e. Admin publishes each version (status: draft -> published)
   f. System sets `missions.active = true` when first language version is published
4. For FlipFlop Audio slot: admin also creates/manages `story_pages` + `story_page_versions` (existing StoryEditor flow)
5. For Coloring slot: admin also creates/manages `coloring_pages` (existing flow)
6. Admin sets intro content URLs on `story_versions` (intro_video_url, theme_song_url, story_intro_url)

**Publishing:**

1. Admin clicks "Publish Story"
2. System calls `admin_validate_story_publishable(story_id)`
3. If errors: display them, block publish
4. If warnings only: display them, allow admin to proceed
5. On confirm: system sets `stories.status = 'published'`, `stories.published_at = now()`, trigger sets `stories.is_active = true`
6. All `story_versions` with `status = 'draft'` are NOT auto-published (admin must publish each language version individually)

**Reordering:**

1. Admin drags stories in list view to change `sort_order`
2. System calls `admin_reorder_stories(p_story_ids uuid[])` which sets `sort_order = array_index` for each story
3. Reordering affects unlock sequence for NEW children. Children who already unlocked Story N keep it unlocked.

**Retiring:**

1. Admin clicks "Retire Story" on a published story
2. System sets `stories.status = 'retired'`, `stories.retired_at = now()`, trigger sets `stories.is_active = false`
3. Children who were mid-story: their progress is preserved, but the story disappears from the dashboard
4. The sort_order gap is left in place (not compacted) to avoid reordering side effects
5. Unlock logic skips retired stories: if Story 3 is retired, completing Story 2 unlocks Story 4

---

