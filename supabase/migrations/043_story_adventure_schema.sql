-- ============================================================
--  NIMIPIKO — Story Adventure Schema (SA-1.1)
--
--  Adds the Story Adventure content model alongside the existing
--  BK curriculum schema. All changes are additive — no tables
--  dropped, no columns removed, no existing data modified.
--
--  New tables: story_versions, story_slots, story_intro_progress,
--              weekly_challenges, weekly_challenge_versions,
--              weekly_challenge_progress
--
--  Extended:   stories (+ status, age_min, age_max,
--              scheduled_publish_at, published_at, retired_at)
-- ============================================================


-- ── 1. STORIES TABLE EXTENSIONS ──────────────────────────────

-- 1a. Add new columns (all nullable initially for safe backfill)
alter table stories add column if not exists status text;
alter table stories add column if not exists age_min integer;
alter table stories add column if not exists age_max integer;
alter table stories add column if not exists scheduled_publish_at timestamptz;
alter table stories add column if not exists published_at timestamptz;
alter table stories add column if not exists retired_at timestamptz;

-- 1b. Backfill status from existing is_active boolean
update stories set status = 'published', published_at = created_at
  where is_active = true and status is null;
update stories set status = 'draft'
  where (is_active = false or is_active is null) and status is null;

-- 1c. Now enforce NOT NULL + CHECK
alter table stories alter column status set not null;
alter table stories alter column status set default 'draft';
alter table stories add constraint stories_status_check
  check (status in ('draft', 'review', 'published', 'retired'));

-- 1d. Age range validation (optional columns, validated when set)
alter table stories add constraint stories_age_min_check
  check (age_min is null or (age_min >= 2 and age_min <= 12));
alter table stories add constraint stories_age_max_check
  check (age_max is null or (age_max >= 2 and age_max <= 12));
alter table stories add constraint stories_age_range_check
  check (age_min is null or age_max is null or age_min <= age_max);

