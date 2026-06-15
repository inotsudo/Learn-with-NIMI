-- ============================================================
--  NIMIPIKO — Admin Portal: Auth & Roles Foundation
--  Adds an `admins` table + `is_admin()` helper, and grants
--  admins full read/write access (additive RLS policies — every
--  existing parent/child policy keeps working unchanged).
--
--  After this migration is applied, bootstrap the first admin
--  manually:
--    insert into admins (id, email, name, role)
--    select id, email, 'Admin', 'superadmin'
--    from auth.users where email = '<the chosen account email>';
-- ============================================================


-- ── 1. ADMINS ────────────────────────────────────────────────
create table if not exists admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  role       text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz default now()
);

alter table admins enable row level security;


-- ── 2. is_admin() helper ─────────────────────────────────────
-- security definer so it bypasses RLS on `admins` internally —
-- no circular dependency with the policies below.
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (select 1 from admins where id = auth.uid());
$$;


-- ── 3. admins policies ───────────────────────────────────────
drop policy if exists "admin: select own profile" on admins;
drop policy if exists "admin: select all admins"  on admins;
drop policy if exists "admin: update own profile" on admins;
drop policy if exists "admin: insert admins"      on admins;
drop policy if exists "admin: delete admins"      on admins;

create policy "admin: select own profile" on admins for select using (id = auth.uid());
create policy "admin: select all admins"  on admins for select using (is_admin());
create policy "admin: update own profile" on admins for update using (id = auth.uid());
create policy "admin: insert admins"      on admins for insert with check (is_admin());
create policy "admin: delete admins"      on admins for delete using (is_admin());


-- ── 4. Admin-bypass policies on content & operational tables ──
-- Additive permissive policies: admins get full CRUD, every
-- existing policy for non-admins is untouched.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'missions', 'mission_versions',
    'stories', 'story_pages', 'story_page_versions', 'coloring_pages',
    'children', 'child_progress', 'child_achievements', 'child_badges',
    'coloring_saves', 'parents', 'parental_settings'
  ]
  loop
    execute format('drop policy if exists "admin: full access" on %I', t);
    execute format('create policy "admin: full access" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
