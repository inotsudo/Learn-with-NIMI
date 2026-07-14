-- ══════════════════════════════════════════════════════════════
--  086 — Remove test / bad-data community posts
--  Deletes creations that were posted before the picker was fixed:
--   • Posts describing 0% story progress (never actually started)
--   • Posts referencing the "story pdf" dummy story title
--   • Any sticker-typed post that was intended as a story share
-- ══════════════════════════════════════════════════════════════

delete from creations
where
  -- "0% through" posts — story was never started
  description ilike '%0% through%'
  -- dummy "story pdf" title posts
  or description ilike '%story pdf%'
  -- sticker type used incorrectly for story progress posts
  or (type = 'sticker' and description ilike '%through%');