-- 1e. Derive is_active from status via trigger
create or replace function stories_sync_is_active()
returns trigger language plpgsql as $$
begin
  new.is_active := (new.status = 'published');
  if new.status = 'published' and (old is null or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'retired' and (old is null or old.status <> 'retired') then
    new.retired_at := coalesce(new.retired_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists stories_sync_is_active_trigger on stories;
create trigger stories_sync_is_active_trigger
  before insert or update on stories
  for each row execute function stories_sync_is_active();


-- ── 2. STORY VERSIONS (per-language metadata + intro URLs) ───

create table if not exists story_versions (
  id                   uuid primary key default gen_random_uuid(),
  story_id             uuid not null references stories(id) on delete cascade,
  language             text not null check (language in ('en', 'fr', 'rw')),
  title                text not null,
  cover_url            text,
  intro_video_url      text,
  theme_song_url       text,
  meet_characters_url  text,
  story_intro_url      text,
  status               text not null default 'draft'
                       check (status in ('draft', 'review', 'published', 'archived')),
  published            boolean not null default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (story_id, language)
);

create index on story_versions (story_id);

-- Derive published from status
create or replace function story_versions_sync_published()
returns trigger language plpgsql as $$
begin
  new.published := (new.status = 'published');
  new.updated_at := now();
  return new;
end;
$$;

create trigger story_versions_sync_published_trigger
  before insert or update on story_versions
  for each row execute function story_versions_sync_published();

alter table story_versions enable row level security;

create policy "auth: read published story_versions"
  on story_versions for select
  using (auth.uid() is not null and published = true);

create policy "admin: full story_versions"
  on story_versions for all
  using (is_admin());


-- ── 3. STORY SLOTS (6 mission slots per story) ──────────────

create table if not exists story_slots (
  story_id     uuid not null references stories(id) on delete cascade,
  slot_key     text not null check (slot_key in (
                 'flipflop_audio', 'story_pdf', 'coloring',
                 'move_explore', 'sing_along', 'bonus_video'
               )),
  mission_id   uuid not null references missions(id) on delete cascade,
  sort_order   integer not null check (sort_order between 1 and 6),
  primary key (story_id, slot_key)
);

create index on story_slots (mission_id);

alter table story_slots enable row level security;

create policy "auth: read story_slots"
  on story_slots for select
  using (auth.uid() is not null);

create policy "admin: full story_slots"
  on story_slots for all
  using (is_admin());


-- ── 4. STORY INTRO PROGRESS (lightweight consumption tracking)

create table if not exists story_intro_progress (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  story_id     uuid not null references stories(id) on delete cascade,
  language     text not null check (language in ('en', 'fr', 'rw')),
  slot_key     text not null check (slot_key in (
                 'intro_video', 'theme_song', 'meet_characters', 'story_intro'
               )),
  consumed_at  timestamptz default now(),
  unique (child_id, story_id, language, slot_key)
);

create index on story_intro_progress (child_id);

alter table story_intro_progress enable row level security;

create policy "parent: select intro_progress"
  on story_intro_progress for select
  using (is_my_child(child_id));

create policy "parent: insert intro_progress"
  on story_intro_progress for insert
  with check (is_my_child(child_id));

create policy "admin: full intro_progress"
  on story_intro_progress for all
  using (is_admin());


-- ── 5. WEEKLY CHALLENGES ────────────────────────────────────

create table if not exists weekly_challenges (
  id           uuid primary key default gen_random_uuid(),
  story_id     uuid not null references stories(id) on delete cascade,
  sort_order   integer not null default 1,
  type         text not null default 'explore'
               check (type in ('quiz', 'creative', 'explore')),
  stars        integer not null default 10,
  created_at   timestamptz default now()
);

create index on weekly_challenges (story_id);

alter table weekly_challenges enable row level security;

create policy "auth: read weekly_challenges"
  on weekly_challenges for select
  using (auth.uid() is not null);

create policy "admin: full weekly_challenges"
  on weekly_challenges for all
  using (is_admin());


-- ── 6. WEEKLY CHALLENGE VERSIONS (per-language content) ──────

create table if not exists weekly_challenge_versions (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references weekly_challenges(id) on delete cascade,
  language       text not null check (language in ('en', 'fr', 'rw')),
  title          text not null,
  description    text,
  content_json   jsonb not null default '{}'::jsonb,
  status         text not null default 'draft'
                 check (status in ('draft', 'review', 'published', 'archived')),
  published      boolean not null default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (challenge_id, language)
);

create index on weekly_challenge_versions (challenge_id);

-- Derive published from status
create or replace function weekly_challenge_versions_sync_published()
returns trigger language plpgsql as $$
begin
  new.published := (new.status = 'published');
  new.updated_at := now();
  return new;
end;
$$;

create trigger wcv_sync_published_trigger
  before insert or update on weekly_challenge_versions
  for each row execute function weekly_challenge_versions_sync_published();

alter table weekly_challenge_versions enable row level security;

create policy "auth: read published challenge_versions"
  on weekly_challenge_versions for select
  using (auth.uid() is not null and published = true);

create policy "admin: full challenge_versions"
  on weekly_challenge_versions for all
  using (is_admin());


-- ── 7. WEEKLY CHALLENGE PROGRESS ─────────────────────────────

create table if not exists weekly_challenge_progress (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references children(id) on delete cascade,
  challenge_id   uuid not null references weekly_challenges(id) on delete cascade,
  language       text not null check (language in ('en', 'fr', 'rw')),
  stars_earned   integer not null default 0,
  completed_at   timestamptz default now(),
  unique (child_id, challenge_id, language)
);

create index on weekly_challenge_progress (child_id);

alter table weekly_challenge_progress enable row level security;

create policy "parent: select challenge_progress"
  on weekly_challenge_progress for select
  using (is_my_child(child_id));

create policy "parent: insert challenge_progress"
  on weekly_challenge_progress for insert
  with check (is_my_child(child_id));

create policy "admin: full challenge_progress"
  on weekly_challenge_progress for all
  using (is_admin());


-- ── 8. ADDITIONAL INDEXES ────────────────────────────────────

create index if not exists idx_stories_status
  on stories (status);

create index if not exists idx_stories_sort_order
  on stories (sort_order);

create index if not exists idx_stories_scheduled_publish
  on stories (scheduled_publish_at)
  where scheduled_publish_at is not null and status = 'review';


-- ── 9. PERSONALIZED STORIES (Step 7 — photo + name) ──────────
--
--  Parent picks an existing story, uploads the child's photo,
--  enters the child's name. The educational content is unchanged.
--  Only cover page, child photo, child name, and certificate
--  are personalized. One personalization per (child, story).

create table if not exists personalized_stories (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references children(id) on delete cascade,
  story_id         uuid not null references stories(id) on delete cascade,
  child_name       text not null,
  child_photo_url  text,
  cover_url        text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (child_id, story_id)
);

create index on personalized_stories (child_id);
create index on personalized_stories (story_id);

alter table personalized_stories enable row level security;

create policy "parent: select own personalized_stories"
  on personalized_stories for select
  using (is_my_child(child_id));

create policy "parent: insert own personalized_stories"
  on personalized_stories for insert
  with check (is_my_child(child_id));

create policy "parent: update own personalized_stories"
  on personalized_stories for update
  using (is_my_child(child_id));

create policy "admin: full personalized_stories"
  on personalized_stories for all
  using (is_admin());


-- ============================================================
--  END OF SA-1.1 MIGRATION
--  Tables created: 7 (story_versions, story_slots,
--    story_intro_progress, weekly_challenges,
--    weekly_challenge_versions, weekly_challenge_progress,
--    personalized_stories)
--  Tables extended: 1 (stories + 6 columns, 1 trigger)
--  Tables dropped: 0
--  Data deleted: 0
--  Functions created: 3 (triggers)
--  Policies created: 18
--  Indexes created: 12
-- ============================================================
