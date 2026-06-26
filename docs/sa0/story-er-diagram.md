# DOCUMENT 2: story-er-diagram.md

### Complete Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              STORY ADVENTURE TABLES (NEW)                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────┐       ┌──────────────────────┐                                   │
│  │    stories *      │──1:N─→│   story_versions     │                                   │
│  │──────────────────│       │──────────────────────│                                   │
│  │ id           PK  │       │ id              PK   │                                   │
│  │ slug       UNIQ  │       │ story_id        FK   │                                   │
│  │ title            │       │ language   en/fr/rw  │                                   │
│  │ cover_url        │       │ title                │                                   │
│  │ sort_order       │       │ cover_url            │                                   │
│  │ status           │       │ intro_video_url      │                                   │
│  │ is_active  (der) │       │ theme_song_url       │                                   │
│  │ age_min          │       │ story_intro_url      │                                   │
│  │ age_max          │       │ status               │                                   │
│  │ theme_emoji      │       │ published   (der)    │                                   │
│  │ published_at     │       │ UNIQ(story,lang)     │                                   │
│  │ retired_at       │       └──────────────────────┘                                   │
│  │ created_at       │                                                                   │
│  └──────┬───────────┘                                                                   │
│         │                                                                               │
│    ┌────┼──────────────────────────────────────────────────────┐                         │
│    │    │                                                      │                         │
│    │    ├──1:N─→┌──────────────────┐                          │                         │
│    │    │       │   story_slots    │                           │                         │
│    │    │       │──────────────────│                           │                         │
│    │    │       │ story_id    FK   │──────N:1──┐              │                         │
│    │    │       │ slot_key   CHECK │           │              │                         │
│    │    │       │ mission_id  FK ──┼───────────┼──→ missions  │                         │
│    │    │       │ sort_order      │           │     (SHARED)  │                         │
│    │    │       │ PK(story,slot)  │           │              │                         │
│    │    │       └──────────────────┘           │              │                         │
│    │    │                                      │              │                         │
│    │    ├──1:N─→┌──────────────────────┐      │              │                         │
│    │    │       │  story_pages *       │      │              │                         │
│    │    │       │──────────────────────│      │              │                         │
│    │    │       │ id             PK    │      │              │                         │
│    │    │       │ story_id       FK    │      │              │                         │
│    │    │       │ page_number         │      │              │                         │
│    │    │       │ image_url           │      │              │                         │
│    │    │       │ UNIQ(story,page)    │      │              │                         │
│    │    │       └─────────┬───────────┘      │              │                         │
│    │    │                 │                    │              │                         │
│    │    │            1:N  │                    │              │                         │
│    │    │                 ↓                    │              │                         │
│    │    │       ┌──────────────────────┐      │              │                         │
│    │    │       │ story_page_versions *│      │              │                         │
│    │    │       │──────────────────────│      │              │                         │
│    │    │       │ id             PK    │      │              │                         │
│    │    │       │ story_page_id  FK    │      │              │                         │
│    │    │       │ language             │      │              │                         │
│    │    │       │ text                 │      │              │                         │
│    │    │       │ audio_url            │      │              │                         │
│    │    │       │ published            │      │              │                         │
│    │    │       │ UNIQ(page,lang)      │      │              │                         │
│    │    │       └──────────────────────┘      │              │                         │
│    │    │                                      │              │                         │
│    │    ├──1:N─→┌──────────────────────┐      │              │                         │
│    │    │       │  coloring_pages *    │      │              │                         │
│    │    │       │──────────────────────│      │              │                         │
│    │    │       │ id             PK    │      │              │                         │
│    │    │       │ story_id       FK    │      │              │                         │
│    │    │       │ page_number         │      │              │                         │
│    │    │       │ template_image_url  │      │              │                         │
│    │    │       │ UNIQ(story,page)    │      │              │                         │
│    │    │       └──────────────────────┘      │              │                         │
│    │    │                                      │              │                         │
│    │    ├──1:1─→┌──────────────────────┐      │              │                         │
│    │    │       │ weekly_challenges    │      │              │                         │
│    │    │       │──────────────────────│      │              │                         │
│    │    │       │ id            PK     │      │              │                         │
│    │    │       │ story_id      FK     │      │              │                         │
│    │    │       │ sort_order          │      │              │                         │
│    │    │       │ type    CHECK       │      │              │                         │
│    │    │       │ stars               │      │              │                         │
│    │    │       └─────────┬───────────┘      │              │                         │
│    │    │                 │                    │              │                         │
│    │    │            1:N  │                    │              │                         │
│    │    │                 ↓                    │              │                         │
│    │    │       ┌─────────────────────────┐   │              │                         │
│    │    │       │weekly_challenge_versions│   │              │                         │
│    │    │       │─────────────────────────│   │              │                         │
│    │    │       │ id            PK        │   │              │                         │
│    │    │       │ challenge_id  FK        │   │              │                         │
│    │    │       │ language                │   │              │                         │
│    │    │       │ title                   │   │              │                         │
│    │    │       │ description             │   │              │                         │
│    │    │       │ content_json            │   │              │                         │
│    │    │       │ status                  │   │              │                         │
│    │    │       │ published    (der)      │   │              │                         │
│    │    │       │ UNIQ(challenge,lang)    │   │              │                         │
│    │    │       └─────────────────────────┘   │              │                         │
│    │    │                                      │              │                         │
│    └────┼──────────────────────────────────────┘              │                         │
│         │                                                     │                         │
│         │  PROGRESS TABLES (NEW)                              │                         │
│         │                                                     │                         │
│         ├──────→┌──────────────────────────┐                  │                         │
│         │       │  story_intro_progress    │                  │                         │
│         │       │──────────────────────────│                  │                         │
│         │       │ id              PK       │                  │                         │
│         │       │ child_id        FK ──────┼──→ children      │                         │
│         │       │ story_id        FK       │                  │                         │
│         │       │ language                 │                  │                         │
│         │       │ slot_key   CHECK         │                  │                         │
│         │       │ consumed_at              │                  │                         │
│         │       │ UNIQ(child,story,lang,   │                  │                         │
│         │       │      slot)               │                  │                         │
│         │       └──────────────────────────┘                  │                         │
│         │                                                     │                         │
│         │       ┌──────────────────────────┐                  │                         │
│         │       │weekly_challenge_progress │                  │                         │
│         │       │──────────────────────────│                  │                         │
│         │       │ id              PK       │                  │                         │
│         │       │ child_id        FK ──────┼──→ children      │                         │
│         │       │ challenge_id    FK ──────┼──→ weekly_       │                         │
│         │       │ language                 │   challenges     │                         │
│         │       │ stars_earned             │                  │                         │
│         │       │ completed_at             │                  │                         │
│         │       │ UNIQ(child,challenge,    │                  │                         │
│         │       │      lang)               │                  │                         │
│         │       └──────────────────────────┘                  │                         │
│         │                                                     │                         │
└─────────┴─────────────────────────────────────────────────────┘                         │
                                                                                          │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SHARED TABLES (BOTH MODELS USE)                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────┐       ┌──────────────────────┐                                   │
