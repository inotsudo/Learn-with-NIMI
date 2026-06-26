# SA-1.2 — RPC Test Scenarios

## Prerequisites

- At least 2 published stories with 6 story_slots each
- At least 1 story with mission_versions in en + fr
- At least 1 weekly_challenge with published versions
- 1 child profile with known child_id and language

---

## Scenario 1: Fresh Child — Story Library

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `get_story_library_progress(child_id, 'en')` | Returns all published stories. Story 1: `unlocked=true, complete=false, progress=0`. Story 2+: `unlocked=false`. |
| 2 | `get_current_story(child_id, 'en')` | Returns Story 1's UUID. |
| 3 | `get_unlocked_stories(child_id, 'en')` | Returns only Story 1's UUID. |
| 4 | `get_story_recommendations(child_id, 'en')` | Returns all stories with `age_match` based on child's age. |

## Scenario 2: Story Detail — Slots + Intro

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `get_story_details(story_1_id, 'en')` | Returns title, cover, intro URLs in English. |
| 2 | `get_story_details(story_1_id, 'fr')` | Returns French title if `story_versions` has FR row, else English fallback. |
| 3 | `get_story_slots(child_id, story_1_id, 'en')` | Returns 6 rows ordered by sort_order. All `completed=false`. |
| 4 | `get_story_intro_progress(child_id, story_1_id, 'en')` | Returns 4 rows, all `consumed=false`. |

## Scenario 3: Consume Intro Item

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `mark_intro_item_consumed(child_id, story_1_id, 'intro_video')` | Succeeds, no return. |
| 2 | `get_story_intro_progress(child_id, story_1_id, 'en')` | `intro_video` row: `consumed=true`. Others: `consumed=false`. |
| 3 | `mark_intro_item_consumed(child_id, story_1_id, 'intro_video')` | Idempotent — no error, no duplicate row. |

## Scenario 4: Complete Missions — Progression

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `complete_story_slot(child_id, mission_1_id)` | `{stars_earned: 10, story_complete: false, new_badges: [], next_story_unlocked: false}` |
| 2 | `get_story_completion(child_id, story_1_id, 'en')` | `{total_slots: 6, completed_slots: 1, is_complete: false}` |
| 3 | `get_story_slots(child_id, story_1_id, 'en')` | Slot 1: `completed=true`. Others: `completed=false`. |
| 4 | Complete missions 2-5 | Each returns `story_complete: false`. |
| 5 | `complete_story_slot(child_id, mission_6_id)` | `{stars_earned: 10, story_complete: true, new_badges: ['story-...-complete-en'], new_certificate: 'story-...-certificate-en', next_story_unlocked: true}` |

## Scenario 5: Story Complete — Certificate + Unlock

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `get_story_certificate(child_id, story_1_id, 'en')` | Returns certificate slug + earned_at timestamp. |
| 2 | `get_unlocked_stories(child_id, 'en')` | Now returns Story 1 AND Story 2. |
| 3 | `get_current_story(child_id, 'en')` | Returns Story 2's UUID. |
| 4 | `get_story_library_progress(child_id, 'en')` | Story 1: `complete=true, progress=1.00`. Story 2: `unlocked=true, progress=0`. |

## Scenario 6: Replay — Idempotency

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `complete_story_slot(child_id, mission_1_id)` | `{stars_earned: 0, story_complete: true, new_badges: [], new_certificate: null}`. No duplicate achievements. |

## Scenario 7: Weekly Challenge

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `get_weekly_challenges(child_id, story_1_id, 'en')` | Returns challenge(s) with `completed=false`. |
| 2 | `complete_weekly_challenge(child_id, challenge_id)` (before story complete) | **ERROR**: `story not yet complete`. |
| 3 | (After story complete) `complete_weekly_challenge(child_id, challenge_id)` | `{stars_earned: 10, already_completed: false}`. |
| 4 | `complete_weekly_challenge(child_id, challenge_id)` again | `{stars_earned: 0, already_completed: true}`. |

## Scenario 8: Language Switch

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | Complete Story 1 in English. | All done. |
| 2 | `get_story_library_progress(child_id, 'fr')` | Story 1: `complete=false, progress=0` (French progress is separate). |
| 3 | `get_current_story(child_id, 'fr')` | Returns Story 1 (must redo in French). |
| 4 | Complete Story 1 in French. | Badge: `story-...-complete-fr`. |
| 5 | Complete Story 1 in Kinyarwanda. | Trilingual badge: `trilingual-story-...` awarded. |

## Scenario 9: Milestone Badges

| Step | Condition | Expected Badge |
|------|-----------|---------------|
| 1 | 3 stories complete in `en` | `story-streak-3-en` |
| 2 | 5 stories complete in `en` | `story-streak-5-en` |
| 3 | All published stories complete in `en` | `all-stories-complete-en` certificate |

## Scenario 10: Authorization

| Step | RPC Call | Expected Result |
|------|---------|-----------------|
| 1 | `get_story_slots(other_parent_child_id, ...)` | **ERROR**: `not authorized` |
| 2 | `complete_story_slot(other_parent_child_id, ...)` | **ERROR**: `not authorized` |
| 3 | `complete_story_slot(child_id, nonexistent_mission)` | **ERROR**: `mission not found` |
| 4 | `complete_story_slot(child_id, mission_from_locked_story)` | **ERROR**: `story not unlocked` |

## Scenario 11: Retired Story

| Step | Setup | Expected Result |
|------|-------|-----------------|
| 1 | Retire Story 2 (set `status='retired'`) | Story 2 disappears from library. |
| 2 | `get_story_library_progress(child_id, 'en')` | Story 2 not in results. |
| 3 | Complete Story 1. | Story 3 unlocks (skips retired Story 2). |
| 4 | `get_current_story(child_id, 'en')` | Returns Story 3. |
