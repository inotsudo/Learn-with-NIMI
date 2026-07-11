-- ============================================================
--  NIMIPIKO — Creation Comments
--  Replaces the in-memory global.comments store that resets
--  on every serverless cold-start.
-- ============================================================

create table if not exists creation_comments (
  id           uuid primary key default gen_random_uuid(),
  creation_id  uuid not null references creations(id) on delete cascade,
  author       text not null default 'Friend',
  content      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists creation_comments_creation_id_idx
  on creation_comments (creation_id, created_at desc);

alter table creation_comments enable row level security;

-- Anyone authenticated can read comments on public creations
create policy "auth: read comments" on creation_comments
  for select using (
    exists (
      select 1 from creations c
      where c.id = creation_comments.creation_id
        and c.is_public = true
    )
    or auth.uid() is not null
  );

-- Any authenticated user can post a comment
create policy "auth: insert comment" on creation_comments
  for insert with check (auth.uid() is not null);

-- Only admins can delete (handled via service role in moderation)
