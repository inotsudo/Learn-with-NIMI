-- ══════════════════════════════════════════════════════════════
--  071 — Certificate Templates
--  Global per-language certificate image + name position config.
--  API priority: story-specific → global template → congz.jpeg
-- ══════════════════════════════════════════════════════════════

create table if not exists certificate_templates (
  lang        text primary key check (lang in ('en', 'fr', 'rw')),
  image_url   text,
  name_x      integer      not null default 438,
  name_y      integer      not null default 1089,
  name_size   integer      not null default 50,
  name_color  text         not null default '#0d1b4b',
  updated_at  timestamptz           default now()
);

-- Seed EN row so the API always finds a row for English
-- (image_url stays null → falls back to congz.jpeg until boss uploads)
insert into certificate_templates (lang) values ('en'), ('fr'), ('rw')
  on conflict (lang) do nothing;

-- RLS — admins only
alter table certificate_templates enable row level security;

create policy "cert_templates_admins_all"
  on certificate_templates for all
  using  (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));

-- Storage bucket for uploaded certificate JPEGs
insert into storage.buckets (id, name, public)
  values ('certificates', 'certificates', true)
  on conflict (id) do nothing;

create policy "cert_bucket_admins_upload"
  on storage.objects for insert
  with check (bucket_id = 'certificates' and exists (select 1 from admins where id = auth.uid()));

create policy "cert_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'certificates');