│  │    parents       │──1:N─→│    children           │                                   │
│  │──────────────────│       │──────────────────────│                                   │
│  │ id        PK/FK  │       │ id            PK     │                                   │
│  │ email            │       │ parent_id     FK     │                                   │
│  │ name             │       │ name                 │                                   │
│  │ created_at       │       │ avatar_url           │                                   │
│  └──────────────────┘       │ language   en/fr/rw  │                                   │
│                              │ age                  │                                   │
│  ┌──────────────────┐       │ favorite_category    │                                   │
│  │    admins        │       │ created_at           │                                   │
│  │──────────────────│       └──────────┬───────────┘                                   │
│  │ user_id   PK/FK  │                  │                                               │
│  │ role             │                  ├──→ child_progress     (SHARED)                 │
│  │ name             │                  ├──→ child_achievements (SHARED)                 │
│  │ created_at       │                  ├──→ child_badges       (LEGACY, DORMANT)        │
│  └──────────────────┘                  ├──→ coloring_saves     (SHARED)                 │
│                                        ├──→ shop_purchases     (SHARED)                 │
│  ┌──────────────────┐                  └──→ parental_settings  (SHARED)                 │
│  │   categories     │                                                                   │
│  │──────────────────│       ┌──────────────────────┐                                   │
│  │ slug        PK   │       │    missions          │                                   │
│  │ sort_order       │──1:N─→│──────────────────────│                                   │
│  │ default_type     │       │ id            PK     │                                   │
│  └──────────────────┘       │ story_id      FK ────┼──→ stories (nullable)              │
│                              │ category_slug FK ────┼──→ categories                     │
│  ┌──────────────────┐       │ sequence             │                                   │
│  │ child_progress   │       │ type          CHECK  │                                   │
│  │──────────────────│       │ stars                │                                   │
│  │ id          PK   │       │ duration_minutes     │                                   │
│  │ child_id    FK   │       │ active               │                                   │
│  │ mission_id  FK ──┼──→    │ created_at           │                                   │
│  │ language         │       └──────────┬───────────┘                                   │
│  │ stars_earned     │                  │                                               │
│  │ completed_at     │             1:N  │                                               │
│  │ UNIQ(child,      │                  ↓                                               │
│  │  mission,lang)   │       ┌──────────────────────┐                                   │
│  └──────────────────┘       │  mission_versions    │                                   │
│                              │──────────────────────│                                   │
│  ┌──────────────────┐       │ id            PK     │                                   │
│  │child_achievements│       │ mission_id    FK     │                                   │
│  │──────────────────│       │ language             │                                   │
│  │ id          PK   │       │ title                │                                   │
│  │ child_id    FK   │       │ subtitle             │                                   │
│  │ language         │       │ tip_text             │                                   │
│  │ type  badge/cert │       │ media_url            │                                   │
│  │ slug             │       │ content_json         │                                   │
│  │ earned_at        │       │ status               │                                   │
│  │ UNIQ(child,lang, │       │ published   (der)    │                                   │
│  │  type,slug)      │       │ revision_number      │                                   │
│  └──────────────────┘       │ is_current           │                                   │
│                              │ created_at           │                                   │
│                              │ UNIQ(mission,lang,   │                                   │
│                              │      revision)       │                                   │
│                              └──────────────────────┘                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                          
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              LEGACY BK CURRICULUM TABLES (DORMANT)                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  curriculum_levels          (032)  — Level metadata (age ranges, framework names)       │
│  curriculum_units           (038)  — Unit metadata (title, theme_emoji, status)         │
│  level_missions             (026/038) — Maps (level, unit, category) → mission_id      │
│  child_badges               (001)  — Superseded by child_achievements (012)             │
│                                                                                         │
│  NOTE: These tables are NOT dropped. They remain in the schema but are not read by      │
│  any Story Adventure RPC. If BK Curriculum is reactivated, these tables resume as-is.   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Table Ownership Map

