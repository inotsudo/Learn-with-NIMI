-- ============================================================
--  NIMIPIKO — Admin Notifications (Round 17)
--  Adds `push_broadcasts`, an audit log of admin-sent push
--  announcements (to one parent or all subscribed parents).
-- ============================================================

create table if not exists push_broadcasts (
  id                 uuid primary key default gen_random_uuid(),
  sent_by            uuid references admins(id) on delete set null,
  title              text not null,
  body               text not null,
  url                text,
  target_parent_id   uuid references parents(id) on delete set null,
  recipient_parents  integer not null default 0,
  recipient_devices  integer not null default 0,
  created_at         timestamptz default now()
);

alter table push_broadcasts enable row level security;

drop policy if exists "admin: full access" on push_broadcasts;
create policy "admin: full access" on push_broadcasts
  for all using (is_admin()) with check (is_admin());
