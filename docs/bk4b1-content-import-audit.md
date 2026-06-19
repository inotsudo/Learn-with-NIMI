# BK.4B.1 Content Import Status Audit
## Level 1 · Unit 1 — Migration 041 vs. Approved Content

**Date:** 2026-06-16
**Scope:** All rows created by migration `041_level1_unit1_bootstrap.sql`
**Live data queried via:** `supabase db query --linked`
**Source documents compared:**
- `docs/level1-unit1-content.md` (authored lesson content)
- `docs/lesson-template-standard.md` (field specs and quality standards)

---

## 1. Classification: A or B?

**Determination: B — Production import of `level1-unit1-content.md`**

Evidence:

| Signal | Value |
|---|---|
| Phase spec (BK.4B.1A) status directive | `Status: Published` — not `draft` |
| All 24 `mission_versions.status` | `'published'` |
| All 24 `mission_versions.published` | `true` |
| Content in DB | Real educational content, not placeholder text |
| Titles match authored doc | 24/24 exact match |
| Migration push notice | "first production curriculum unit" |

The CMS Import Summary in `level1-unit1-content.md` shows `status = draft` — that table describes the BulkImportManager path (import as draft, promote via MissionEditor). Migration 041 bypassed that flow and set `published` directly, per the BK.4B.1A phase spec. This is an intentional override, not an error.

---

## 2. Lesson-by-Lesson Comparison

### Lesson 1 — Morning Song (`morning`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | Hello, Hello! | Hello, Hello! | ✅ |
| EN subtitle | A call-and-response greeting song with waves and smiles | A call-and-response greeting song with waves and smiles | ✅ |
| EN tip_text | Sing this every morning this week!… | Sing this every morning this week!… | ✅ |
| EN content_json | `{"lyrics": [10 items]}` | `{"lyrics": [10 items]}` | ✅ |
| FR title | Bonjour, Bonjour ! | Bonjour, Bonjour ! | ✅ |
| FR subtitle | Une chanson d'accueil en appel-réponse avec gestes | Une chanson d'accueil en appel-réponse avec gestes | ✅ |
| FR tip_text | Chantez cette chanson chaque matin… | Chantez cette chanson chaque matin… | ✅ |
| FR content_json | `{"lyrics": [10 items]}` | `{"lyrics": [10 items]}` | ✅ |
| RW title | Muraho, Muraho! | Muraho, Muraho! | ✅ |
| RW subtitle | Indirimbo yo kwakirana n'imigenamwimvo | Indirimbo yo kwakirana n'imigenamwimvo | ✅ |
| RW tip_text | Imbiriza indirimbo iyi buri mataha… | Imbiriza indirimbo iyi buri mataha… | ✅ |
| RW content_json | `{"lyrics": [10 items, [IZINA] token]}` | `{"lyrics": [10 items, [IZINA] token]}` | ✅ |
| media_url | not authored (BK.4C) | null | ✅ intentional |

**Status: FULL MATCH — production content**

---

### Lesson 2 — Movement Mission (`movement`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | Come to Me! | Come to Me! | ✅ |
| EN subtitle | A walk-and-wave greeting game | A walk-and-wave greeting game | ✅ |
| EN tip_text | Say "wave" and wave yourself first… | Say "wave" and wave yourself first… | ✅ |
| EN content_json | `{"prompts": [4 items with emoji+label]}` | `{"prompts": [4 items with emoji+label]}` | ✅ |
| FR title | Viens vers moi ! | Viens vers moi ! | ✅ |
| FR content_json | 4 FR prompts | 4 FR prompts | ✅ |
| RW title | Nzana ino! | Nzana ino! | ✅ |
| RW content_json | 4 RW prompts | 4 RW prompts | ✅ |
| media_url | not authored (BK.4C) | null | ✅ intentional |

**Status: FULL MATCH — production content**

---

### Lesson 3 — Mission Artistique (`artistic`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | My Hello Hand | My Hello Hand | ✅ |
| EN subtitle | Stamp your hand and send a greeting! | Stamp your hand and send a greeting! | ✅ |
| EN content_json | `{"instructions": "Dip your hand in the paint…"}` | `{"instructions": "Dip your hand in the paint…"}` | ✅ |
| FR title | Ma Main Bonjour | Ma Main Bonjour | ✅ |
| FR subtitle | Tamponne ta main et envoie un bonjour ! | Tamponne ta main et envoie un bonjour ! | ✅ |
| FR content_json | FR instructions | FR instructions | ✅ |
| RW title | Ukuboko Kwanjye kwa Muraho | Ukuboko Kwanjye kwa Muraho | ✅ |
| RW subtitle | Shira akaboko mu mafuta uhereze abantu muraho! | Shira akaboko mu mafuta uhereze abantu muraho! | ✅ |
| RW content_json | RW instructions | RW instructions | ✅ |
| media_url | not authored (BK.4C) | null | ✅ intentional |

