-- 072_story_feelings.sql
-- Stores a child's emotional reaction after completing a story (certificate phase).
-- One row per (child, story, language) — upserted on re-visit.

create table story_feelings (
  id         uuid        primary key default gen_random_uuid(),
  child_id   uuid        not null references children(id) on delete cascade,
  story_id   uuid        not null references stories(id)  on delete cascade,
  language   text        not null check (language in ('en', 'fr', 'rw')),
  feeling    text        not null,
  felt_at    timestamptz not null default now(),
  unique (child_id, story_id, language)
);

create index on story_feelings (child_id);

alter table story_feelings enable row level security;

-- Parents can read their children's feelings
create policy "parent: select story_feelings"
  on story_feelings for select
  using (is_my_child(child_id));

-- Authenticated users (the child's session) can upsert their own feeling
create policy "auth: upsert story_feelings"
  on story_feelings for all
  using  (auth.uid() is not null)
  with check (auth.uid() is not null);
