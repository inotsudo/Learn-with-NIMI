# SA-3.5C — Visual Activity System

## Design Principle

Target users are pre-readers (3-6 years old).

```
See → Hear → Copy → Complete
```

Not: Read → Understand → Complete.

---

## Move & Explore

### Prompt Schema

Stored in `mission_versions.content_json.prompts` (per-language):

```json
[
  {
    "order": 1,
    "emoji": "👏",
    "label": "Clap!",
    "image_url": "storyBook/moves/clap-demo.jpg",
    "video_url": "storyBook/moves/clap-demo.mp4",
    "audio_url": "storyBook/moves/en-clap.mp3",
    "difficulty": "easy",
    "estimated_minutes": 1
  }
]
```

### Learner Behavior

- Cards sorted by `order`
- Tap card → plays `audio_url` automatically + opens `video_url` inline
- Speaker icon on cards with audio
- Play button overlay on cards with video
- Falls back to emoji cards when no media
- 2-column grid, large touch targets (48px+)
- Mobile-first layout

### Admin CMS (MissionEditor)

Per prompt card:
- Emoji picker
- Label text
- Order number
- Difficulty selector (Easy/Medium/Hard)
- Image upload (📷)
- Video upload (🎥)
- Audio upload (🔊)
- Delete button

Language-aware: each language's `mission_versions` row has its own `content_json.prompts` with language-specific audio.

---

## Champion Challenge

### Schema

Shared fields on `weekly_challenges` table:
- `difficulty` (text: easy/medium/hard)
- `estimated_minutes` (integer)
- `image_url` (text — example photo)
- `video_url` (text — demo video)
- `reward_badge` (text — badge slug)

Per-language fields in `weekly_challenge_versions.content_json`:
- `audio_url` (text — spoken instruction per language)

### Learner Behavior

- Example image displayed prominently
- Play button overlay for demo video
- Audio instruction button (🔊) next to title
- Difficulty shown as star badges (⭐/⭐⭐/⭐⭐⭐)
- Visual-first layout — minimal text
- "I DID IT!" button translated

### Admin CMS (WeeklyChallengesManager)

Challenge settings:
- Type (kindness/friendship/etc.)
- Stars reward
- Difficulty (⭐ Easy / ⭐⭐ Medium / ⭐⭐⭐ Hard)
- Duration (minutes)
- Reward badge slug
- Sort order

Visual media:
- Example image upload
- Example video upload

Per-language versions:
- Title
- Description
- Audio instruction upload (per language)
- Publish/unpublish

---

## Language Awareness

Audio content is language-specific.

```
English/   clap.mp3
French/    clap.mp3
Kinyarwanda/ clap.mp3
```

Move & Explore: audio stored in `mission_versions.content_json.prompts[].audio_url` — each language has its own mission_versions row.

Champion Challenge: audio stored in `weekly_challenge_versions.content_json.audio_url` — each language has its own version row.

The active language switcher determines which audio loads.

---

## Readiness

- Move & Explore: **required** for publishing
- Cover image: **optional**
- Meet Characters: **optional**
- Challenge media: **optional** (never blocks publishing)

---

## Migration

`050_challenge_visual_fields.sql` adds to `weekly_challenges`:
- `difficulty` (text, default 'easy')
- `estimated_minutes` (integer, default 2)
- `image_url` (text)
- `video_url` (text)
- `reward_badge` (text)
