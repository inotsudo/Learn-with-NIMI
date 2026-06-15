-- ============================================================
--  Phase BJ — Generalized Curriculum Framework automated test suite
--
--  Verifies migration 032 (curriculum_levels) and the framework's core
--  success metric: every existing mission is already classifiable by
--  Level (via level_missions) and Language (via mission_versions). This
--  is a read-only check against existing schema/data — no rows are
--  inserted or deleted, so there is no residue to clean up.
--
--    1. curriculum_levels has exactly 3 seeded rows (levels 1-3) with
--       non-empty age_range_label/framework_name/primary_focus
--    2. RLS policies "auth: read curriculum_levels" (auth.uid() is not
--       null) and "admin: full access" (is_admin()) exist, matching the
--       categories (012/030) / level_missions (028) convention
--    3. Every distinct mission_id in `missions` appears in
--       `level_missions` at least once (100% level-classified)
--    4. Every mission has at least one published-or-draft `en`
--       mission_versions row (100% language-classifiable baseline)
--
--  Run:
--    supabase db query --linked --file supabase/tests/curriculum_framework_test.sql
-- ============================================================

do $$
declare
  v_count        integer;
  v_total        integer;
  v_unclassified integer;
  v_no_en        integer;
begin
  -- ================================================================
  -- Scenario 1: curriculum_levels seeded with 3 non-empty rows
  -- ================================================================
  select count(*) into v_count from curriculum_levels
  where level_number in (1, 2, 3)
    and length(trim(age_range_label)) > 0
    and length(trim(framework_name)) > 0
    and length(trim(primary_focus)) > 0;
  assert v_count = 3, format('Scenario 1 FAILED: expected 3 fully-populated curriculum_levels rows (1-3), got %s', v_count);

  raise notice 'Scenario 1 PASSED: curriculum_levels has 3 fully-populated rows for levels 1-3';

  -- ================================================================
  -- Scenario 2: RLS policies present
  -- ================================================================
  select count(*) into v_count from pg_policies
  where tablename = 'curriculum_levels' and policyname = 'auth: read curriculum_levels'
    and qual ilike '%auth.uid() is not null%';
  assert v_count = 1, 'Scenario 2 FAILED: "auth: read curriculum_levels" policy missing or not using auth.uid()';

  select count(*) into v_count from pg_policies
  where tablename = 'curriculum_levels' and policyname = 'admin: full access'
    and qual ilike '%is_admin%' and with_check ilike '%is_admin%';
  assert v_count = 1, 'Scenario 2 FAILED: "admin: full access" policy missing or not using is_admin()';

  raise notice 'Scenario 2 PASSED: auth-read + admin-full-access RLS policies present on curriculum_levels';

  -- ================================================================
  -- Scenario 3: every mission is level-classified (level_missions)
  -- ================================================================
  select count(*) into v_total from missions;

  select count(*) into v_unclassified
  from missions m
  where not exists (select 1 from level_missions lm where lm.mission_id = m.id);

  assert v_unclassified = 0, format('Scenario 3 FAILED: %s of %s missions are not assigned to any level_missions row', v_unclassified, v_total);

  raise notice 'Scenario 3 PASSED: all % missions are classified by level via level_missions', v_total;

  -- ================================================================
  -- Scenario 4: every mission has at least an English version (language-classifiable baseline)
  -- ================================================================
  select count(*) into v_no_en
  from missions m
  where not exists (select 1 from mission_versions mv where mv.mission_id = m.id and mv.language = 'en');

  assert v_no_en = 0, format('Scenario 4 FAILED: %s of %s missions have no English mission_versions row', v_no_en, v_total);

  raise notice 'Scenario 4 PASSED: all % missions have an English mission_versions row', v_total;

  raise notice 'ALL PHASE BJ SCENARIOS PASSED';
end $$;