**Status: FULL MATCH — production content**

---

### Lesson 4 — Mission Historique (`histoire`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | Baby Amara's Morning | Baby Amara's Morning | ✅ |
| EN subtitle | A story about a baby's first hello | A story about a baby's first hello | ✅ |
| EN content_json | `{"text": "This is Amara… Hello, world!"}` (11 sentences) | `{"text": "This is Amara… Hello, world!"}` (11 sentences) | ✅ |
| FR title | Le Matin de Bébé Amara | Le Matin de Bébé Amara | ✅ |
| FR content_json | `{"text": "Voici Amara… Bonjour, le monde !"}` | `{"text": "Voici Amara… Bonjour, le monde !"}` | ✅ |
| RW title | Mu Gitondo cya Amara Mwana | Mu Gitondo cya Amara Mwana | ✅ |
| RW subtitle | Inkuru y'indoto ya mbere ya mwana muto | Inkuru y'indoto ya mbere ya mwana muto | ✅ |
| RW content_json | `{"text": "Uyu ni Amara… Muraho, isi yose!"}` | `{"text": "Uyu ni Amara… Muraho, isi yose!"}` | ✅ |
| media_url | not authored (BK.4C) | null | ✅ intentional |

**Status: FULL MATCH — production content**

---

### Lesson 5 — Mission Zoom (`zoom`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | Hello, Rwanda! | Hello, Rwanda! | ✅ |
| EN subtitle | Watch friendly faces say hello in three languages | Watch friendly faces say hello in three languages | ✅ |
| EN content_json | `{"instructions": "Watch the friendly faces!…"}` | `{"instructions": "Watch the friendly faces!…"}` | ✅ |
| FR title | Bonjour, Rwanda ! | Bonjour, Rwanda ! | ✅ |
| FR content_json | FR instructions | FR instructions | ✅ |
| RW title | Muraho, Rwanda! | Muraho, Rwanda! | ✅ |
| RW subtitle | Reba inzira zishimye zivuga muraho mu ndimi eshatu | Reba inzira zishimye zivuga muraho mu ndimi eshatu | ✅ |
| RW content_json | `{"instructions": "Reba inzira zishimye!…"}` | `{"instructions": "Reba inzira zishimye!…"}` | ✅ |
| media_url | not authored (BK.4C) | null | ⚠️ intentional — video required for core activity |

**Status: FULL MATCH — production content; video asset pending BK.4C**

Note: This lesson's activity (watching greetings on screen) needs a `media_url` to be functionally complete. The text instructions render without it, but the lesson is media-dependent. This is the highest-priority BK.4C asset.

---

### Lesson 6 — Mission Discovery (`discovery`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | Who Is That? | Who Is That? | ✅ |
| EN subtitle | Look in the mirror and say hello to YOU! | Look in the mirror and say hello to YOU! | ✅ |
| EN content_json | `{"instructions": "Look in the mirror!…"}` | `{"instructions": "Look in the mirror!…"}` | ✅ |
| FR title | C'est qui, ça ? | C'est qui, ça ? | ✅ |
| FR content_json | FR instructions | FR instructions | ✅ |
| RW title | Ni Nde Uwo? | Ni Nde Uwo? | ✅ |
| RW subtitle | Reba mu kioo uvuge muraho WEWE UBWAWE! | Reba mu kioo uvuge muraho WEWE UBWAWE! | ✅ |
| RW content_json | RW instructions | RW instructions | ✅ |
| media_url | not authored (BK.4C) | null | ✅ intentional — mirror activity is physical |

**Status: FULL MATCH — production content**

---

### Lesson 7 — FlipFlop Book (`flipflop`)

#### Mission version fields

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | Hello, Friend! | Hello, Friend! | ✅ |
| EN subtitle | A flip-book story about saying hello in Rwanda | A flip-book story about saying hello in Rwanda | ✅ |
| EN tip_text | Read this book every day this week!… | Read this book every day this week!… | ✅ |
| EN content_json | `{}` | `{}` | ✅ |
| FR title | Bonjour, Mon Ami ! | Bonjour, Mon Ami ! | ✅ |
| FR subtitle | Une histoire en images sur les bonjours au Rwanda | Une histoire en images sur les bonjours au Rwanda | ✅ |
| FR content_json | `{}` | `{}` | ✅ |
| RW title | Muraho, Incuti! | Muraho, Incuti! | ✅ |
| RW subtitle | Inkuru y'amashusho yo kwakirana mu Rwanda | Inkuru y'amashusho yo kwakirana mu Rwanda | ✅ |
| RW content_json | `{}` | `{}` | ✅ |

