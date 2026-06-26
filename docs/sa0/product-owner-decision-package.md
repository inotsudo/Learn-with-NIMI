# SA.0.3 — Product Owner Decision Package

## 11 Pending Conditions Requiring Product Decision

---

### Condition 1: SA.0.2 Validation Approval

| Field | Value |
|-------|-------|
| **Decision Required** | Approve the SA.0.2 validation report, canonical domain model, and implementation readiness report as the basis for SA-1 implementation |
| **Current Assumption** | Architecture is correct as documented |
| **Alternative Options** | (a) Approve as-is (b) Request specific modifications (c) Reject and re-architect |
| **Recommendation** | Approve as-is — 4 conflicts with product workflow were identified and resolved, 10 assumptions validated (8 approved, 2 modified) |
| **Impact if Delayed** | Blocks all SA-1 implementation |
| **Blocking Level** | **CRITICAL** |

---

### Condition 2: "Meet Nimi & Piko" as 4th Intro Item

| Field | Value |
|-------|-------|
| **Decision Required** | Confirm that "Meet Nimi & Piko" is a distinct intro step (separate from "Story Introduction") |
| **Current Assumption** | Yes — 4 intro items: Intro Video, Theme Song, Meet Nimi & Piko, Story Introduction. Stored as `meet_characters_url` on `story_versions` |
| **Alternative Options** | (a) 4 separate intro items (**recommended**) (b) Merge into 3 items — "Meet Nimi & Piko" combined with "Story Introduction" as one video (c) Make it an optional/skippable splash screen, not tracked at all |
| **Recommendation** | Option (a) — the product workflow explicitly lists 4 sub-items under Story Introduction. Keeping them separate gives the admin CMS 4 distinct URL fields for maximum flexibility. Merging would force the content team to combine conceptually different assets. |
| **Impact if Delayed** | Low — `story_versions` table design either has 3 or 4 URL columns. Adding it later requires a small migration. But deciding now prevents rework. |
| **Blocking Level** | **HIGH** |

---

### Condition 3: Scheduled Publishing Scope

| Field | Value |
|-------|-------|
| **Decision Required** | Confirm whether the "Content Release Strategy" requires scheduled auto-publishing or manual-only publishing is sufficient |
| **Current Assumption** | Both: manual publish as primary, `scheduled_publish_at` as optional. A cron job auto-publishes stories at the scheduled time. |
| **Alternative Options** | (a) Manual only — admin clicks "Publish" when ready (b) Manual + scheduled (**recommended**) — admin can optionally set a future publish date (c) Full drip-feed — seasonal episodes, weekly content drops with automated scheduling |
| **Recommendation** | Option (b) — adds 1 column + 1 cron route. Simple to build, gives content team flexibility without the complexity of a full editorial calendar system. Option (c) is overengineering for launch. |
| **Impact if Delayed** | Low — scheduled publishing can be added in SA-1.6 without blocking SA-1.1 through SA-1.4. The column can be added later. |
| **Blocking Level** | **LOW** |

---

### Condition 4: Weekly Challenge Content Types

| Field | Value |
|-------|-------|
| **Decision Required** | Confirm the challenge types: `quiz`, `creative`, `explore` — or provide the actual types the product wants |
| **Current Assumption** | 3 types: quiz (multiple-choice questions), creative (drawing/recording prompt), explore (physical activity checklist) |
| **Alternative Options** | (a) quiz/creative/explore (**recommended**) (b) Kindness challenges only (as shown in mockup: "Give a Hug", "Say Thank You", "Drink Water") — these are all `explore` type (c) Free-form — just a title + description, child taps "I Did It!", no typed content renderer |
| **Recommendation** | Option (c) for MVP — the mockup shows simple "I Did It!" completion with no quiz UI. Build a simple challenge card with title, description, emoji, and a completion button. Typed renderers (quiz/creative) can be added later. This dramatically reduces SA-3.5 scope from Large to Small. |
| **Impact if Delayed** | Medium — the challenge type determines whether we build 3 complex renderers or 1 simple card. Deciding now affects scope by ~2 days. |
| **Blocking Level** | **MEDIUM** |

---

### Condition 5: Age Filtering Behavior