| Table | Owner | Status |
|-------|-------|--------|
| `stories` | Story Adventure | EXTENDED (add status, age_min, age_max, published_at, retired_at) |
| `story_versions` | Story Adventure | NEW |
| `story_slots` | Story Adventure | NEW |
| `story_pages` | Shared | KEEP (used by FlipFlop slot) |
| `story_page_versions` | Shared | KEEP (used by FlipFlop slot) |
| `coloring_pages` | Shared | KEEP (used by Coloring slot) |
| `story_intro_progress` | Story Adventure | NEW |
| `weekly_challenges` | Story Adventure | NEW |
| `weekly_challenge_versions` | Story Adventure | NEW |
| `weekly_challenge_progress` | Story Adventure | NEW |
| `parents` | Shared | KEEP |
| `children` | Shared | KEEP |
| `parental_settings` | Shared | KEEP |
| `admins` | Shared | KEEP |
| `categories` | Shared | KEEP (slot_key -> category_slug mapping) |
| `missions` | Shared | KEEP (Story Adventure creates missions via story_slots) |
| `mission_versions` | Shared | KEEP (same content lifecycle) |
| `child_progress` | Shared | KEEP (records slot mission completions) |
| `child_achievements` | Shared | KEEP (records story badges/certificates) |
| `coloring_saves` | Shared | KEEP |
| `shop_purchases` | Shared | KEEP |
| `creations` | Shared | KEEP |
| `likes` | Shared | KEEP |
| `curriculum_levels` | Legacy BK | DORMANT |
| `curriculum_units` | Legacy BK | DORMANT |
| `level_missions` | Legacy BK | DORMANT |
| `child_badges` | Legacy BK | DORMANT (superseded by child_achievements) |

### RPC Ownership Map

| RPC | Owner | Status |
|-----|-------|--------|
| `get_current_story` | Story Adventure | NEW |
| `is_story_unlocked` | Story Adventure | NEW |
| `complete_story_mission` | Story Adventure | NEW |
| `is_story_complete` | Story Adventure | NEW |
| `get_story_progress` | Story Adventure | NEW |
| `complete_weekly_challenge` | Story Adventure | NEW |
| `admin_validate_story_publishable` | Story Adventure | NEW |
| `admin_publish_story` | Story Adventure | NEW |
| `admin_reorder_stories` | Story Adventure | NEW |
| `admin_retire_story` | Story Adventure | NEW |
| `is_my_child` | Shared | KEEP |
| `is_admin` | Shared | KEEP |
| `category_effective_language` | Shared | KEEP |
| `sync_mission_version_published` | Shared | KEEP (trigger) |
| `publish_mission_version_revision` | Shared | KEEP |
| `create_mission_version_revision` | Shared | KEEP |
| `get_daily_missions` | Legacy BK | DORMANT |
| `complete_mission` | Legacy BK | DORMANT |
| `get_current_level` | Legacy BK | DORMANT |
| `get_current_position` | Legacy BK | DORMANT |
| `get_curriculum_missions` | Legacy BK | DORMANT |
| `complete_curriculum_mission` | Legacy BK | DORMANT |
| `admin_bulk_import_missions` | Legacy BK | DORMANT |
| `level_slot_available` | Legacy BK | DORMANT |
| `admin_archive_lesson` | Shared | KEEP (works on missions generically) |
| `admin_restore_lesson` | Shared | KEEP |
| `get_curriculum_integrity_report` | Legacy BK | DORMANT (replace with `get_story_integrity_report`) |
| `export_unit_content` | Legacy BK | DORMANT |

---

