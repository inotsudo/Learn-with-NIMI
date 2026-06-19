# NIMI Lesson Template Standard
## Canonical Structure for All 1,248 Curriculum Lessons

**Version:** 1.0 — established with Level 1, Unit 1 (BK.4B.1)
**Applies to:** All lessons across Level 1, Level 2, and Level 3

---

## 1. Overview

Every lesson in the NIMI curriculum is a single **Mission** — one category slot within a Unit.
A Mission has one **Mission Record** (shared across languages) and one **Mission Version** per
language (EN / FR / RW). The lesson template defines what goes into each of those records and
how the authored content maps to the CMS fields.

---

## 2. Mission Record (language-independent)

Stored in the `missions` table. Set once; not translated.

| Field | Type | Value source |
|---|---|---|
| `category_slug` | string | One of 8 fixed slugs (see §5) |
| `type` | MissionType | Derived from category default (see §5) |
| `sequence` | integer | Auto-assigned by import RPC |
| `stars` | integer | Default `10` for all Level 1–3 lessons |
| `duration_minutes` | integer | Default `10` for all Level 1–3 lessons |
| `active` | boolean | Set to `true` when at least one language is published |

---

## 3. Mission Version (per language: EN / FR / RW)

Stored in `mission_versions`. One row per `(mission_id, language, revision_number)`.

| CMS Field | Max Length | Purpose | Required |
|---|---|---|---|
| `title` | 120 chars | Lesson title shown in the app | ✓ |
| `subtitle` | 200 chars | One-line hook / teaser shown below title | — |
| `tip_text` | 400 chars | Parent/caregiver guidance shown before the activity | — |
| `media_url` | — | Illustration or video reference URL | — |
| `content_json` | — | Playable content; structure varies by type (see §6) | ✓ |
| `status` | enum | `draft` → `review` → `published` | ✓ |

---

## 4. Lesson Document Standard

Each authored lesson in a content file uses the following block structure.
Every block must be present; omit a field only if it is genuinely not applicable
(e.g. no materials required for a watch activity).

```
### [Category Emoji] [Category Label] — [Lesson Title in English]

**Blueprint Objective:** [Exact objective from blueprint doc]
**Mission Type:** [sing | move | color | watch | read | story]
**Duration:** [5–10 minutes — always within this range for Level 1]

#### Learning Objective
[One sentence. Starts with the child as subject. Uses observable verb.]

#### Materials
- [Item 1]
- [Item 2]
_(none required)_ if digital/screen-only activity

#### Activity Instructions
1. [Step — adult action]
2. [Step — adult action or prompt]
3. [Step — child action]
...

#### Parent Guidance
[2–3 sentences. What to watch for, how to scaffold, when to celebrate.]

#### Success Criteria
| Level | Observable behaviour |
|---|---|
| Emerging | [lowest bar — any attempt] |
| Developing | [mid — partial response] |
| Mastered | [full — independent response] |

#### Language Versions

##### English
- **Title:** [title]
- **Subtitle:** [subtitle]
- **Tip Text:** [parent tip in English]
- **Content JSON:**
  ```json
  { ... }
  ```

##### Français
- **Title:** [titre]
- **Subtitle:** [sous-titre]
- **Tip Text:** [conseil en français]
- **Content JSON:**
  ```json
  { ... }
  ```

##### Kinyarwanda
- **Title:** [izina]
- **Subtitle:** [incamake]
- **Tip Text:** [inama y'umubyeyi]
- **Content JSON:**
  ```json
  { ... }
  ```
```

---

## 5. Category → Type Mapping

| Category Slug | Label | Mission Type | Content JSON Root Key |
|---|---|---|---|
| `morning` | Morning Song | `sing` | `lyrics` (string[]) |
| `movement` | Movement Mission | `move` | `prompts` (Prompt[]) |
| `artistic` | Mission Artistique | `color` | `instructions` (string) |
| `histoire` | Mission Historique | `read` | `text` (string) |
| `zoom` | Mission Zoom | `watch` | `instructions` (string) |
| `discovery` | Mission Discovery | `watch` | `instructions` (string) |
| `flipflop` | FlipFlop Book | `story` | *Pages live in `stories` / `story_pages` / `story_page_versions` — see §6f* |
| `coloring` | Coloring Book | `color` | `instructions` (string) |

**Prompt shape:** `{ "emoji": "🏃", "label": "Action description" }`

---

## 6. Content JSON Specifications per Type

### 6a. `sing` (Morning Song)

```json
{
  "lyrics": [
    "Line 1 of verse — (action cue in parentheses)",
    "Line 2 of verse",
    "Line 3 of verse",
    "Line 4 of verse",
    "",
    "(Chorus)",
    "Chorus line 1",
    "Chorus line 2"
  ]
}
```