| Field | Value |
|-------|-------|
| **Decision Required** | When `children.age` falls outside a story's `age_min`/`age_max` range, should the story be: (a) hidden entirely, (b) shown but with a recommendation badge, or (c) shown normally (age range is admin info only)? |
| **Current Assumption** | Hard filter — stories outside the child's age range are excluded from `get_all_stories_with_progress` and `get_current_story` |
| **Alternative Options** | (a) Hard filter — child never sees age-inappropriate stories (b) Soft filter — stories shown with "Recommended for ages X-Y" badge, all still accessible (**recommended**) (c) No filter — age range is admin metadata only, not learner-facing |
| **Recommendation** | Option (b) — hard filtering could leave a child with zero stories if their age doesn't match any published story's range. Soft filtering shows all stories but guides parents. This avoids content gaps while still using the age data meaningfully. |
| **Impact if Delayed** | Low — this is a query-level decision (WHERE clause vs UI badge). Can be changed post-launch without migration. |
| **Blocking Level** | **LOW** |

---

### Condition 6: Token Standardization

| Field | Value |
|-------|-------|
| **Decision Required** | Approve `{child_name}` as the universal personalization token, deprecating `[NAME]`, `[PRENOM]`, `[IZINA]` from migration 041 |
| **Current Assumption** | `{child_name}` is the single token. Client runs `text.replaceAll('{child_name}', child.name)`. Legacy tokens are supported during transition via dual replacement. |
| **Alternative Options** | (a) Standardize on `{child_name}` (**recommended**) (b) Keep legacy `[NAME]` format (c) Use a different format like `{{name}}` or `%child_name%` |
| **Recommendation** | Option (a) — `{child_name}` is readable, consistent with i18n conventions, and the client replacement is trivial. Supporting both old and new tokens during transition has no performance cost. |
| **Impact if Delayed** | None — this is a client-side convention. Can be standardized at any time. |
| **Blocking Level** | **LOW** |

---

### Condition 7: Existing `stories` Table Data Audit

| Field | Value |
|-------|-------|
| **Decision Required** | Confirm the current state of the `stories` table: how many rows exist, which are active, which have story_pages/coloring_pages, which have missions linked via `missions.story_id` |
| **Current Assumption** | At least 1 story ("The Talking Faces") exists from migration 001. Migration adds `is_active` but no `status` column yet. |
| **Alternative Options** | N/A — this is an audit, not a choice |
| **Recommendation** | Run the audit query before SA-1.1 migration to set correct `status` values during data migration (active stories → `published`, inactive → `draft`) |
| **Impact if Delayed** | Medium — the SA-1.1 migration must handle existing data correctly. If the audit isn't done, the migration might set wrong status values. |
| **Blocking Level** | **HIGH** — but can be resolved in 5 minutes with a SQL query |

---

### Condition 8: BK Coexistence Rule

| Field | Value |
|-------|-------|
| **Decision Required** | Confirm that BK Curriculum tables/RPCs become dormant (not deleted) and BK admin sections move under a "Legacy Curriculum" collapsed menu |
| **Current Assumption** | Dormant: `categories`, `level_missions`, `curriculum_levels`, `curriculum_units`, `child_badges` tables and their RPCs stay in the database. Admin CMS hides them behind a "Legacy Curriculum" section. |
| **Alternative Options** | (a) Dormant with Legacy section (**recommended**) (b) Full deletion — drop BK tables and RPCs (DANGEROUS: loses existing child_progress FK references) (c) Active coexistence — both Story Adventure and BK Curriculum available to learners simultaneously |
| **Recommendation** | Option (a) — zero-risk preservation. BK tables consume negligible storage. Legacy admin section can be revisited later. Option (b) risks breaking existing child_progress data. Option (c) creates a confusing dual-mode UX. |
| **Impact if Delayed** | None — dormant tables don't affect anything. The admin sidebar change is cosmetic. |
| **Blocking Level** | **LOW** |

---

### Condition 9: Cover Name Overlay Design Spec

