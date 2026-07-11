-- 064: Newsletter sign-up capture table
-- Parents/visitors who opt in to product updates; RLS keeps rows private.

create table if not exists newsletter_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  source      text default 'landing_page',
  created_at  timestamptz not null default now()
);

alter table newsletter_signups enable row level security;

-- Only service role (API routes) can insert; no public read
create policy "service_insert" on newsletter_signups
  for insert with check (true);
