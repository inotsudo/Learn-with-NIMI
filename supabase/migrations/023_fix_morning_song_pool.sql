-- ============================================================
--  NIMIPIKO — 023: Fix "morning" daily-rotation pool
--
--  Migration 021 intended to create 3 distinct "morning" missions
--  (sequence 1/2/3 — "Morning Song" / "Wake Up Song" / "Friendship
--  Song"), each with en/fr/rw mission_versions. After re-application,
--  the "morning" category ended up with only ONE mission row whose
--  mission_versions mixed content from different songs (title from
--  "Morning Song"/"Friendship Song" depending on language, subtitle/
--  lyrics from "Friendship Song" for all 3 languages) — total_in_category
--  collapsed back to 1, the new daily-rotation branch was never taken,
--  and a premature "morning-master-*" badge got awarded after a single
--  completion.
--
--  Fix: rebuild the 3-mission pool explicitly and idempotently —
--  upsert missions(category_slug='morning', sequence in (1,2,3)) by
--  their (category_slug, sequence) unique key, then upsert all 9
--  mission_versions rows (3 songs x en/fr/rw) by (mission_id, language),
--  fully overwriting title/subtitle/tip_text/media_url/content_json.
--  Also removes the premature "morning-master-*" badge(s) so it can be
--  earned correctly once all 3 songs are completed at least once.
--
--  NOTE: Kinyarwanda lyrics are a first draft for native-speaker review
--  via the admin Mission Manager — not final.
-- ============================================================

-- ── 0. Remove premature "morning mastered" badge(s) ─────────────
delete from child_achievements
where type = 'badge' and slug like 'morning-master-%';


-- ── 1. Ensure 3 "morning" missions exist (seq 1/2/3), all active ──
insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
values ('morning', 1, 'sing', 10, 10, null, true)
on conflict (category_slug, sequence) do update set active = true;

insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
values ('morning', 2, 'sing', 10, 10, null, true)
on conflict (category_slug, sequence) do update set active = true;

insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
values ('morning', 3, 'sing', 10, 10, null, true)
on conflict (category_slug, sequence) do update set active = true;


-- ── 2. seq=1 "Morning Song" — en/fr/rw ──────────────────────────
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 1),
  'en', 'Sing Along with Nimi', 'Morning Song',
  'Singing every morning helps you remember new words!',
  'storyBook/song.mp3',
  '{"lyrics": ["Good morning sun,", "Good morning world!", "Wake up Nimi,", "Wake up Piko too!", "It''s a brand new day,", "Let''s sing and play!"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 1),
  'fr', 'Chante avec Nimi', 'Chanson du Matin',
  'Chanter chaque matin t''aide à retenir de nouveaux mots !',
  'storyBook/song.mp3',
  '{"lyrics": ["Bonjour soleil,", "Bonjour le monde !", "Réveille-toi Nimi,", "Réveille-toi Piko aussi !", "C''est un nouveau jour,", "Chantons et jouons !"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 1),
  'rw', 'Ririmba na Nimi', 'Indirimbo y''Igitondo',
  'Kuririmba buri gitondo bigufasha kwibuka amagambo mashya!',
  'storyBook/song.mp3',
  '{"lyrics": ["Mwaramutse zuba,", "Mwaramutse isi!", "Kanguka Nimi,", "Kanguka na Piko!", "Ni umunsi mushya,", "Reka duririmbe tunakine!"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;


-- ── 3. seq=2 "Wake Up Song" — en/fr/rw ──────────────────────────
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 2),
  'en', 'Sing Along with Nimi', 'Wake Up Song',
  'Stretching wakes up your body and your brain!',
  'storyBook/song.mp3',
  '{"lyrics": ["Stretch up high,", "Touch the sky!", "Wiggle your fingers,", "Wiggle your toes!", "Take a deep breath,", "Here we go!"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 2),
  'fr', 'Chante avec Nimi', 'Chanson du Réveil',
  'S''étirer réveille ton corps et ton cerveau !',
  'storyBook/song.mp3',
  '{"lyrics": ["Étire-toi bien haut,", "Touche le ciel !", "Remue tes doigts,", "Remue tes orteils !", "Prends une grande respiration,", "Et c''est parti !"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 2),
  'rw', 'Ririmba na Nimi', 'Indirimbo yo Kubyuka',
  'Kwirambura bikangura umubiri n''ubwenge bwawe!',
  'storyBook/song.mp3',
  '{"lyrics": ["Wirambure hejuru,", "Kora ikirere!", "Nyeganyeza intoki zawe,", "Nyeganyeza ibirenge byawe!", "Fata umwuka mwinshi,", "Reka dutangire!"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;


-- ── 4. seq=3 "Friendship Song" — en/fr/rw ───────────────────────
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 3),
  'en', 'Sing Along with Nimi', 'Friendship Song',
  'Being kind to friends makes everyone happy!',
  'storyBook/song.mp3',
  '{"lyrics": ["Hello, friend,", "How are you today?", "Let''s be kind,", "All through the day!", "With a smile,", "And a warm hello,", "Nimi loves", "Me and you!"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 3),
  'fr', 'Chante avec Nimi', 'Chanson de l''Amitié',
  'Être gentil avec ses amis rend tout le monde heureux !',
  'storyBook/song.mp3',
  '{"lyrics": ["Bonjour mon ami,", "Comment vas-tu ?", "Soyons gentils,", "Toute la journée !", "Avec un sourire,", "Et un grand bonjour,", "Nimi nous aime,", "Toi et moi !"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
values (
  (select id from missions where category_slug = 'morning' and sequence = 3),
  'rw', 'Ririmba na Nimi', 'Indirimbo y''Ubucuti',
  'Kuba mwiza ku ncuti bituma bose bishima!',
  'storyBook/song.mp3',
  '{"lyrics": ["Muraho mukunzi,", "Amakuru yawe none?", "Reka tube beza,", "Umunsi wose!", "Tunyeganyeze,", "Tuvuge muraho,", "Nimi yakunda", "Njye na wewe!"]}'::jsonb
)
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;
