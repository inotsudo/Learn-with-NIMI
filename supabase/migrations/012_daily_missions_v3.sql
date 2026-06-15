-- ============================================================
--  NIMIPIKO — 012: Per-Language Daily Missions Architecture
--
--  Replaces the day_number/category "missions" model with:
--    categories (static, 8 rows)
--      └─ missions        (language-independent shell: category_slug, sequence)
--           └─ mission_versions  (per-language title/subtitle/tip/media/content)
--    story_pages
--      └─ story_page_versions (per-language narration text/audio)
--    child_progress  (+language, +stars_earned — partitions progress per
--                      language so switching language starts a fresh,
--                      separately-rewardable journey)
--    child_achievements (badges + certificates, per language)
--
--  Live missions/stories tables are empty (pending seed migrations
--  002/003/006-010 never applied), so this migration resets the small
--  progress/badge tables (QA test data only) and seeds the 8 daily
--  missions fresh — no data backfill needed.
--
--  NOT RUN YET — written for review only.
-- ============================================================

-- ── 0. Reset progress/badges + missions (clean slate) ────────
truncate table child_progress, child_badges, missions cascade;


-- ── 1. CATEGORIES (static, 8 rows) ────────────────────────────
create table if not exists categories (
  slug         text primary key,
  sort_order   integer not null unique,
  default_type text not null
);

alter table categories enable row level security;
drop policy if exists "auth: read categories" on categories;
create policy "auth: read categories" on categories for select using (auth.uid() is not null);

insert into categories (slug, sort_order, default_type) values
  ('morning',   1, 'sing'),
  ('movement',  2, 'move'),
  ('artistic',  3, 'color'),
  ('histoire',  4, 'watch'),
  ('zoom',      5, 'watch'),
  ('discovery', 6, 'read'),
  ('flipflop',  7, 'story'),
  ('coloring',  8, 'color')
on conflict (slug) do nothing;


-- ── 2. STORIES — ensure "the-talking-faces" + theme columns ──
alter table stories add column if not exists theme_title text;
alter table stories add column if not exists theme_emoji text;

insert into stories (slug, title, sort_order, is_active, theme_title, theme_emoji)
values ('the-talking-faces', 'The Talking Faces', 1, true, 'The Lion King of Rwanda', '🦁')
on conflict (slug) do update
  set theme_title = coalesce(stories.theme_title, excluded.theme_title),
      theme_emoji = coalesce(stories.theme_emoji, excluded.theme_emoji);


-- ── 3. MISSIONS — restructure to category_slug/sequence shells ─
alter table missions add column if not exists category_slug text;
alter table missions add column if not exists sequence integer;
alter table missions add column if not exists active boolean not null default true;
alter table missions add column if not exists stars integer default 10;
alter table missions add column if not exists created_at timestamptz default now();
alter table missions alter column story_id drop not null;

-- Drop columns now superseded by mission_versions / category_slug+sequence
alter table missions drop column if exists day_number;
alter table missions drop column if exists title;
alter table missions drop column if exists subtitle;
alter table missions drop column if exists tip_text;
alter table missions drop column if exists media_url;
alter table missions drop column if exists content;
alter table missions drop column if exists category;
alter table missions drop column if exists page_start;
alter table missions drop column if exists page_end;

-- Drop old constraints from 001/007/008/009/010
alter table missions drop constraint if exists missions_story_id_day_number_type_key;
alter table missions drop constraint if exists missions_type_check;
alter table missions drop constraint if exists missions_category_check;

alter table missions add constraint missions_category_slug_fkey
  foreign key (category_slug) references categories(slug);
alter table missions alter column category_slug set not null;
alter table missions alter column sequence set not null;
alter table missions add constraint missions_category_slug_sequence_key unique (category_slug, sequence);
alter table missions add constraint missions_type_check
  check (type in ('sing','move','color','watch','read','story'));


