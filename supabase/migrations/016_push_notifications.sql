-- ============================================================
--  NIMIPIKO — Parent Web Push Notifications
--  Adds a `push_subscriptions` table (one row per browser
--  subscription, owned by the parent) plus a security-definer
--  RPC `get_push_reminder_targets()` used by the daily-reminder
--  cron to find parents whose children haven't done today's
--  mission yet, without needing a service-role key.
-- ============================================================


-- ── 1. PUSH SUBSCRIPTIONS ────────────────────────────────────
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references parents(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "parent: manage own push subscriptions" on push_subscriptions;
drop policy if exists "admin: full access" on push_subscriptions;

create policy "parent: manage own push subscriptions" on push_subscriptions
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

create policy "admin: full access" on push_subscriptions
  for all using (is_admin()) with check (is_admin());


-- ── 2. get_push_reminder_targets() ───────────────────────────
-- security definer: lets the daily-reminder cron (anon client,
-- no parent session) find children with a push subscription who
-- haven't completed a mission today and haven't opted out.
create or replace function get_push_reminder_targets()
returns table(parent_id uuid, child_id uuid, child_name text, language text)
language sql security definer as $$
  select distinct c.parent_id, c.id, c.name, c.language
  from children c
  join push_subscriptions ps on ps.parent_id = c.parent_id
  left join parental_settings pset
    on pset.parent_id = c.parent_id and pset.child_id = c.id
  where coalesce(pset.notifications_enabled, true) = true
    and not exists (
      select 1 from child_progress cp
      where cp.child_id = c.id
        and cp.completed_at::date = (now() at time zone 'utc')::date
    );
$$;

grant execute on function get_push_reminder_targets() to anon, authenticated;
