-- 094: Add unsubscribe token and timestamp to newsletter_signups
-- Enables token-based one-click unsubscribe (GDPR compliance)

alter table newsletter_signups
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at   timestamptz;

-- Unique index so token lookups are fast and tokens can't collide
create unique index if not exists newsletter_signups_token_idx
  on newsletter_signups (unsubscribe_token);

-- Service role can update (to mark unsubscribed)
create policy "service_update" on newsletter_signups
  for update using (true) with check (true);
