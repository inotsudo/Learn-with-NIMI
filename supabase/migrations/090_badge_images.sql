-- migration 090: badge_images table + badges storage bucket
--
-- badge_images stores the remote image URL for each badge slug.
-- The badges storage bucket holds the uploaded image files.
-- Admins upload via the admin portal; BadgeCircle reads from this table.

-- 1. badge_images table
create table badge_images (
  slug        text primary key,
  image_url   text,
  label       text,
  updated_at  timestamptz default now()
);

alter table badge_images enable row level security;

-- Anyone authenticated can read (learner profile + story page need URLs)
create policy "authenticated read"
  on badge_images for select
  using (auth.role() = 'authenticated');

-- Only admins can write
create policy "admin insert"
  on badge_images for insert
  with check (exists (select 1 from admins where id = auth.uid()));

create policy "admin update"
  on badge_images for update
  using (exists (select 1 from admins where id = auth.uid()));

create policy "admin delete"
  on badge_images for delete
  using (exists (select 1 from admins where id = auth.uid()));

-- 2. badges storage bucket (public — images are served directly)
insert into storage.buckets (id, name, public)
values ('badges', 'badges', true)
on conflict (id) do nothing;

create policy "public read badges"
  on storage.objects for select
  using (bucket_id = 'badges');

create policy "admin upload badges"
  on storage.objects for insert
  with check (
    bucket_id = 'badges'
    and exists (select 1 from admins where id = auth.uid())
  );

create policy "admin delete badges"
  on storage.objects for delete
  using (
    bucket_id = 'badges'
    and exists (select 1 from admins where id = auth.uid())
  );

-- 3. Seed the 2 existing local badges so they're immediately managed via admin
-- (image_url is empty; admin will upload the actual files via the portal)
insert into badge_images (slug, label) values
  ('emotion-detective-en', 'Emotion Detective (EN)'),
  ('emotion-detective-fr', 'Emotion Detective (FR)')
on conflict (slug) do nothing;
