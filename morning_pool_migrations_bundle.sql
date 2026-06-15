-- ============================================================
--  NIMIPIKO — Bundled migrations: 021-025 (morning song pool pilot)
--  Concatenated for review. Already applied individually to the
--  remote database via supabase db push — this bundle is for
--  reference only, do NOT re-run as a new migration.
-- ============================================================

-- ============================================================
--  FILE: 021_morning_song_rotation.sql
-- ============================================================
-- ============================================================
--  NIMIPIKO — 021: Daily rotation pilot for "morning" category
--
--  Problem:
--    Every category currently has exactly ONE mission, so once a child
--    finishes it (ever), the category is "mastered" forever and shows
--    the exact same content every day. Migration 020's English fallback
--    then leaks English content into FR/RW children's daily missions
--    for categories with no native translation, which isn't the intent
--    either — the real fix is native content + variety, not borrowed
--    English.
--
--  Fix (pilot — "morning" category only):
--    Add 2 more "morning" missions (sequence 2 and 3 — "Wake Up Song"
--    and "Friendship Song"), each with full en/fr/rw mission_versions
--    (3 songs total, each translated into all 3 languages — every
--    language gets the SAME 3 songs, just in their own language, no
--    fallback needed). get_daily_missions now picks "today's song" by
--    calendar date: pool[(days since epoch) % pool_size] — the same
--    song for every child on a given day, cycling 1→2→3→1→2→3...
--    "morning-master" badge now requires having completed ALL 3 songs
--    at least once (ever), not just 1.
--
--    Categories that still have only 1 published mission (the other 7)
--    keep the EXACT 019/020 sequential logic — unaffected.
--
--  Also: deactivates a stray test mission ("histoire" sequence 2,
--  unpublished-EN "New Mission" / FR "Mission Artistique") left over
--  from earlier admin-CMS verification, so it doesn't accidentally
--  become a 2-mission "pool" for "histoire" under the new logic.
--
--  NOTE: Kinyarwanda lyrics below are a first draft for review by a
--  native speaker via the admin Mission Manager — not final.
-- ============================================================

-- ── 0. Deactivate stray "histoire" seq=2 test mission ──────────
update missions set active = false
where category_slug = 'histoire' and sequence = 2;


-- ── 1. "morning" seq=1 — add fr/rw versions of "Morning Song" ──
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


-- ── 2. "morning" seq=2 — NEW "Wake Up Song" (en/fr/rw) ──────────
with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 2, 'sing', 10, 10, null, true)
  on conflict (category_slug, sequence) do update set active = true
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Sing Along with Nimi', 'Wake Up Song',
  'Stretching wakes up your body and your brain!',
  'storyBook/song.mp3',
  '{"lyrics": ["Stretch up high,", "Touch the sky!", "Wiggle your fingers,", "Wiggle your toes!", "Take a deep breath,", "Here we go!"]}'::jsonb
from m
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 2, 'sing', 10, 10, null, true)
  on conflict (category_slug, sequence) do update set active = true
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'fr', 'Chante avec Nimi', 'Chanson du Réveil',
  'S''étirer réveille ton corps et ton cerveau !',
  'storyBook/song.mp3',
  '{"lyrics": ["Étire-toi bien haut,", "Touche le ciel !", "Remue tes doigts,", "Remue tes orteils !", "Prends une grande respiration,", "Et c''est parti !"]}'::jsonb
from m
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 2, 'sing', 10, 10, null, true)
  on conflict (category_slug, sequence) do update set active = true
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'rw', 'Ririmba na Nimi', 'Indirimbo yo Kubyuka',
  'Kwirambura bikangura umubiri n''ubwenge bwawe!',
  'storyBook/song.mp3',
  '{"lyrics": ["Wirambure hejuru,", "Kora ikirere!", "Nyeganyeza intoki zawe,", "Nyeganyeza ibirenge byawe!", "Fata umwuka mwinshi,", "Reka dutangire!"]}'::jsonb
