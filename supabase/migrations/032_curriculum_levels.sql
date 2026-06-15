-- ============================================================
-- Migration 032: curriculum_levels (Phase BJ — Generalized
-- Curriculum Framework)
--
-- level_missions (migration 026) already maps Levels 1-3 x 8
-- categories to missions and drives sequential, no-skip,
-- per-language-journey progression. This migration adds a small
-- companion metadata table naming each level as an age-based
-- pedagogical stage (e.g. "Toddler Framework, Ages 1-2, Sensory &
-- Motor Development"), edited by admins via LevelEditor and
-- documented in docs/curriculum-framework.md.
--
-- RLS follows the same auth-read / admin-write convention as
-- categories (migration 012 read policy, migration 030 admin
-- policy) and level_missions (migration 028).
-- ============================================================

create table if not exists curriculum_levels (
  level_number    integer primary key check (level_number > 0),
  age_range_label text not null,
  framework_name  text not null,
  primary_focus   text not null
);

alter table curriculum_levels enable row level security;

drop policy if exists "auth: read curriculum_levels" on curriculum_levels;
create policy "auth: read curriculum_levels" on curriculum_levels
  for select using (auth.uid() is not null);

drop policy if exists "admin: full access" on curriculum_levels;
create policy "admin: full access" on curriculum_levels
  for all using (is_admin()) with check (is_admin());

insert into curriculum_levels (level_number, age_range_label, framework_name, primary_focus) values
  (1, 'Ages 1–2', 'Toddler Framework',                  'Sensory & Motor Development'),
  (2, 'Ages 3–4', 'Preschool Framework',                'Exploration & Social Development'),
  (3, 'Ages 5–6', 'School Readiness / Pre-K Framework', 'Foundational Academics')
on conflict (level_number) do nothing;
