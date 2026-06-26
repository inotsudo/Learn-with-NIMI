# SA-1.2 — RPC Validation Report

## Functions Generated

| # | Function | Type | Auth | Language-Aware | Returns |
|---|----------|------|------|----------------|---------|
| 1 | `get_current_story` | Query | `is_my_child` via helper | Yes | `uuid` |
| 2 | `get_unlocked_stories` | Query | `is_my_child` via helper | Yes | `table(sid uuid)` |
| 3 | `get_story_details` | Query | None (public read) | Yes (fallback to en) | `table(12 cols)` |
| 4 | `get_story_slots` | Query | `is_my_child` | Yes (fallback to en) | `table(8 cols)` |
| 5 | `complete_story_slot` | Mutation | `is_my_child` | Auto from child | `jsonb` |
| 6 | `get_story_completion` | Query | `is_my_child` | Yes | `table(3 cols)` |
| 7 | `get_story_certificate` | Query | `is_my_child` | Yes | `table(2 cols)` |
| 8 | `get_weekly_challenges` | Query | `is_my_child` | Yes (fallback to en) | `table(8 cols)` |
| 9 | `complete_weekly_challenge` | Mutation | `is_my_child` | Auto from child | `jsonb` |
| 10 | `get_story_library_progress` | Query | `is_my_child` | Yes (fallback to en) | `table(11 cols)` |
| 11 | `get_story_intro_progress` | Query | `is_my_child` | Yes | `table(3 cols)` |
| 12 | `mark_intro_item_consumed` | Mutation | `is_my_child` | Auto from child | `void` |
| 13 | `get_story_recommendations` | Query | `is_my_child` | Yes (fallback to en) | `table(7 cols)` |
| H1 | `_sa_is_story_complete` | Internal | None (called by others) | Yes | `boolean` |
| H2 | `_sa_is_story_unlocked` | Internal | None (called by others) | Yes | `boolean` |

## Validation Checklist

| Check | Status |
|-------|--------|
| All 13 public functions use `security definer` | ✅ |
| All query functions marked `stable` | ✅ |
| All mutation functions NOT marked `stable` | ✅ |
| All functions with child_id param check `is_my_child()` | ✅ |
| All language params have `default 'en'` fallback | ✅ |
| All column aliases avoid PL/pgSQL variable collisions | ✅ |
| No references to BK tables: `level_missions`, `curriculum_levels`, `curriculum_units`, `categories` | ✅ |
| `complete_story_slot` uses `ON CONFLICT DO NOTHING` for achievements | ✅ |
| `complete_story_slot` is idempotent (replay returns 0 stars) | ✅ |
| `complete_weekly_challenge` requires story completion first | ✅ |
| `_sa_is_story_unlocked` skips retired stories | ✅ |
| `_sa_is_story_complete` handles archived missions gracefully | ✅ |
| Language fallback: all queries try `p_language` first, fall back to `'en'` | ✅ |

## Schema Dependencies

| Function | Tables Read | Tables Written |
|----------|-----------|---------------|
| `get_current_story` | `stories`, `story_slots`, `missions`, `mission_versions`, `child_progress` | — |
| `get_unlocked_stories` | Same as above | — |
| `get_story_details` | `stories`, `story_versions` | — |
| `get_story_slots` | `story_slots`, `missions`, `mission_versions`, `child_progress` | — |
| `complete_story_slot` | `children`, `missions`, `stories`, `story_slots`, `child_progress`, `mission_versions`, `child_achievements` | `child_progress`, `child_achievements` |
| `get_story_completion` | `story_slots`, `missions`, `child_progress` | — |
| `get_story_certificate` | `stories`, `child_achievements` | — |
| `get_weekly_challenges` | `weekly_challenges`, `weekly_challenge_versions`, `weekly_challenge_progress` | — |
| `complete_weekly_challenge` | `children`, `weekly_challenges`, `weekly_challenge_progress`, `story_slots`, `missions`, `mission_versions`, `child_progress` | `weekly_challenge_progress` |
| `get_story_library_progress` | `stories`, `story_versions`, `story_slots`, `child_progress`, `missions`, `mission_versions` | — |
| `get_story_intro_progress` | `story_intro_progress` | — |
| `mark_intro_item_consumed` | `children` | `story_intro_progress` |
| `get_story_recommendations` | `children`, `stories`, `story_versions` | — |

## BK Independence Verification

| BK Table | Referenced by SA-1.2 RPCs? |
|----------|--------------------------|
| `categories` | **NO** |
| `level_missions` | **NO** |
| `curriculum_levels` | **NO** |
| `curriculum_units` | **NO** |
| `child_badges` | **NO** |

All SA-1.2 RPCs operate exclusively on Story Adventure tables (`stories`, `story_versions`, `story_slots`, `story_intro_progress`, `weekly_challenges`, `weekly_challenge_versions`, `weekly_challenge_progress`) and shared tables (`children`, `missions`, `mission_versions`, `child_progress`, `child_achievements`).