from m
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;


-- ── 3. "morning" seq=3 — NEW "Friendship Song" (en/fr/rw) ───────
with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 3, 'sing', 10, 10, null, true)
  on conflict (category_slug, sequence) do update set active = true
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Sing Along with Nimi', 'Friendship Song',
  'Being kind to friends makes everyone happy!',
  'storyBook/song.mp3',
  '{"lyrics": ["Hello, friend,", "How are you today?", "Let''s be kind,", "All through the day!", "With a smile,", "And a warm hello,", "Nimi loves", "Me and you!"]}'::jsonb
from m
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 3, 'sing', 10, 10, null, true)
  on conflict (category_slug, sequence) do update set active = true
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'fr', 'Chante avec Nimi', 'Chanson de l''Amitié',
  'Être gentil avec ses amis rend tout le monde heureux !',
  'storyBook/song.mp3',
  '{"lyrics": ["Bonjour mon ami,", "Comment vas-tu ?", "Soyons gentils,", "Toute la journée !", "Avec un sourire,", "Et un grand bonjour,", "Nimi nous aime,", "Toi et moi !"]}'::jsonb
from m
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 3, 'sing', 10, 10, null, true)
  on conflict (category_slug, sequence) do update set active = true
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'rw', 'Ririmba na Nimi', 'Indirimbo y''Ubucuti',
  'Kuba mwiza ku ncuti bituma bose bishima!',
  'storyBook/song.mp3',
  '{"lyrics": ["Muraho mukunzi,", "Amakuru yawe none?", "Reka tube beza,", "Umunsi wose!", "Tunyeganyeze,", "Tuvuge muraho,", "Nimi yakunda", "Njye na wewe!"]}'::jsonb
from m
on conflict (mission_id, language) do update set
  title = excluded.title, subtitle = excluded.subtitle, tip_text = excluded.tip_text,
  media_url = excluded.media_url, content_json = excluded.content_json, published = true;


-- ============================================================
--  RPCS
-- ============================================================

-- ── get_daily_missions: same shape as 020; categories with >1
--    published mission now rotate "today's pick" by calendar date ──
drop function if exists get_daily_missions(uuid);

