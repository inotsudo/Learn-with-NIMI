-- ============================================================
--  NIMIPIKO — 024: Fix "morning" pool audio (don't copy song.mp3)
--
--  Migrations 021/023 set media_url='storyBook/song.mp3' on ALL 9
--  "morning" mission_versions rows (3 songs x en/fr/rw). Only ONE
--  audio file exists in storage, recorded for "Morning Song" (seq=1)
--  — "Wake Up Song" (seq=2) and "Friendship Song" (seq=3) have no
--  matching recording, so they were silently playing seq=1's audio
--  ("the same as before") regardless of which song/language was shown.
--
--  Fix: clear media_url for seq=2/seq=3 across all 3 languages so the
--  player doesn't play mismatched audio. SingAlongContent now falls
--  back to a per-language text-to-speech "Read Along" experience
--  (line-by-line, karaoke-highlighted) when media_url is absent.
--  seq=1 keeps its real song.mp3.
-- ============================================================

update mission_versions
set media_url = null
where mission_id in (
  select id from missions where category_slug = 'morning' and sequence in (2, 3)
);
