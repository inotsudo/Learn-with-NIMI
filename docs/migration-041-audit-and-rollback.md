# Migration 041 — Full Bootstrap Content Audit & Rollback
## Level 1, Unit 1 — Hello, World!

**Audited:** 2026-06-16
**Migration:** `supabase/migrations/041_level1_unit1_bootstrap.sql`
**Push result:** Applied successfully — 8 missions, 24 versions, 8 slots, 1 story, 5 pages, 15 page versions.

---

## 1. curriculum_units (1 row)

| level_number | unit_number | title | theme_emoji |
|---|---|---|---|
| 1 | 1 | Hello, World! | 👋 |

> No UUID — primary key is `(level_number, unit_number)`.

---

## 2. missions (8 rows)

| id | category_slug | type | sequence | active | story_id |
|---|---|---|---|---|---|
| `f8495c5e-281c-49ff-93ae-ac4a86aaaddb` | `morning` | `sing` | 1 | true | — |
| `63475a84-e360-4571-a568-3ab70053c8cc` | `movement` | `move` | 1 | true | — |
| `9ee767a2-12be-47a2-abe1-1213cbb054f9` | `artistic` | `color` | 1 | true | — |
| `a85643a1-11ae-46ee-aba0-57219a96ecfd` | `histoire` | `read` | 1 | true | — |
| `c1265275-1e14-40a6-9d05-123e652e0960` | `zoom` | `watch` | 1 | true | — |
| `75e6bf1a-19f2-40f4-bc4e-e7cb44dd1aaf` | `discovery` | `watch` | 1 | true | — |
| `53208e04-9c98-4520-a086-6b2d6178da42` | `flipflop` | `story` | 1 | true | `8b47e35f-dcf8-4eb8-b130-c638ffd1acd0` |
| `1deb73c4-97aa-42e2-bd9f-3dca0f9535e6` | `coloring` | `color` | 1 | true | — |

---

## 3. mission_versions (24 rows)

| id | mission_id | category | language | title | status |
|---|---|---|---|---|---|
| `49af4afd-4d7b-43a1-957b-d5e30c1f10b2` | `f8495c5e` (morning) | morning | `en` | Hello, Hello! | published |
| `97bb8577-ee9a-4e45-9344-6f82ea4a0459` | `f8495c5e` (morning) | morning | `fr` | Bonjour, Bonjour ! | published |
| `f2de145f-237e-47c6-a755-6267a85922ff` | `f8495c5e` (morning) | morning | `rw` | Muraho, Muraho! | published |
| `c5c88cb0-bdca-436c-b6f4-fd936ccf98e5` | `63475a84` (movement) | movement | `en` | Come to Me! | published |
| `1aba1c82-e6bc-4d05-8de9-ee0f6072f708` | `63475a84` (movement) | movement | `fr` | Viens vers moi ! | published |
| `12079505-ea92-4766-8d6a-a09c8c02aee9` | `63475a84` (movement) | movement | `rw` | Nzana ino! | published |
| `60cfc422-8b08-4e30-a4bc-bebc7e55f280` | `9ee767a2` (artistic) | artistic | `en` | My Hello Hand | published |
| `f47b5945-fe50-4c51-aa01-9efbe8aa46e0` | `9ee767a2` (artistic) | artistic | `fr` | Ma Main Bonjour | published |
| `e6e5a71b-6659-44eb-8870-d4d2deace8e0` | `9ee767a2` (artistic) | artistic | `rw` | Ukuboko Kwanjye kwa Muraho | published |
| `841ebd81-8279-483f-967c-4ae6d5916582` | `a85643a1` (histoire) | histoire | `en` | Baby Amara's Morning | published |
| `0dddbc35-0204-402a-b0ae-63883a4cc14d` | `a85643a1` (histoire) | histoire | `fr` | Le Matin de Bébé Amara | published |
| `212a73ec-6783-408c-acc5-55b45295b2d9` | `a85643a1` (histoire) | histoire | `rw` | Mu Gitondo cya Amara Mwana | published |
| `299df373-b90d-4c87-9f88-3b73c69c3cd0` | `c1265275` (zoom) | zoom | `en` | Hello, Rwanda! | published |
| `44e6adfb-1502-4d44-8571-9c6a49433598` | `c1265275` (zoom) | zoom | `fr` | Bonjour, Rwanda ! | published |
| `cef70876-a6ee-44f4-a178-c6c0df28e89e` | `c1265275` (zoom) | zoom | `rw` | Muraho, Rwanda! | published |
| `bce308bd-a450-4c1f-9c19-7d81bef66c95` | `75e6bf1a` (discovery) | discovery | `en` | Who Is That? | published |
| `bae953a5-a4ce-4642-931e-323bc205927a` | `75e6bf1a` (discovery) | discovery | `fr` | C'est qui, ça ? | published |
| `54119c4d-de37-4c8d-94bf-594d1e458b5e` | `75e6bf1a` (discovery) | discovery | `rw` | Ni Nde Uwo? | published |
| `12dd0dbd-4e72-4f17-b4b3-a61fb02f78eb` | `53208e04` (flipflop) | flipflop | `en` | Hello, Friend! | published |
| `8f9c9438-f06d-4c1d-90c9-58a3f3665e34` | `53208e04` (flipflop) | flipflop | `fr` | Bonjour, Mon Ami ! | published |
| `f226607b-6d88-4494-8e5f-27b1469df390` | `53208e04` (flipflop) | flipflop | `rw` | Muraho, Incuti! | published |
| `85f7ee3e-0788-4eb7-a034-2f821456b44b` | `1deb73c4` (coloring) | coloring | `en` | My Smiley Face | published |
| `fa3b56d2-40c3-466e-b324-6f5ee1c97a76` | `1deb73c4` (coloring) | coloring | `fr` | Mon Visage Souriant | published |
| `2e216768-82b1-46a2-bb49-97a8eafb1e53` | `1deb73c4` (coloring) | coloring | `rw` | Isura Yanjye Ishimye | published |

