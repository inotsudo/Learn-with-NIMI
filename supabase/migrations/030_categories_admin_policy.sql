-- ============================================================
-- Migration 030: categories admin-write policy
--
-- `categories` (migration 012) had read-only RLS for authenticated
-- users. The new Curriculum > Categories admin tab lets admins edit
-- `default_type` (slug/sort_order remain hardcoded into the learner-facing
-- ACTIVITIES list and the admin UI never edits them, but the RLS policy
-- follows the same admin-bypass pattern used for level_missions in
-- migration 028).
-- ============================================================

drop policy if exists "admin: full access" on categories;
create policy "admin: full access" on categories
  for all using (is_admin()) with check (is_admin());
