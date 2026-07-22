-- migration 145 — story_knowledge_cache
-- Persistent cache for AI-extracted educational metadata (characters, concepts,
-- themes, moral lesson) per (story_id, language).
-- Re-analysis is skipped while pages_fingerprint matches AND analyzed_at < 7 days.

create table if not exists story_knowledge_cache (
  story_id          uuid        not null references stories(id) on delete cascade,
  language          text        not null check (language in ('en', 'fr', 'rw')),
  analysis          jsonb       not null default '{}',
  analyzed_at       timestamptz not null default now(),
  pages_fingerprint text        not null default '',
  primary key (story_id, language)
);

alter table story_knowledge_cache enable row level security;

-- Published story metadata is non-sensitive — any authenticated user can read.
create policy "Authenticated can read story knowledge cache"
  on story_knowledge_cache for select
  to authenticated
  using (true);

-- Server-side AI routes write via the user's auth session (Edge functions use
-- the user JWT, so write access must be granted to the authenticated role).
create policy "Authenticated can insert story knowledge cache"
  on story_knowledge_cache for insert
  to authenticated
  with check (true);

create policy "Authenticated can update story knowledge cache"
  on story_knowledge_cache for update
  to authenticated
  using (true)
  with check (true);
