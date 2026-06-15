-- ============================================================
--  NIMIPIKO — Community Gallery moderation
--  Adds an admin-review gate before a creation appears in the
--  public Community Gallery: new uploads start "pending" and
--  only show publicly once an admin sets them to "approved".
-- ============================================================

alter table creations
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

-- Pre-existing rows were already live in the gallery — grandfather them in.
update creations set status = 'approved' where status = 'pending';

create index if not exists creations_status_idx on creations (status);

-- Replace the public/own-creation select policy: public visibility now
-- additionally requires status = 'approved'. Owners can still see their
-- own creations at any status (so "My Gallery" can show pending/rejected).
drop policy if exists "auth: select public or own creations" on creations;

create policy "auth: select public or own creations" on creations
  for select using (
    (is_public = true and status = 'approved')
    or parent_id = auth.uid()
  );

-- Admins can see and moderate every creation regardless of status.
create policy "admin: select all creations" on creations
  for select using (is_admin());

create policy "admin: moderate creations" on creations
  for update using (is_admin()) with check (is_admin());