---

## 4. level_missions (8 rows)

| level_number | unit_number | category_slug | mission_id |
|---|---|---|---|
| 1 | 1 | `morning` | `f8495c5e-281c-49ff-93ae-ac4a86aaaddb` |
| 1 | 1 | `movement` | `63475a84-e360-4571-a568-3ab70053c8cc` |
| 1 | 1 | `artistic` | `9ee767a2-12be-47a2-abe1-1213cbb054f9` |
| 1 | 1 | `histoire` | `a85643a1-11ae-46ee-aba0-57219a96ecfd` |
| 1 | 1 | `zoom` | `c1265275-1e14-40a6-9d05-123e652e0960` |
| 1 | 1 | `discovery` | `75e6bf1a-19f2-40f4-bc4e-e7cb44dd1aaf` |
| 1 | 1 | `flipflop` | `53208e04-9c98-4520-a086-6b2d6178da42` |
| 1 | 1 | `coloring` | `1deb73c4-97aa-42e2-bd9f-3dca0f9535e6` |

---

## 5. stories (1 row)

| id | slug | title | theme_title | theme_emoji | is_active |
|---|---|---|---|---|---|
| `8b47e35f-dcf8-4eb8-b130-c638ffd1acd0` | `hello-friend-l1u1` | Hello, Friend! | Hello, World! | 👋 | true |

---

## 6. story_pages (5 rows)

| id | story_id | page_number | image_url |
|---|---|---|---|
| `035074e7-cab2-458c-9fbb-875a7ff1b391` | `8b47e35f` | 1 | null |
| `f8ec08ee-7221-43c2-bd7c-74230dae302c` | `8b47e35f` | 2 | null |
| `1fb47252-ce41-4de3-b057-88844ad758ec` | `8b47e35f` | 3 | null |
| `82a23c9c-f175-4d12-ba4d-b608f5df1d3c` | `8b47e35f` | 4 | null |
| `363a990b-bd1b-44fa-8982-6326e538ee56` | `8b47e35f` | 5 | null |

---

## 7. story_page_versions (15 rows)

