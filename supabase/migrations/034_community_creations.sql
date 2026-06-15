-- ============================================================
--  NIMIPIKO — Community Gallery (creations + likes)
--  Backs the /community page: parents share a child's artwork /
--  coloring / story creations, other families can like them.
--  Mirrors the rest of the schema's ownership model via RLS.
-- ============================================================

create table if not exists creations (
  id                uuid primary key default gen_random_uuid(),
  parent_id         uuid not null references parents(id) on delete cascade,
  child_id          uuid references children(id) on delete set null,
  child_name        text not null,
  age               integer,
  description       text,
  image_url         text not null,
  type              text not null default 'art' check (type in ('art', 'coloring', 'story')),
  is_public         boolean not null default true,
  completion_status text not null default 'completed' check (completion_status in ('draft', 'in-progress', 'completed')),
  created_at        timestamptz default now()
);

create table if not exists likes (
  id           uuid primary key default gen_random_uuid(),
  creation_id  uuid not null references creations(id) on delete cascade,
  user_id      uuid not null references parents(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (creation_id, user_id)
);

create index if not exists creations_parent_id_idx on creations (parent_id);
create index if not exists creations_child_id_idx on creations (child_id);
create index if not exists creations_public_created_idx on creations (is_public, created_at desc);
create index if not exists likes_creation_id_idx on likes (creation_id);
create index if not exists likes_user_id_idx on likes (user_id);

alter table creations enable row level security;
alter table likes     enable row level security;

-- ── creations ──
create policy "auth: select public or own creations" on creations
  for select using (is_public = true or parent_id = auth.uid());

create policy "parent: insert own creations" on creations
  for insert with check (
    parent_id = auth.uid()
    and (child_id is null or is_my_child(child_id))
  );

create policy "parent: delete own creations" on creations
  for delete using (parent_id = auth.uid());

-- ── likes ──
-- Counts/likedByUser are computed across all users, so any
-- authenticated user can read all like rows (like/unlike pairs
-- carry no sensitive info, same exposure as stories/missions).
create policy "auth: read likes" on likes
  for select using (auth.uid() is not null);

create policy "auth: insert own likes" on likes
  for insert with check (user_id = auth.uid());

create policy "auth: delete own likes" on likes
  for delete using (user_id = auth.uid());

-- ============================================================
--  STORAGE — "creations" bucket for uploaded artwork
-- ============================================================
insert into storage.buckets (id, name, public)
values ('creations', 'creations', true)
on conflict (id) do update set public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read creations'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Public read creations"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'creations')
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth upload creations'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth upload creations"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'creations' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth update creations'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth update creations"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'creations' AND auth.uid() IS NOT NULL)
        WITH CHECK (bucket_id = 'creations' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth delete creations'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth delete creations"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'creations' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;