#### Story page versions (15 rows)

| Page | Language | Approved text | Live DB text | Match |
|---|---|---|---|---|
| 1 | en | Hello! Hello! This is Zara. | Hello! Hello! This is Zara. | ✅ |
| 1 | fr | Bonjour ! Bonjour ! Voici Zara. | Bonjour ! Bonjour ! Voici Zara. | ✅ |
| 1 | rw | Muraho! Muraho! Uyu ni Zara. | Muraho! Muraho! Uyu ni Zara. | ✅ |
| 2 | en | Hello, Mama! Zara waves her hand. | Hello, Mama! Zara waves her hand. | ✅ |
| 2 | fr | Bonjour, Maman ! Zara agite la main. | Bonjour, Maman ! Zara agite la main. | ✅ |
| 2 | rw | Muraho, Mama! Zara akunira ukuboko. | Muraho, Mama! Zara akunira ukuboko. | ✅ |
| 3 | en | Hello, Baba! Zara smiles big. | Hello, Baba! Zara smiles big. | ✅ |
| 3 | fr | Bonjour, Papa ! Zara sourit fort. | Bonjour, Papa ! Zara sourit fort. | ✅ |
| 3 | rw | Muraho, Papa! Zara aseka cyane. | Muraho, Papa! Zara aseka cyane. | ✅ |
| 4 | en | Hello, friend! They wave together. | Hello, friend! They wave together. | ✅ |
| 4 | fr | Bonjour, ami ! Ils agitent ensemble. | Bonjour, ami ! Ils agitent ensemble. | ✅ |
| 4 | rw | Muraho, incuti! Bakunira hamwe. | Muraho, incuti! Bakunira hamwe. | ✅ |
| 5 | en | Hello, world! Zara loves everyone! | Hello, world! Zara loves everyone! | ✅ |
| 5 | fr | Bonjour, monde ! Zara aime tout le monde ! | Bonjour, monde ! Zara aime tout le monde ! | ✅ |
| 5 | rw | Muraho, isi! Zara akunda bose! | Muraho, isi! Zara akunda bose! | ✅ |

#### Media gaps

| Field | Count | Value | Intentional |
|---|---|---|---|
| `story_pages.image_url` | 5 | null | ✅ BK.4C |
| `story_page_versions.audio_url` | 15 | null | ✅ BK.4C |

**Status: TEXT CONTENT FULL MATCH (15/15 story page versions exact); media pending BK.4C**

---

### Lesson 8 — Coloring Book (`coloring`)

| Field | Approved content | Live DB | Match |
|---|---|---|---|
| EN title | My Smiley Face | My Smiley Face | ✅ |
| EN subtitle | Color a big happy face that says hello! | Color a big happy face that says hello! | ✅ |
| EN tip_text | Scribbling outside the lines is PERFECT… | Scribbling outside the lines is PERFECT… | ✅ |
| EN content_json | `{"instructions": "Color the big smiley face!…"}` | `{"instructions": "Color the big smiley face!…"}` | ✅ |
| FR title | Mon Visage Souriant | Mon Visage Souriant | ✅ |
| FR content_json | FR instructions | FR instructions | ✅ |
| RW title | Isura Yanjye Ishimye | Isura Yanjye Ishimye | ✅ |
| RW subtitle | Sura isura nini ishimye ivuga muraho! | Sura isura nini ishimye ivuga muraho! | ✅ |
| RW content_json | RW instructions | RW instructions | ✅ |
| media_url | not authored (BK.4C) | null | ✅ intentional |
| `coloring_pages` row | not in migration | 0 rows | ⚠️ intentional — template image pending BK.4C |

**Status: FULL MATCH for text; coloring template image pending BK.4C**

---

## 3. Gap Report Summary

### 3a. Which lessons match the approved content?

**All 8 lessons** match `level1-unit1-content.md` exactly across all text fields.

Verified:
- 24 `mission_versions` rows: title ✅, subtitle ✅, tip_text ✅, content_json ✅ (all 8 types correct)
- 15 `story_page_versions` rows: text ✅ (all 15 exact)
- All `status = 'published'`, `published = true`, `is_current = true`, `revision_number = 1` ✅

Zero divergence between live DB content and authored source document.

