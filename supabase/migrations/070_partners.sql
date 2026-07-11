-- Partners & endorsers shown on the marketing page
-- Admins manage via the admin panel; only active rows are public.

create table public.partners (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  logo_url    text        not null,
  website_url text,
  category    text        not null default 'partner',  -- partner | education | media | award
  active      boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.partners enable row level security;

create policy "Public read active partners"
  on public.partners for select
  to anon, authenticated
  using (active = true);

create policy "Admins full access on partners"
  on public.partners for all
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- Seed the two real payment partners we already have logos for
insert into public.partners (name, logo_url, category, sort_order) values
  ('MTN Mobile Money',  '/mtn-logo.png',    'partner', 1),
  ('Airtel Money',      '/airtel-logo.jpeg', 'partner', 2);