Rules:
- Each element in the array is one singable line or an empty string (line break).
- Action cues are embedded in parentheses at end of line: `"Wave your hand (wave)"`.
- `[NAME]` is the placeholder token the app replaces with the child's name.
- Maximum 12 lines per language version. Level 1: max 8 lines.
- No musical notation in the JSON — tempo and melody reference goes in `tip_text`.

### 6b. `move` (Movement Mission)

```json
{
  "prompts": [
    { "emoji": "👋", "label": "Wave your hand and say Hello!" },
    { "emoji": "🚶", "label": "Walk to your grown-up" },
    { "emoji": "😊", "label": "Give a big smile" },
    { "emoji": "🤗", "label": "Celebrate with a hug!" }
  ]
}
```

Rules:
- 3–6 prompts for Level 1; up to 8 for Level 3.
- Each label is one short, imperative sentence (≤ 60 chars).
- Emoji must match the physical action (child-readable visual cue).
- Sequence flows naturally: set-up → action → response → close.

### 6c. `color` (Mission Artistique + Coloring Book)

```json
{
  "instructions": "Press your hand in paint and stamp it on the paper. Tell your grown-up: Hello, this is my hand!"
}
```

Rules:
- One paragraph of instructions, spoken-word tone.
- Always ends with what the child should say/do to complete the activity.
- Level 1: max 3 sentences. Level 3: up to 6.

### 6d. `watch` (Mission Zoom + Mission Discovery)

```json
{
  "instructions": "Watch the friendly faces! See them wave and smile. Can you wave too? Hello! Bonjour! Muraho!"
}
```

Rules:
- Same format as `color` — one instruction paragraph.
- Written as a script the caregiver reads aloud while the content plays.
- Ends with a prompt the child can respond to (gesture, word, or point).

### 6e. `read` (Mission Historique)

```json
{
  "text": "This is Amara. She wakes up in the morning. She sees Mama. She waves her hand. Hello, Mama! Mama smiles big. Hello, Amara! I am happy to see you!"
}
```

Rules:
- Written as continuous prose, sentences separated by single space.
- Level 1: 4–8 sentences, maximum 80 words. Simple subject-verb-object structure.
- Level 2: up to 150 words. Level 3: up to 300 words with dialogue and description.
- Rwandan names and setting woven in naturally.

### 6f. `story` (FlipFlop Book)

The FlipFlop Book is **not** authored through `content_json`. It uses a dedicated three-table
system managed through the StoryManager / StoryEditor in the admin CMS:

```
stories
  id, slug, title, cover_url, sort_order, is_active, theme_title, theme_emoji

  └─ story_pages (one row per page)
       id, story_id, page_number, image_url

     └─ story_page_versions (one row per page × language)
          id, story_page_id, language, text, audio_url, published
```

The `missions.story_id` field links the FlipFlop mission to its `stories` row.
The `mission_versions.content_json` for a FlipFlop mission is not used for story content —
leave it as `{}` on import; the app reads pages from `story_pages` + `story_page_versions`.

**Authoring a FlipFlop story (via StoryManager):**
1. Create a `stories` row: set `slug`, `title`, `theme_title`, `theme_emoji`, `is_active = false`.
2. Add `story_pages` rows: one per page, set `page_number` and upload `image_url` (the illustration).
3. For each page, add `story_page_versions` rows: one per language (en / fr / rw),
   set `text` (narration shown under the image) and optionally `audio_url`.
4. Set `published = true` on each version when ready.
5. Link the mission: set `missions.story_id` to the story's UUID.

**FlipFlop authoring spec per level:**

| Level | Pages | Words per page (text narration) |
|---|---|---|
| Level 1 — Toddler | 4–6 | 5–10 words |
| Level 2 — Preschool | 6–10 | 10–20 words |
| Level 3 — School Readiness | 8–14 | 15–40 words |

The last page always closes the story's emotional arc.
Each page text is narration that pairs with the illustration — it does not need to describe
what is already visible in the image.

---

## 7. Language and Translation Conventions

### 7a. Naming

| Language | Convention |
|---|---|
| English | Child character names: Zara, Amara, Keza, Tito, Beni |
| Français | Same names (they are Rwanda-origin names used across all three) |
| Kinyarwanda | Same names; use Kinyarwanda grammar inflections as appropriate |

### 7b. Trilingual weaving

Level 1 lessons embed all three languages within a single lesson's experience:
- The Morning Song always includes the greeting word in all three languages.
- Tip text and instructions reference the trilingual context.
- The app renders ONE language version at a time — the trilingual weaving is within the
  content of that version (e.g. the English version mentions "Bonjour" and "Muraho" to
  build recognition).