-- ── 4. MISSION_VERSIONS — per-language content ────────────────
create table if not exists mission_versions (
  id          uuid primary key default gen_random_uuid(),
  mission_id  uuid not null references missions(id) on delete cascade,
  language    text not null check (language in ('en','fr','rw')),
  title       text not null,
  subtitle    text,
  tip_text    text,
  media_url   text,
  content_json jsonb not null default '{}'::jsonb,
  published   boolean not null default true,
  unique (mission_id, language)
);

alter table mission_versions enable row level security;
drop policy if exists "auth: read mission_versions" on mission_versions;
create policy "auth: read mission_versions" on mission_versions for select using (auth.uid() is not null);


-- ── 5. Seed the 8 daily missions (sequence 1) + English content ─

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('morning', 1, 'sing', 10, 10, null, true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Sing Along with Nimi', 'Morning Song',
  'Singing every morning helps you remember new words!',
  'storyBook/song.mp3',
  '{"lyrics": [
     "Good morning, sunshine,",
     "Good morning, world!",
     "Wake up, Nimi,",
     "Wake up, Piko too!",
     "It''s a brand new day,",
     "Let''s sing and play!"
  ]}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('movement', 1, 'move', 10, 10, null, true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Move & Groove', 'Dance with Nimi',
  'Moving your body helps your brain grow strong!',
  'storyBook/move-groove-web.mp4',
  '{"prompts": [
     {"emoji": "👏", "label": "CLAP your hands!"},
     {"emoji": "🦵", "label": "JUMP up high!"},
     {"emoji": "🤗", "label": "GIVE a big hug!"},
     {"emoji": "🌀", "label": "SPIN around!"}
  ]}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('artistic', 1, 'color', 15, 15, (select id from stories where slug = 'the-talking-faces'), true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Little Creators', 'Bring the story to life with colors!',
  'Use your favorite colors to make the story shine!',
  null, '{}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('histoire', 1, 'watch', 15, 15, null, true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Mission Historique', 'Discover the story of Rwanda',
  'History helps us understand where we come from!',
  'storyBook/journey-web.mp4', '{}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('zoom', 1, 'watch', 15, 15, null, true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Mission Zoom', 'Look closer at the world around you',
  'Zoom in close — what new details can you find?',
  'storyBook/journey-web.mp4', '{}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('discovery', 1, 'read', 10, 15, null, true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Shiny Readers', 'Read together with your family!',
  'Reading every day makes you smarter and stronger!',
  'storyBook/story-web.pdf', '{}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('flipflop', 1, 'story', 10, 10, (select id from stories where slug = 'the-talking-faces'), true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Magic Stories with Nimi', 'Open your FlipFlop storybook',
  'Every story has a magic lesson hidden inside!',
  null, '{}'::jsonb
from m;

with m as (
  insert into missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  values ('coloring', 1, 'color', 10, 10, (select id from stories where slug = 'the-talking-faces'), true)
  returning id
)
insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json)
select id, 'en', 'Color Your Story', 'Color the characters from today''s story',
  'There''s no wrong way to color — be creative!',
  null, '{}'::jsonb
from m;


-- ── 6. STORY_PAGE_VERSIONS — per-language narration ───────────
create table if not exists story_page_versions (
  id            uuid primary key default gen_random_uuid(),
  story_page_id uuid not null references story_pages(id) on delete cascade,
  language      text not null check (language in ('en','fr','rw')),
  text          text,
  audio_url     text,
  published     boolean not null default true,
  unique (story_page_id, language)
);

alter table story_page_versions enable row level security;
drop policy if exists "auth: read story_page_versions" on story_page_versions;
create policy "auth: read story_page_versions" on story_page_versions for select using (auth.uid() is not null);

-- Existing per-page audio becomes the 'en' version (no-op if story_pages empty)
insert into story_page_versions (story_page_id, language, text, audio_url, published)
select id, 'en', null, audio_url, true from story_pages
on conflict (story_page_id, language) do nothing;

alter table story_pages drop column if exists audio_url;


