-- ═══════════════════════════════════════════════════════════════
--  088 — Creations: add story_key for reliable dedup
--
--  Stores a stable "${childId}-${storySid}" key on each creation
--  so the share picker can filter already-shared stories without
--  parsing the description text.
-- ═══════════════════════════════════════════════════════════════

alter table creations
  add column if not exists story_key text;

create index if not exists creations_story_key_idx on creations (story_key);