### 7c. Kinyarwanda spelling

Use standard modern Kinyarwanda orthography:
- No diacritics needed (Kinyarwanda uses a flat Latin alphabet).
- Common greeting: `Muraho` (hello), `Mwaramutse` (good morning), `Mwiriwe` (good afternoon).
- Wave: `ninkunira` (I wave at you).
- Common names: Amara, Keza, Uwase, Mugisha, Gatete, Habimana.

### 7d. Title length

| Language | Target | Maximum |
|---|---|---|
| English | 3–6 words | 8 words |
| Français | 3–7 words | 9 words |
| Kinyarwanda | 3–6 words | 8 words |

Titles must be translatable equivalents, not literal word-for-word translations.
The emotional register should be identical across all three.

---

## 8. Developmental Standards per Level

### Level 1 — Toddler (18 months – 3 years)

| Criterion | Standard |
|---|---|
| Sentence length (instructions) | 6–10 words max |
| Sentence length (story text) | 4–8 words per sentence |
| Vocabulary | Concrete nouns and basic verbs only |
| Cognitive demand | Imitation, recognition, single-concept |
| Activity duration | 5–8 minutes |
| Adult involvement | High — caregiver facilitates every step |
| Repetition | Core word/action appears minimum 3× per lesson |
| Cultural references | Real Rwandan names, foods, animals (no abstractions) |

### Level 2 — Preschool (3 – 5 years)

| Criterion | Standard |
|---|---|
| Sentence length | Up to 15 words |
| Vocabulary | Descriptive adjectives, some abstract nouns |
| Cognitive demand | Comparison, classification, prediction |
| Activity duration | 8–12 minutes |
| Adult involvement | Moderate — caregiver prompts, child leads |
| Cultural references | Rwandan history, geography, community roles |

### Level 3 — School Readiness (5 – 6 years)

| Criterion | Standard |
|---|---|
| Sentence length | Up to 25 words |
| Vocabulary | Academic and domain-specific terms |
| Cognitive demand | Analysis, evaluation, composition, calculation |
| Activity duration | 10–15 minutes |
| Adult involvement | Low — child works independently with check-ins |
| Cultural references | Rwandan civic values, national symbols, statistics |

---

## 9. Quality Checklist (per lesson)

Before a lesson can move from `draft` to `review`, the author must confirm:

**Content**
- [ ] Blueprint objective is met by the lesson's core activity
- [ ] Learning objective is observable (child does something verifiable)
- [ ] Content JSON validates as the correct type and structure
- [ ] All three language versions are present and complete
- [ ] Title, subtitle, and tip_text are authored for all three languages

**Developmental**
- [ ] Sentence complexity matches the level standard
- [ ] Vocabulary is appropriate for the age range
- [ ] Activity can be completed within the duration window
- [ ] Adult scaffolding is clear in instructions and tip_text

**Cultural**
- [ ] Rwandan names used for characters
- [ ] Rwandan setting or reference present
- [ ] No cultural inaccuracies or stereotypes

**CMS**
- [ ] Title ≤ 120 chars in all three languages
- [ ] Subtitle ≤ 200 chars in all three languages
- [ ] Tip text ≤ 400 chars in all three languages
- [ ] Content JSON is valid JSON with the correct root key
- [ ] `status` is set to `draft` on initial import

---

## 10. Achievement and Progression Integration

Each published lesson contributes to the learner's progression in the following way:

| Action | Outcome |
|---|---|
| Lesson completed | +`stars` (default 10) added to learner's unit total |
| All 8 lessons in a unit completed | Unit badge unlocked |
| All 4 units in a block completed | Block achievement unlocked |
| All 52 units in a level completed | Level certificate issued |

Stars per lesson are fixed at `10` for all curriculum content in BK.4B.
Stars can be adjusted per-lesson in the CMS post-launch based on engagement data.

**Category completion within a unit:**
The learner's unit progress bar fills as each of the 8 category slots in that unit is
completed. A unit is considered "complete" when all 8 lessons are done regardless of
language — the learner's preferred language is used.

---

## Appendix A — Lesson Authoring Workflow

```
Author writes lesson doc → CMS import (via BulkImportManager or MissionEditor)
→ status = draft → internal review → status = review
→ educational lead signs off → status = published → learner sees it
```

For BK.4B.1 (Unit 1 gold standard), all 8 lessons are authored directly into
`level1-unit1-content.md` and will be imported via BulkImportManager (migration 040 schema).

---

## Appendix B — Versioned Content Policy

- All edits to a published lesson must go through the revision workflow
  (`create_mission_version_revision` RPC).
- Translation corrections are treated as revisions — not separate missions.
- Deleted lessons are archived (`status = archived`), never permanently deleted.
