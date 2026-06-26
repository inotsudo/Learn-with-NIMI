# SA.0.3 — Architecture Freeze Report

## Final Architecture Status

| # | Architecture Component | Status | Notes |
|---|----------------------|--------|-------|
| 1 | **Story Structure** | **APPROVED** | 4 intro items (passive, URLs on `story_versions`) + 6 active missions (tracked via `story_slots` → `missions`). Completion = 6/6 missions. |
| 2 | **Progression Model** | **APPROVED** | Sequential unlock by `sort_order`. Story 1 always open. N+1 unlocks when N complete. Per `(child_id, language)`. Retired stories skipped. No time-gating. |
| 3 | **Certificate Model** | **APPROVED** | `child_achievements` table reused. Story badge + certificate auto-awarded on 6/6 completion. Streak milestones at 3/5/10/20. Trilingual badge. All-stories certificate. |
| 4 | **Language Model** | **APPROVED** | `story_versions` per language (en/fr/rw). `mission_versions` per language (existing). English fallback for content. Language set globally on `children.language`. Progress partitioned by language. |
| 5 | **Personalization Model** | **APPROVED** | `{child_name}` token, client-side `replaceAll`. Cover name overlay deferred to SA-3.6. Age filtering as soft recommendation (not hard exclusion). Photo injection not in scope. |
| 6 | **Weekly Challenge Model** | **PENDING PRODUCT DECISION** | Pending condition #4: Simple "I Did It!" card (recommended) vs typed quiz/creative/explore renderers. Architecture supports either. Decision affects SA-3.5 scope only — not schema. |
| 7 | **Content Release Model** | **APPROVED** | Manual publish as primary. Optional `scheduled_publish_at` for auto-publishing via cron. No seasonal/episode model at launch. Retirement preserves data. |
| 8 | **CMS Model** | **APPROVED** | StoryManager/StoryEditor extended. MissionEditor reused. BK admin sections moved to "Legacy Curriculum" collapsed menu. New: Story Slot Editor, Weekly Challenge Editor, Story Publishing Center. |

### Freeze Summary

| Verdict | Count | Items |
|---------|-------|-------|
| **APPROVED** | 7 | Story structure, progression, certificates, language, personalization, content release, CMS |
| **PENDING** | 1 | Weekly Challenge type (schema is approved; renderer complexity is the pending decision) |
| **REJECTED** | 0 | None |

---

## Frozen Specifications

### Story Entity — FROZEN

```
stories (EXTENDED)
  + status: draft/review/published/retired
  + age_min, age_max: integer 2-12
  + scheduled_publish_at: timestamptz nullable
  + published_at, retired_at: timestamptz nullable
  + is_active: boolean derived from status='published'
```

### Story Versions — FROZEN

```
story_versions (NEW)
  PK: id
  UNIQUE: (story_id, language)
  Fields: title, cover_url, intro_video_url, theme_song_url,
          meet_characters_url, story_intro_url, status, published
```

### Story Slots — FROZEN

```
story_slots (NEW)
  PK: (story_id, slot_key)
  slot_key CHECK: flipflop_audio, story_pdf, coloring,
                  move_explore, sing_along, bonus_video
  Fields: mission_id (FK), sort_order (1-6)
```

### Intro Progress — FROZEN

```
story_intro_progress (NEW)
  UNIQUE: (child_id, story_id, language, slot_key)
  slot_key CHECK: intro_video, theme_song, meet_characters, story_intro
  Fields: consumed_at
```

### Achievement Slugs — FROZEN

```
story-{slug}-complete-{lang}          (badge)
story-{slug}-certificate-{lang}      (certificate)
story-streak-{N}-{lang}              (badge, N=3,5,10,20)
all-stories-complete-{lang}          (certificate)
trilingual-story-{slug}              (badge)
```

### Progression Algorithm — FROZEN

```
get_current_story:    first incomplete published story by sort_order
is_story_unlocked:    first story = yes; others = previous story complete
is_story_complete:    all 6 story_slots missions in child_progress for (child, language)
complete_story_mission: upsert progress → check 6/6 → award badge+cert → check streaks
```

### Publishing Checklist — FROZEN

```
10 blocking checks:
  1. English story_version published
  2. Cover URL exists
  3. All 6 story_slots exist
  4. All slot missions active
  5. All slot missions have published English version
  6. FlipFlop has story_pages
  7. FlipFlop pages have English versions
  8. Coloring has coloring_pages
  9. sort_order unique and set
  10. age_min <= age_max, both set
```

### Dormant BK Tables — FROZEN

```
DORMANT (keep, don't use, don't delete):
  categories, level_missions, curriculum_levels,
  curriculum_units, child_badges
  + all BK RPCs (get_current_level, get_curriculum_missions, etc.)
```
