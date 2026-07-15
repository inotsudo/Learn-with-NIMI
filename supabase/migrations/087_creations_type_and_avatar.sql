-- ═══════════════════════════════════════════════════════════════
--  087 — Creations: expand type enum + add child_avatar_url
--
--  1. Drops the old type check (art/coloring/story only) and
--     replaces it with one that covers all community post types.
--  2. Adds child_avatar_url column so the card avatar is stored
--     directly on the row — no FK join required.
--  3. Backfills child_avatar_url from the children table for
--     existing rows that have child_id set.
-- ═══════════════════════════════════════════════════════════════

-- 1. Drop old type check and add expanded one
alter table creations drop constraint if exists creations_type_check;

alter table creations
  add constraint creations_type_check
  check (type in ('art', 'coloring', 'story', 'certificate', 'story_progress', 'sticker', 'challenge'));

-- 2. Add child_avatar_url column
alter table creations
  add column if not exists child_avatar_url text;

-- 3. Backfill from children table
update creations c
set    child_avatar_url = ch.avatar_url
from   children ch
where  c.child_id = ch.id
and    c.child_avatar_url is null
and    ch.avatar_url is not null;