-- ── 7. CHILD_PROGRESS — +language, +stars_earned ──────────────
alter table child_progress add column if not exists language text not null default 'en'
  check (language in ('en','fr','rw'));
alter table child_progress add column if not exists stars_earned integer not null default 0;

alter table child_progress drop constraint if exists child_progress_child_id_mission_id_key;
alter table child_progress add constraint child_progress_child_mission_language_key
  unique (child_id, mission_id, language);


-- ── 8. CHILD_ACHIEVEMENTS — badges + certificates, per language ─
create table if not exists child_achievements (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  language   text not null check (language in ('en','fr','rw')),
  type       text not null check (type in ('badge','certificate')),
  slug       text not null,
  earned_at  timestamptz default now(),
  unique (child_id, language, type, slug)
);

create index on child_achievements (child_id);

alter table child_achievements enable row level security;
drop policy if exists "parent: select achievements" on child_achievements;
drop policy if exists "parent: insert achievements" on child_achievements;
create policy "parent: select achievements" on child_achievements for select using (is_my_child(child_id));
create policy "parent: insert achievements" on child_achievements for insert with check (is_my_child(child_id));


-- ============================================================
--  RPCS
-- ============================================================

-- ── get_daily_missions: one row per category, fully resolved ──
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
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  for v_cat in select c.slug from categories c order by c.sort_order loop

    select count(*) into v_total from missions m where m.category_slug = v_cat.slug and m.active;

    select m.sequence, cp.completed_at into v_last_seq, v_last_completed
    from child_progress cp
    join missions m on m.id = cp.mission_id
    where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_cat.slug
    order by m.sequence desc
    limit 1;

    select m.id, m.sequence into v_next_id, v_next_seq
    from missions m
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

    return query
      select
        m.id, m.story_id, v_chosen_seq as day_number, m.type,
        coalesce(mv.title, mv_en.title) as title,
        m.duration_minutes,
        coalesce(mv.media_url, mv_en.media_url) as media_url,
        null::integer as page_start, null::integer as page_end,
        m.category_slug as category, m.stars,
        coalesce(mv.subtitle, mv_en.subtitle) as subtitle,
        coalesce(mv.tip_text, mv_en.tip_text) as tip_text,
        coalesce(mv.content_json, mv_en.content_json) as content,
        v_chosen_seq as sequence,
        v_total as total_in_category,
        v_category_complete as category_complete,
        v_completed_today as completed_today
      from missions m
      left join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_language and mv.published
      left join mission_versions mv_en
        on mv_en.mission_id = m.id and mv_en.language = 'en' and mv_en.published
      where m.id = v_chosen_id;

  end loop;
end;
$$;

grant execute on function get_daily_missions(uuid) to authenticated;


-- ── complete_mission: record progress, award badges/certificate ─
drop function if exists complete_mission(uuid, uuid);

create or replace function complete_mission(p_child_id uuid, p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language     text;
  v_category     text;
  v_stars        integer;
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

  insert into child_progress (child_id, mission_id, language, stars_earned, completed_at)
  values (p_child_id, p_mission_id, v_language, coalesce(v_stars, 0), now())
  on conflict (child_id, mission_id, language) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    v_stars := 0; -- already completed previously — no new stars
  end if;

  -- Category badge: every active mission in this category done?
  select count(*) into v_total from missions m where m.category_slug = v_category and m.active;
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

  -- Program certificate: every category complete for this child+language?
  select count(*) into v_all_cats from categories;
  select count(*) into v_done_cats
  from categories c
  where (
    select count(*) from missions m2 where m2.category_slug = c.slug and m2.active
  ) > 0
  and (
    select count(*) from child_progress cp2
    join missions m3 on m3.id = cp2.mission_id
    where cp2.child_id = p_child_id and cp2.language = v_language and m3.category_slug = c.slug
  ) >= (
    select count(*) from missions m2 where m2.category_slug = c.slug and m2.active
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