| id | story_page_id | page | language | text |
|---|---|---|---|---|
| `2de798d1-c93d-45a5-bfe5-17dda0571a07` | `035074e7` (p.1) | 1 | `en` | Hello! Hello! This is Zara. |
| `ddeeccc2-54c9-4780-82da-3de013943ce0` | `035074e7` (p.1) | 1 | `fr` | Bonjour ! Bonjour ! Voici Zara. |
| `cb880269-1ab4-4a5b-9294-d220c7257459` | `035074e7` (p.1) | 1 | `rw` | Muraho! Muraho! Uyu ni Zara. |
| `1df2f0dc-a8a7-48ae-aff7-0a6cab982a14` | `f8ec08ee` (p.2) | 2 | `en` | Hello, Mama! Zara waves her hand. |
| `9bf9e7b1-4063-495c-bb46-20d41c8c6f9f` | `f8ec08ee` (p.2) | 2 | `fr` | Bonjour, Maman ! Zara agite la main. |
| `cb541fbe-54b3-426b-bdc6-79e0ee3de6c6` | `f8ec08ee` (p.2) | 2 | `rw` | Muraho, Mama! Zara akunira ukuboko. |
| `855f579a-fdc3-4d67-9e7a-d7be69694c6d` | `1fb47252` (p.3) | 3 | `en` | Hello, Baba! Zara smiles big. |
| `7b12a0f2-fb7f-4f0d-9327-5175ecabd950` | `1fb47252` (p.3) | 3 | `fr` | Bonjour, Papa ! Zara sourit fort. |
| `da3020d1-3d1b-43e3-a2fe-b515cf4beb37` | `1fb47252` (p.3) | 3 | `rw` | Muraho, Papa! Zara aseka cyane. |
| `01730006-240c-40ec-a9ee-d3c925d18753` | `82a23c9c` (p.4) | 4 | `en` | Hello, friend! They wave together. |
| `90cc9395-1bec-4a6b-a66f-20917d139529` | `82a23c9c` (p.4) | 4 | `fr` | Bonjour, ami ! Ils agitent ensemble. |
| `d3cb1a04-c0f1-4564-9c8e-29700cbff82a` | `82a23c9c` (p.4) | 4 | `rw` | Muraho, incuti! Bakunira hamwe. |
| `f92f1c96-1d31-491e-a5c0-467943425d59` | `363a990b` (p.5) | 5 | `en` | Hello, world! Zara loves everyone! |
| `c1654f83-89a8-4882-a8f2-eae0b238a191` | `363a990b` (p.5) | 5 | `fr` | Bonjour, monde ! Zara aime tout le monde ! |
| `5248331d-0511-444e-af5a-c57a1c4911ed` | `363a990b` (p.5) | 5 | `rw` | Muraho, isi! Zara akunda bose! |

---

## Totals

| Table | Rows | Verification |
|---|---|---|
| `curriculum_units` | 1 | ✅ |
| `missions` | 8 | ✅ |
| `mission_versions` | 24 | ✅ |
| `level_missions` | 8 | ✅ |
| `stories` | 1 | ✅ |
| `story_pages` | 5 | ✅ |
| `story_page_versions` | 15 | ✅ |
| **Total rows** | **62** | ✅ |

---

## Rollback Script

**File:** `supabase/migrations/rollback-041-level1-unit1.sql`

> **WARNING — DO NOT EXECUTE without explicit authorisation.**
> This script permanently deletes all Level 1 Unit 1 content from production.
> It is safe to run ONLY if no `child_progress` rows reference these missions
> (verified by the guard query at the top of the script).
> Cascade rules mean deleting `missions` removes `mission_versions` automatically.
> Deleting `stories` removes `story_pages` and `story_page_versions` automatically.

