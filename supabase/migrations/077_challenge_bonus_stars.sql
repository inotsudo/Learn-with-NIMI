-- Migration 077: challenge_bonus_stars
-- Tracks star rewards claimed from the weekly/daily challenges hub.
-- Included in getTotalStars so the shop balance reflects them.

create table if not exists challenge_bonus_stars (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references children(id) on delete cascade,
  language       text not null check (language in ('en','fr','rw')),
  challenge_slug text not null,   -- e.g. 'weekly-streak3-2026-07-07'
  stars          int  not null check (stars > 0),
  claimed_at     timestamptz default now(),
  unique (child_id, language, challenge_slug)
);

create index on challenge_bonus_stars (child_id, language);

alter table challenge_bonus_stars enable row level security;
create policy "parent: manage challenge stars" on challenge_bonus_stars
  for all using (is_my_child(child_id)) with check (is_my_child(child_id));
