-- Testimonials: parent reviews shown on the marketing page
-- Admins add/approve via the admin panel; only approved rows are public.

create table public.testimonials (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  role        text        not null,      -- e.g. "Mom of a 6-year-old"
  location    text,                      -- e.g. "Kigali, Rwanda"
  quote       text        not null,
  rating      smallint    not null default 5 check (rating between 1 and 5),
  avatar_url  text,                      -- Supabase storage URL (optional)
  approved    boolean     not null default false,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create policy "Public read approved testimonials"
  on public.testimonials for select
  to anon, authenticated
  using (approved = true);

create policy "Admins full access on testimonials"
  on public.testimonials for all
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));