| Field | Value |
|-------|-------|
| **Decision Required** | Provide a design spec for how the child's name appears on story cover images: font, size, position, color, style |
| **Current Assumption** | Client-side text overlay using CSS/Canvas on the template cover image |
| **Alternative Options** | (a) CSS text overlay (fastest, limited styling) (b) Canvas/SVG composition (richer, matches mockup better) (**recommended**) (c) Defer to SA-3.6 — implement a basic overlay now, refine styling later (d) Skip entirely — covers don't show child name |
| **Recommendation** | Option (c) — the mockup shows "Nathan and the talking faces" with the name integrated into the cover. A basic Canvas overlay can render the name in a bold font at a fixed position. The exact design (font, shadow, position) can be refined iteratively after the core story flow works. |
| **Impact if Delayed** | Low — cover overlay is a visual polish item in SA-3.6, not on the critical path. Stories work fine without it. |
| **Blocking Level** | **LOW** |

---

### Condition 10: First Story Assets

| Field | Value |
|-------|-------|
| **Decision Required** | Identify and confirm availability of content assets for the first published story (the minimum viable story that proves the platform works end-to-end) |
| **Current Assumption** | "The Talking Faces" story already exists in the database with story pages, coloring pages, and at least some missions. This can serve as the seed story for Story Adventure. |
| **Alternative Options** | (a) Reuse "The Talking Faces" (**recommended**) (b) Create an entirely new story from scratch (c) Use placeholder/test content for engineering validation, replace with real content later |
| **Recommendation** | Option (a) — the existing story has real page illustrations, narration audio, and coloring templates already uploaded to Supabase Storage. Wiring it into the Story Adventure model (creating story_versions, story_slots, mapping existing missions) is the fastest path to a working end-to-end demo. |
| **Impact if Delayed** | High — without a seed story, the learner UI cannot be tested end-to-end. SA-2.3 (content seed) and SA-3.x (learner routes) are blocked. |
| **Blocking Level** | **HIGH** |

---

### Condition 11: RLS Policy Patterns

| Field | Value |
|-------|-------|
| **Decision Required** | Confirm that new Story Adventure tables follow the same RLS pattern as existing `missions`/`mission_versions` tables: parents read published content, parents read/write their own children's progress, admins full CRUD |
| **Current Assumption** | Same pattern. Specifically: `story_versions` readable where `published = true`; `story_slots` readable by authenticated; `story_intro_progress` and `weekly_challenge_progress` insertable by own parent; admin bypass via `is_admin()` |
| **Alternative Options** | N/A — RLS patterns should be consistent |
| **Recommendation** | Confirm and proceed. The existing RLS patterns from migrations 012, 026, 028, 034, 036 are well-established and audited. Copying the same patterns for new tables is the correct approach. |
| **Impact if Delayed** | Low — RLS policies are part of the SA-1.1 migration. The patterns are established; this is a rubber-stamp confirmation. |
| **Blocking Level** | **LOW** |

---

## Product Owner Decision Matrix

| # | Decision | Current Assumption | Recommended Choice | Blocking? |
|---|----------|-------------------|-------------------|-----------|
| 1 | Approve SA.0.2 architecture | Architecture is correct | **Approve as-is** | CRITICAL |
| 2 | Meet Nimi & Piko = 4th intro item | Yes, 4 intro items | **Yes, keep as 4th item** | HIGH |
| 3 | Scheduled publishing | Manual + optional scheduled | **Manual + scheduled** | LOW |
| 4 | Challenge types | quiz/creative/explore | **Simple "I Did It!" card for MVP** | MEDIUM |
| 5 | Age filtering | Hard filter | **Soft filter (badge, not hide)** | LOW |
| 6 | Token format | `{child_name}` | **Approve `{child_name}`** | LOW |
| 7 | Stories table audit | 1+ stories exist | **Run audit query before SA-1.1** | HIGH |
| 8 | BK coexistence | Dormant + Legacy section | **Dormant (no delete)** | LOW |
| 9 | Cover overlay spec | CSS/Canvas overlay | **Defer detailed spec, basic overlay in SA-3.6** | LOW |
| 10 | First story assets | Reuse "The Talking Faces" | **Reuse existing story** | HIGH |
| 11 | RLS patterns | Same as existing tables | **Confirm same pattern** | LOW |

### Summary

- **3 CRITICAL/HIGH decisions** that block SA-1: #1 (architecture approval), #7 (data audit), #10 (first story assets)
- **1 MEDIUM decision** that affects scope: #4 (challenge types — Simple vs Complex)
- **7 LOW decisions** that have safe defaults and can be confirmed anytime

**Minimum to unblock SA-1:** Approve conditions 1, 2, 7, 10. All others have safe defaults.