### 3b. Which lessons are placeholders?

**None.** Every lesson contains purpose-authored educational content:

| Category | Content type | Not placeholder evidence |
|---|---|---|
| morning | Song lyrics | 10-line call-and-response with `[NAME]`/`[PRÉNOM]`/`[IZINA]` tokens |
| movement | Activity prompts | 4 emojis with contextualised Rwandan greeting labels |
| artistic | Instructions | Paint hand-stamp activity with finger-counting language |
| histoire | Story text | Amara character, Rwanda setting, 11 purposeful sentences |
| zoom | Watch instructions | All three greeting words woven in; culturally grounded |
| discovery | Watch instructions | Mirror self-recognition activity with developmental rationale |
| flipflop | Story pages | 5-page Zara narrative with graduated social greeting arc |
| coloring | Instructions | Smiley face with vocabulary narration prompt |

### 3c. Missing fields

All gaps were pre-documented in `phase-bk41-curriculum-bootstrap.md` as BK.4C scope.

| Field | Table | Null count | Functional impact |
|---|---|---|---|
| `media_url` | `mission_versions` | 24 | Low — text content renders without it for 7/8 lessons |
| `media_url` | `mission_versions` (zoom) | 1 | **High** — Zoom activity is screen-based; needs a video |
| `image_url` | `story_pages` | 5 | Medium — FlipFlop renders text only; illustrations pending |
| `audio_url` | `story_page_versions` | 15 | Medium — story narration text renders; audio pending |
| coloring template | `coloring_pages` | 0 rows | Medium — Coloring activity needs printable template |

Priority order for BK.4C: **Zoom video > FlipFlop illustrations > Coloring template > FlipFlop audio > remaining media_url**

### 3d. CMS fields populated

| Field | 23 non-FlipFlop versions | 3 FlipFlop versions | 15 story_page_versions |
|---|---|---|---|
| `title` | ✅ all | ✅ all | N/A |
| `subtitle` | ✅ all | ✅ all | N/A |
| `tip_text` | ✅ all | ✅ all | N/A |
| `content_json` | ✅ type-correct JSON | ✅ `{}` | N/A |
| `text` | N/A | N/A | ✅ all 15 |
| `status` | ✅ `published` all | ✅ `published` all | N/A |
| `published` | ✅ `true` all | ✅ `true` all | ✅ `true` all |
| `is_current` | ✅ `true` all | ✅ `true` all | N/A |
| `revision_number` | ✅ `1` all | ✅ `1` all | N/A |
| `media_url` | ⚠️ null all | ⚠️ null all | N/A |
| `image_url` | N/A | N/A (story_pages) | ⚠️ null all 5 pages |
| `audio_url` | N/A | N/A | ⚠️ null all 15 |

**One status note:** `level1-unit1-content.md` CMS Import Summary lists `status = draft` for all 8 lessons. The live DB has `status = published`. This is not a data error — the BK.4B.1A phase spec explicitly set `Status: Published`, overriding the default import-as-draft workflow. The content doc's "draft" describes the BulkImportManager path, which was bypassed by the direct SQL migration.

### 3e. Rollback recommendation

**NOT RECOMMENDED.**

| Factor | Assessment |
|---|---|
| Content accuracy | 100% — all 62 rows match approved authored source |
| Content quality | Passes all 7 domains in `content-verification-report.md` |
| Functional state | Text-only delivery fully functional; media gaps are additive |
| Risk of rollback | Would destroy correctly authored, verified, published content |
| Benefit of rollback | None — no errors, no placeholder content, no structural issues |

If media assets must be present before learner exposure, the correct path is to **unpublish** the affected versions via MissionEditor (set status back to `review` or `draft`) — not to roll back and delete the authored text content. The rollback script in `migration-041-audit-and-rollback.md` remains available if needed for other reasons (e.g. structural schema change that requires fresh re-import).

---

## 4. Audit Conclusion

Migration 041 is a **complete, accurate production import** of `level1-unit1-content.md`.

- **62 rows** created: 1 curriculum_units + 8 missions + 24 mission_versions + 8 level_missions + 1 stories + 5 story_pages + 15 story_page_versions
- **Zero divergence** between live DB content and approved authored source (field-by-field verified)
- **Zero placeholders** — all content is purpose-authored educational material
- **All text fields populated** correctly for all 24 mission_versions and 15 story_page_versions
- **44 null media fields** — all intentional, documented, and assigned to BK.4C
- **Status: published** (intentional override of default draft — per BK.4B.1A phase spec)

**The curriculum database is ready for BK.4B.2 (Level 1, Unit 2 content authoring).**