```sql
-- ============================================================
-- ROLLBACK: Migration 041 — Level 1, Unit 1 Bootstrap
--
-- Removes ONLY the 62 rows created by migration 041.
-- Does NOT touch any other curriculum content.
--
-- Safe cascade chains:
--   DELETE missions       → mission_versions deleted via FK cascade
--   DELETE stories        → story_pages + story_page_versions deleted via FK cascade
--   DELETE level_missions → no cascade (missions remain until explicitly deleted)
--   DELETE curriculum_units → standalone row, no cascade
--
-- GUARD: abort if any child has completed a lesson in this unit.
-- ============================================================

DO $$
DECLARE
  v_progress_count integer;
BEGIN

  -- ── GUARD: check for child completions ───────────────────────
  SELECT count(*) INTO v_progress_count
  FROM child_progress cp
  WHERE cp.mission_id IN (
    'f8495c5e-281c-49ff-93ae-ac4a86aaaddb',  -- morning
    '63475a84-e360-4571-a568-3ab70053c8cc',  -- movement
    '9ee767a2-12be-47a2-abe1-1213cbb054f9',  -- artistic
    'a85643a1-11ae-46ee-aba0-57219a96ecfd',  -- histoire
    'c1265275-1e14-40a6-9d05-123e652e0960',  -- zoom
    '75e6bf1a-19f2-40f4-bc4e-e7cb44dd1aaf',  -- discovery
    '53208e04-9c98-4520-a086-6b2d6178da42',  -- flipflop
    '1deb73c4-97aa-42e2-bd9f-3dca0f9535e6'   -- coloring
  );

  IF v_progress_count > 0 THEN
    RAISE EXCEPTION
      'Rollback aborted: % child_progress row(s) reference Level 1 Unit 1 missions. '
      'Resolve learner data before rolling back.',
      v_progress_count;
  END IF;


  -- ── 1. level_missions (8 rows) ───────────────────────────────
  -- Delete slot links first so missions can be removed cleanly.
  DELETE FROM level_missions
  WHERE level_number = 1 AND unit_number = 1;


  -- ── 2. missions + mission_versions (8 + 24 rows) ─────────────
  -- mission_versions deleted automatically via ON DELETE CASCADE.
  DELETE FROM missions
  WHERE id IN (
    'f8495c5e-281c-49ff-93ae-ac4a86aaaddb',  -- morning  / sing
    '63475a84-e360-4571-a568-3ab70053c8cc',  -- movement / move
    '9ee767a2-12be-47a2-abe1-1213cbb054f9',  -- artistic / color
    'a85643a1-11ae-46ee-aba0-57219a96ecfd',  -- histoire / read
    'c1265275-1e14-40a6-9d05-123e652e0960',  -- zoom     / watch
    '75e6bf1a-19f2-40f4-bc4e-e7cb44dd1aaf',  -- discovery/ watch
    '53208e04-9c98-4520-a086-6b2d6178da42',  -- flipflop / story
    '1deb73c4-97aa-42e2-bd9f-3dca0f9535e6'   -- coloring / color
  );


  -- ── 3. stories + story_pages + story_page_versions (1+5+15 rows)
  -- story_pages and story_page_versions deleted automatically
  -- via ON DELETE CASCADE from stories.
  DELETE FROM stories
  WHERE id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0';  -- hello-friend-l1u1


  -- ── 4. curriculum_units (1 row) ──────────────────────────────
  DELETE FROM curriculum_units
  WHERE level_number = 1 AND unit_number = 1;


  RAISE NOTICE
    'Rollback complete: Level 1 Unit 1 removed. '
    '8 level_missions, 8 missions, 24 mission_versions, '
    '1 story, 5 story_pages, 15 story_page_versions, '
    '1 curriculum_units row deleted.';

END $$;
```

---

## Rollback Safety Notes

| Check | Detail |
|---|---|
| Child progress guard | Rollback raises EXCEPTION if any `child_progress` row references these missions — no silent data loss |
| FK cascade coverage | `mission_versions`, `story_pages`, `story_page_versions` all deleted via cascade — no orphan rows |
| Scope isolation | The `level_missions` DELETE is scoped to `level_number=1 AND unit_number=1` only — other units untouched |
| Mission IDs are UUID literals | Future migrations cannot accidentally reuse these IDs — Postgres UUIDs are globally unique |
| Future units unaffected | Level 1 Units 2–52 and Levels 2–3 have no dependency on these rows — `curriculum_levels` is not touched |
