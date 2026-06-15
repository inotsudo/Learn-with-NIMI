-- ============================================================
--  NIMIPIKO — Initial Schema
--  Run this in Supabase SQL Editor (once, on a fresh project)
-- ============================================================


-- ── 1. PARENTS ───────────────────────────────────────────────
-- One row per parent account. id = Supabase auth.users.id
create table parents (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  created_at  timestamptz default now()
);

-- Auto-create parent row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into parents (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Parent')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── 2. CHILDREN ──────────────────────────────────────────────
-- One row per child profile. No auth — managed by parent session.
create table children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references parents(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  language    text default 'en' check (language in ('en', 'fr', 'rw')),
  age         integer check (age between 2 and 12),
  created_at  timestamptz default now()
);


-- ── 3. PARENTAL SETTINGS ─────────────────────────────────────
create table parental_settings (
  id                      uuid primary key default gen_random_uuid(),
  parent_id               uuid not null references parents(id) on delete cascade,
  child_id                uuid not null references children(id) on delete cascade,
  daily_limit_minutes     integer default 60,
  notifications_enabled   boolean default true,
  unique (parent_id, child_id)
);


-- ── 4. STORIES ───────────────────────────────────────────────
create table stories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,      -- e.g. "the-talking-faces"
  title       text not null,
  cover_url   text,
  sort_order  integer not null default 1,
  is_active   boolean default true,
  created_at  timestamptz default now()
);


-- ── 5. STORY PAGES (storybook flipbook) ──────────────────────
-- Each page = 1 illustration + 1 audio narration + optional text
create table story_pages (
  id               uuid primary key default gen_random_uuid(),
  story_id         uuid not null references stories(id) on delete cascade,
  page_number      integer not null,
  image_url        text,                 -- full illustrated page
  audio_url        text,                 -- narration audio for this page
  text             text,                 -- subtitle / dialogue shown on page
  duration_seconds integer,              -- audio length (for progress bar + auto-advance)
  unique (story_id, page_number)
);


-- ── 6. COLORING PAGES (coloriage flipbook) ───────────────────
-- Same pages as storybook but as line-drawing templates for coloring
create table coloring_pages (
  id                   uuid primary key default gen_random_uuid(),
  story_id             uuid not null references stories(id) on delete cascade,
  page_number          integer not null,
  template_image_url   text,             -- line drawing / black & white template
  unique (story_id, page_number)
);


-- ── 7. MISSIONS ──────────────────────────────────────────────
-- 4 missions per day per story
-- type: listen | color | move | sing | watch
create table missions (
  id               uuid primary key default gen_random_uuid(),
  story_id         uuid not null references stories(id) on delete cascade,
  day_number       integer not null,
  type             text not null check (type in ('listen', 'color', 'move', 'sing', 'watch')),
  title            text not null,
  duration_minutes integer default 10,
  media_url        text,                 -- video / audio URL (for move / sing / watch types)
  page_start       integer,             -- first page to cover (for listen / color types)
  page_end         integer,             -- last page to cover (for listen / color types)
  unique (story_id, day_number, type)
);


-- ── 8. CHILD PROGRESS ────────────────────────────────────────
-- One row per completed mission per child
create table child_progress (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  mission_id   uuid not null references missions(id) on delete cascade,
  completed_at timestamptz default now(),
  unique (child_id, mission_id)
);


-- ── 9. COLORING SAVES ────────────────────────────────────────
-- Saves the child's Fabric.js canvas state per coloring page
create table coloring_saves (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references children(id) on delete cascade,
  coloring_page_id  uuid not null references coloring_pages(id) on delete cascade,
  canvas_data       jsonb,               -- Fabric.js JSON state
  saved_at          timestamptz default now(),
  unique (child_id, coloring_page_id)
);


-- ── 10. CHILD BADGES ─────────────────────────────────────────
create table child_badges (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  badge_slug  text not null,            -- e.g. "story-explorer", "color-master"
  earned_at   timestamptz default now(),
  unique (child_id, badge_slug)
);


-- ============================================================
--  INDEXES
-- ============================================================
create index on children           (parent_id);
create index on story_pages        (story_id, page_number);
create index on coloring_pages     (story_id, page_number);
create index on missions           (story_id, day_number);
create index on child_progress     (child_id);
create index on child_progress     (mission_id);
create index on coloring_saves     (child_id, coloring_page_id);
create index on child_badges       (child_id);


-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table parents             enable row level security;
alter table children            enable row level security;
alter table parental_settings   enable row level security;
alter table stories             enable row level security;
alter table story_pages         enable row level security;
alter table coloring_pages      enable row level security;
alter table missions            enable row level security;
alter table child_progress      enable row level security;
alter table coloring_saves      enable row level security;
alter table child_badges        enable row level security;


-- Helper: confirm a child belongs to the authenticated parent
create or replace function is_my_child(p_child_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from children
    where id = p_child_id
      and parent_id = auth.uid()
  );
$$;


-- ── parents ──
create policy "parent: select own"  on parents for select using (id = auth.uid());
create policy "parent: insert own"  on parents for insert with check (id = auth.uid());
create policy "parent: update own"  on parents for update using (id = auth.uid());

-- ── children ──
create policy "parent: select children"  on children for select  using (parent_id = auth.uid());
create policy "parent: insert children"  on children for insert  with check (parent_id = auth.uid());
create policy "parent: update children"  on children for update  using (parent_id = auth.uid());
create policy "parent: delete children"  on children for delete  using (parent_id = auth.uid());

-- ── parental_settings ──
create policy "parent: manage settings"  on parental_settings for all using (parent_id = auth.uid());

-- ── content tables — read-only for all authenticated users ──
create policy "auth: read stories"          on stories         for select using (auth.uid() is not null);
create policy "auth: read story_pages"      on story_pages     for select using (auth.uid() is not null);
create policy "auth: read coloring_pages"   on coloring_pages  for select using (auth.uid() is not null);
create policy "auth: read missions"         on missions        for select using (auth.uid() is not null);

-- ── child_progress ──
create policy "parent: select progress"  on child_progress for select using (is_my_child(child_id));
create policy "parent: insert progress"  on child_progress for insert with check (is_my_child(child_id));

-- ── coloring_saves ──
create policy "parent: select saves"  on coloring_saves for select using (is_my_child(child_id));
create policy "parent: insert saves"  on coloring_saves for insert with check (is_my_child(child_id));
create policy "parent: update saves"  on coloring_saves for update using (is_my_child(child_id));

-- ── child_badges ──
create policy "parent: select badges"  on child_badges for select using (is_my_child(child_id));
create policy "parent: insert badges"  on child_badges for insert with check (is_my_child(child_id));


-- ============================================================
--  SEED: First story — The Talking Faces
-- ============================================================
insert into stories (slug, title, sort_order, is_active)
values ('the-talking-faces', 'The Talking Faces', 1, true);