create or replace function get_daily_missions(p_child_id uuid)
returns table (
  id                 uuid,
  story_id           uuid,
  day_number         integer,
  type               text,
  title              text,
  duration_minutes   integer,
  media_url          text,
  page_start         integer,
  page_end           integer,
  category           text,
  stars              integer,
  subtitle           text,
  tip_text           text,
  content            jsonb,
  sequence           integer,
  total_in_category  integer,
  category_complete  boolean,
  completed_today    boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language        text;
  v_lang            text;
  v_cat             record;
  v_total           integer;
  v_last_seq        integer;
  v_last_completed  timestamptz;
  v_next_id         uuid;
  v_next_seq        integer;
  v_chosen_id       uuid;
  v_chosen_seq      integer;
  v_completed_today boolean;
  v_category_complete boolean;
  v_day_index       integer;
  v_done_count      integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  for v_cat in select c.slug from categories c order by c.sort_order loop

    v_lang := category_effective_language(v_cat.slug, v_language);

    select count(*) into v_total
    from missions m
    join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
    where m.category_slug = v_cat.slug and m.active;

    if v_total > 1 then
      -- ── Daily rotation pool: same "today's pick" for every child,
      --    cycling through the pool by calendar date ──
      v_day_index := (extract(epoch from current_date)::bigint / 86400) % v_total;

      select m.id, m.sequence into v_chosen_id, v_chosen_seq
      from missions m
      join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.category_slug = v_cat.slug and m.active
      order by m.sequence asc
      offset v_day_index limit 1;

      select exists (
        select 1 from child_progress cp
        where cp.child_id = p_child_id and cp.language = v_language
          and cp.mission_id = v_chosen_id and cp.completed_at::date = current_date
      ) into v_completed_today;

      select count(distinct cp.mission_id) into v_done_count
      from child_progress cp
      join missions m on m.id = cp.mission_id
      where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_cat.slug;

      v_category_complete := v_done_count >= v_total;

    else
      -- ── Single-mission category: unchanged sequential logic (019/020) ──
      select m.sequence, cp.completed_at into v_last_seq, v_last_completed
      from child_progress cp
      join missions m on m.id = cp.mission_id
      where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_cat.slug
      order by m.sequence desc
      limit 1;

      select m.id, m.sequence into v_next_id, v_next_seq
      from missions m
      join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.category_slug = v_cat.slug and m.active
        and not exists (
          select 1 from child_progress cp
          where cp.child_id = p_child_id and cp.language = v_language and cp.mission_id = m.id
        )
      order by m.sequence asc
      limit 1;

      if v_next_id is not null then
        if v_last_seq is not null and v_last_completed::date = current_date then
          select m.id into v_chosen_id from missions m
            where m.category_slug = v_cat.slug and m.sequence = v_last_seq;
          v_chosen_seq := v_last_seq;
          v_completed_today := true;
        else
          v_chosen_id := v_next_id;
          v_chosen_seq := v_next_seq;
          v_completed_today := false;
        end if;
        v_category_complete := false;
      else
        select m.id into v_chosen_id from missions m
          where m.category_slug = v_cat.slug and m.sequence = v_last_seq;
        v_chosen_seq := v_last_seq;
        v_completed_today := true;
        v_category_complete := true;
      end if;
    end if;

    if v_chosen_id is null then
      continue;
    end if;

    return query
      select
        m.id, m.story_id, v_chosen_seq as day_number, m.type,
        mv.title,
        m.duration_minutes,
        mv.media_url,
        null::integer as page_start, null::integer as page_end,
        m.category_slug as category, m.stars,
        mv.subtitle,
        mv.tip_text,
        mv.content_json as content,
        v_chosen_seq as sequence,
        v_total as total_in_category,
        v_category_complete as category_complete,
        v_completed_today as completed_today
      from missions m
      join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.id = v_chosen_id;

  end loop;
end;
$$;

grant execute on function get_daily_missions(uuid) to authenticated;


-- ── complete_mission: child_progress is now an UPSERT that refreshes
--    completed_at, so a previously-done mission re-surfaced by the
--    daily rotation can be "completed today" again. Lifetime stars are
--    only awarded the FIRST time (v_existed check replaces the old
--    on-conflict-do-nothing row-count check). Badge/cert totals
--    unchanged from 020. ──────────────────────────────────────────
drop function if exists complete_mission(uuid, uuid);

create or replace function complete_mission(p_child_id uuid, p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language     text;
  v_category     text;
  v_lang         text;
  v_stars        integer;
  v_existed      boolean;
  v_rows         integer;
  v_total        integer;
  v_done         integer;
  v_new_badges   text[] := '{}';
  v_new_cert     text;
  v_all_cats     integer;
  v_done_cats    integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  select m.category_slug, m.stars into v_category, v_stars
  from missions m where m.id = p_mission_id;

  if v_category is null then
    raise exception 'mission not found';
  end if;

  v_lang := category_effective_language(v_category, v_language);

  select exists (
    select 1 from child_progress
    where child_id = p_child_id and mission_id = p_mission_id and language = v_language
  ) into v_existed;

  insert into child_progress (child_id, mission_id, language, stars_earned, completed_at)
  values (p_child_id, p_mission_id, v_language, coalesce(v_stars, 0), now())
  on conflict (child_id, mission_id, language)
  do update set completed_at = excluded.completed_at;

  if v_existed then
    v_stars := 0; -- already completed before — no new lifetime stars for a rotation repeat
  end if;

  -- Category badge: every active mission published for this category's
  -- effective language (native, or 'en' fallback) done at least once?
  select count(*) into v_total
  from missions m
  join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
  where m.category_slug = v_category and m.active;

  select count(*) into v_done
  from child_progress cp
  join missions m on m.id = cp.mission_id
  where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_category;

  if v_total > 0 and v_done >= v_total then
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'badge', v_category || '-master-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges, v_category || '-master-' || v_language);
    end if;
  end if;

  -- Program certificate: every category that has published content in
  -- this child's language (or its English fallback) is fully complete?
  select count(*) into v_all_cats
  from categories c
  where (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  ) > 0;

  select count(*) into v_done_cats
  from categories c
  where (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  ) > 0
  and (
    select count(*) from child_progress cp2
    join missions m3 on m3.id = cp2.mission_id
    where cp2.child_id = p_child_id and cp2.language = v_language and m3.category_slug = c.slug
  ) >= (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  );

  if v_all_cats > 0 and v_done_cats >= v_all_cats then
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'certificate', 'program-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_cert := 'program-complete-' || v_language;
    end if;
  end if;

  return jsonb_build_object(
    'stars_earned', v_stars,
    'new_badges', to_jsonb(v_new_badges),
    'new_certificate', v_new_cert
  );
end;
$$;

grant execute on function complete_mission(uuid, uuid) to authenticated;

-- ============================================================
--  FILE: 022_cleanup_stray_histoire_test_mission.sql
-- ============================================================
-- ============================================================
--  NIMIPIKO — 022: Clean up stray "histoire" test mission
--
--  Migration 021 deactivated "histoire" sequence 2 ("New Mission" /
--  "Mission Artistique"), a leftover test mission created during
--  earlier admin-CMS verification (Round 21 publish-flow check). But
--  Ange's child_progress already had a completion against it (recorded
--  TODAY during that same verification), and get_daily_missions'
--  single-mission "show last completed" branch looks up the chosen
--  mission by `child_progress`'s last-completed sequence WITHOUT
--  filtering on `missions.active` — so "histoire" was still showing
--  "Mission Artistique" instead of the real "Mission Historique".
--
--  Fix: delete the stray mission outright. `mission_versions` and
--  `child_progress` both reference missions(id) on delete cascade, so
--  this also removes its versions and Ange's stray completion in one
--  go — restoring "histoire" to its single real mission (seq=1,
--  "Mission Historique", en/fr/rw).
-- ============================================================

delete from missions where category_slug = 'histoire' and sequence = 2;

-- ============================================================
--  FILE: 023_fix_morning_song_pool.sql
-- ============================================================
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

-- ============================================================
--  FILE: 024_fix_morning_song_audio.sql
-- ============================================================
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

-- ============================================================
--  FILE: 025_cleanup_morning_test_completions.sql
-- ============================================================
-- ============================================================
--  NIMIPIKO — 025: Clean up leftover "morning" test completions
--
--  While verifying the morning daily-rotation pool (migration 023),
--  all 3 morning missions were completed back-to-back via direct REST
--  calls against Ange's real account (113d8c38-a912-4739-97e9-c074feae65df)
--  purely to test the category_complete/mastery-badge mechanism. This
--  left her permanently "mastered" for the morning category (the gold
--  "🏆 Tu as maîtrisé Chanson du Matin !" banner shows on every visit),
--  which isn't representative of a real day-1 pilot state.
--
--  Remove those 3 test child_progress rows + the resulting badge.
-- ============================================================

delete from child_progress
where id in (
  '0b59801e-7748-4e67-9102-49119b6942a6', -- morning seq=1, test completion
  '02043108-34c1-46cf-a2a7-064e7793d2a8', -- morning seq=2, test completion
  'cd17bc55-b201-40bf-b6ed-14c8fd7664b3'  -- morning seq=3, test completion
);

delete from child_achievements
where id = 'bdecf114-c261-4488-86c2-2230024a2957'; -- morning-master-fr (premature)

