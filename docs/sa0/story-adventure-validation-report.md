# SA.0.2 — Story Adventure Validation Report

## Part A — Feature Matrix

| Product Requirement | Sub-feature | Existing Support | Reusable Components | Missing Pieces | Risk |
|---|---|---|---|---|---|
| **Story Library** | Browse all stories | Partial | `stories` table, `StoryJourney.tsx` (hardcoded) | No `/stories` route, no story library component, no lock/unlock UI | Medium |
| **Story Library** | Cards with cover, title, lock state | Partial | `stories.slug/title/cover_url/sort_order` | No `is_story_unlocked` RPC, no story card component, missing `status/age_min/age_max` columns | Medium |
| **Language Selection** | Per-child language | Yes | `children.language`, `LanguageContext`, language switcher | None | Low |
| **Language Selection** | Content fallback to English | Yes | `category_effective_language` RPC, `mission_versions` per-language | None | Low |
| **Story Introduction** | Intro Video | Partial | `WatchContent.tsx` | No `intro_video_url` on `story_versions`, no intro playback route | Medium |
| **Story Introduction** | Theme Song | Partial | `SingAlongContent.tsx` | No `theme_song_url` on `story_versions` | Medium |
| **Story Introduction** | Meet Nimi & Piko | No | None | SA.0.1 missed this as a distinct item; no component, no data field | Medium |
| **Story Introduction** | Story Introduction | Partial | `StoryContent.tsx` / `StoryFlipBook.tsx` | No `story_intro_url` on `story_versions` | Medium |
| **Mission 1** | FlipFlop Audio | Yes | `StoryContent.tsx`, `StoryFlipBook.tsx`, `story_pages`, `story_page_versions` | Wire into `story_slots` | Low |
| **Mission 2** | Story PDF | Yes | `ReadContent.tsx` | Wire into `story_slots` | Low |
| **Mission 3** | Coloring Activity | Yes | `ColoringContent.tsx`, `ColoringStudio.tsx`, `coloring_pages`, `coloring_saves` | Wire into `story_slots` | Low |
| **Mission 4** | Move and Explore | Yes | `MoveGrooveContent.tsx` | Wire into `story_slots` | Low |
| **Mission 5** | Sing Along With Nimi | Yes | `SingAlongContent.tsx` | Wire into `story_slots` | Low |
| **Mission 6** | Bonus Video | Yes | `WatchContent.tsx` | Wire into `story_slots` | Low |
| **Story Certificate** | Auto-award on 6/6 | Partial | `child_achievements` table, `CertificatePanel.tsx` | Panel hardcoded to 8 steps; need story-specific certificate; new achievement slugs | Medium |
| **Story Certificate** | Download/Share | Partial | CertificatePanel has Download/Share icons | May need PDF generation or image export | Medium |
| **Weekly Challenge** | Full feature | No | Nothing exists | New tables, RPCs, admin CMS, learner UI, challenge renderers | High |
| **Personalized Story** | Child name substitution | Partial | `children.name`; migration 041 `[NAME]` tokens | Token not standardized; no cover overlay component | Low |
| **Personalized Story** | Cover name overlay | No | None | Need client-side text overlay component | Medium |
| **Community** | Upload/gallery | Yes | `UploadModal`, `GalleryCard`, `creations/likes` tables, `/community` route | None for base features | Low |
| **Talk To Nimi AI** | Chat interface | Yes | `TalkToNimi.tsx`, `/talk-to-nimi`, `useNimiChat`, `/api/nimi` | None; fully functional | Low |
| **Story Unlocking** | Sequential unlock | Partial | `stories.sort_order` exists | Need `is_story_unlocked` + `is_story_complete` RPCs; no lock UI | Medium |
| **Content Release** | Scheduled publishing | Partial | `stories.is_active`, `mission_versions.status` workflow | No `scheduled_publish_at`; no cron for auto-publishing | Medium |

## Part B — SA.0.1 Assumption Validation

| # | Assumption | Verdict | Rationale |
|---|---|---|---|
| 1 | 6 active missions model | **APPROVED** | Product lists exactly 6 numbered missions. All 6 map to existing mission types with working renderers. |
| 2 | Intro not counted toward completion | **APPROVED** | Product separates "Story Introduction" from "Story Missions" visually. Certificate = complete 6 interactive activities, not passive watching. |
| 3 | "Meet Nimi & Piko" handling | **MODIFY** | Product lists 4 intro items. SA.0.1 only models 3. Add `meet_characters_url` to `story_versions` and `meet_characters` to `story_intro_progress.slot_key`. |
| 4 | story_versions design | **APPROVED** (with mod from #3) | Per-language metadata table is correct. Add 4th intro URL column. |
| 5 | story_slots design | **APPROVED** | PK(story_id, slot_key) with 6 fixed slots is clean and correct. |
| 6 | Achievement model | **APPROVED** | Slug catalog is comprehensive. Existing `child_achievements` table needs zero schema changes. |
| 7 | Personalization model | **MODIFY** | `{child_name}` substitution is necessary but not sufficient. Add: age-based story filtering, document cover name overlay as UI task. |
| 8 | Unlock model | **APPROVED** | Sequential by `sort_order`, first always unlocked, retired stories skipped. Algorithms are correct. |
| 9 | Content Release Strategy | **MODIFY** | Add `scheduled_publish_at` column + cron job for auto-publishing. Manual publish remains primary. |
| 10 | Weekly Challenge scope | **APPROVED** | 1 per story, optional, not time-gated, not blocking. |

## Part C — Conflict Analysis

| # | Conflict | SA.0.1 Says | Product Implies | Resolution | Schema Impact |
|---|---|---|---|---|---|
| 1 | Intro item count | 3 items | 4 items (includes "Meet Nimi & Piko") | Add `meet_characters_url` column + expanded CHECK | 1 column + 1 CHECK value |
| 2 | Content Release scope | Manual publish only | Deliberate "Strategy" implies scheduling | Add `scheduled_publish_at` + cron | 1 column + 1 API route |
| 3 | Personalization scope | Name substitution only | "Personalized Story Experience" is broader | Add age filtering to queries; document cover overlay | Query changes only |
| 4 | Story Library vs Dashboard | Only `get_current_story` | "Story Library" = browse all | Add `get_all_stories_with_progress` RPC | 1 new RPC |
