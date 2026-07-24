-- ═══════════════════════════════════════════════════════════════
--  169 — Community report fixes
--
--  1. Add `reported` as a valid creations status so user-flagged
--     posts are distinct from admin-rejected ones.
--  2. Add `report_reason text` so the reason selected in the
--     report modal is stored alongside the status change.
--  3. Replace the N+1 correlated subquery in admin_get_all_creations
--     with a LEFT JOIN for efficient likes counting.
--  4. Return report_reason from the RPC so admins can see why
--     a post was flagged.
-- ═══════════════════════════════════════════════════════════════

-- 1. Expand status enum to include 'reported'
alter table creations drop constraint if exists creations_status_check;
alter table creations
  add constraint creations_status_check
  check (status in ('pending', 'approved', 'rejected', 'reported'));

-- 2. Add report_reason column
alter table creations
  add column if not exists report_reason text;

-- 3. Replace admin RPC with JOIN-based likes count + new columns
create or replace function admin_get_all_creations()
returns table (
  id uuid, child_name text, description text, image_url text,
  type text, is_public boolean, status text, likes bigint,
  report_reason text, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id, c.child_name, c.description, c.image_url,
    c.type, c.is_public, c.status,
    count(l.id) as likes,
    c.report_reason,
    c.created_at
  from creations c
  left join likes l on l.creation_id = c.id
  where exists (select 1 from admins where id = auth.uid())
  group by c.id
  order by c.created_at desc;
$$;
