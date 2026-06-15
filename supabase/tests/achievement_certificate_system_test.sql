-- ============================================================
--  Phase BF — Achievement & Certificate System automated test suite
--
--  Drives a single throwaway test child through a full curriculum
--  completion (10 complete_curriculum_mission calls — 8 Level-1
--  categories + Level 2's and Level 3's "morning" missions, per the
--  Phase BC/BD shared-placeholder design) independently in en, fr and
--  rw, and asserts:
--
--    1. The en run produces all 8 {category}-master-en badges, all 3
--       level-N-complete-en badges, and curriculum-complete-en. The
--       derived Tier-4 "Trilingual Champion" condition (all 3 of
--       curriculum-complete-{en,fr,rw} exist) is FALSE (1/3).
--    2. The fr run produces the equivalent -fr set, independently of
--       -en (unchanged). Tier-4 still FALSE (2/3).
--    3. The rw run produces the equivalent -rw set. Tier-4 is now
--       TRUE (3/3) — Trilingual Champion unlocked.
--    4. Duplicate-prevention: re-running 8 of en's completions (the 7
--       shared-placeholder categories + Level 3's "morning", all valid
--       for a child saturated at Level 3 under migration 027's no-skip
--       guard) leaves every -en badge/certificate row count unchanged
--       and Tier-4 still TRUE.
--    5. Cleanup: delete the test child (cascades child_progress /
--       child_achievements).
--
--  Self-contained and side-effect-free, same DO $$ ... ASSERT pattern
--  as curriculum_progression_test.sql /
--  multilingual_journey_separation_test.sql. If any assertion fails,
--  the whole transaction (including test-child creation) rolls back —
--  either way, no test data is left behind.
--
--  Run:
--    supabase db query --linked --file supabase/tests/achievement_certificate_system_test.sql
--
--  Requires an existing parent row (edit v_parent_id below if the
--  referenced parent no longer exists).
-- ============================================================

do $$
declare
  v_parent_id uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059'; -- existing parent
  v_child_id  uuid;
  v_count     integer;
  -- level_missions mission ids (language-agnostic; levels 2/3 reuse
  -- level 1's mission_id for every category except "morning")
  v_m_artistic  uuid;
  v_m_coloring  uuid;
  v_m_discovery uuid;
  v_m_flipflop  uuid;
  v_m_histoire  uuid;
  v_m_morning1  uuid;
  v_m_morning2  uuid;
  v_m_morning3  uuid;
  v_m_movement  uuid;
  v_m_zoom      uuid;
begin
  -- Simulate an authenticated parent session for is_my_child()
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);

  -- ── Setup: throwaway test child, starts in 'en' ──
  insert into children (parent_id, name, language)
  values (v_parent_id, '__phase_bf_test_child__', 'en')
  returning id into v_child_id;

  select mission_id into v_m_artistic  from level_missions where level_number = 1 and category_slug = 'artistic';
  select mission_id into v_m_coloring  from level_missions where level_number = 1 and category_slug = 'coloring';
  select mission_id into v_m_discovery from level_missions where level_number = 1 and category_slug = 'discovery';
  select mission_id into v_m_flipflop  from level_missions where level_number = 1 and category_slug = 'flipflop';
  select mission_id into v_m_histoire  from level_missions where level_number = 1 and category_slug = 'histoire';
  select mission_id into v_m_movement  from level_missions where level_number = 1 and category_slug = 'movement';
  select mission_id into v_m_zoom      from level_missions where level_number = 1 and category_slug = 'zoom';
  select mission_id into v_m_morning1  from level_missions where level_number = 1 and category_slug = 'morning';
  select mission_id into v_m_morning2  from level_missions where level_number = 2 and category_slug = 'morning';
  select mission_id into v_m_morning3  from level_missions where level_number = 3 and category_slug = 'morning';

  -- ================================================================
  -- Scenario 1: full EN curriculum (10 calls) -> Tiers 1-3 for -en
  -- ================================================================
  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);
  perform complete_curriculum_mission(v_child_id, v_m_morning1);
  perform complete_curriculum_mission(v_child_id, v_m_morning2);
  perform complete_curriculum_mission(v_child_id, v_m_morning3);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like '%-master-en';
  assert v_count = 8, format('Scenario 1 FAILED: expected 8 en category-master badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like 'level-%-complete-en';
  assert v_count = 3, format('Scenario 1 FAILED: expected 3 en level-complete badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate' and slug = 'curriculum-complete-en';
  assert v_count = 1, 'Scenario 1 FAILED: curriculum-complete-en certificate missing';

  -- Tier 4 (Trilingual Champion) is derived: earned iff
  -- curriculum-complete-{en,fr,rw} all exist for this child.
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate'
    and slug in ('curriculum-complete-en', 'curriculum-complete-fr', 'curriculum-complete-rw');
  assert v_count = 1, format('Scenario 1 FAILED: Tier-4 progress = %s/3, expected 1/3', v_count);

  raise notice 'Scenario 1 PASSED: full en curriculum -> 8 category-master + 3 level badges + curriculum-complete-en; Trilingual 1/3';

  -- ================================================================
  -- Scenario 2: full FR curriculum (10 calls) -> -fr set independent of -en
  -- ================================================================
  update children set language = 'fr' where id = v_child_id;

  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);
  perform complete_curriculum_mission(v_child_id, v_m_morning1);
  perform complete_curriculum_mission(v_child_id, v_m_morning2);
  perform complete_curriculum_mission(v_child_id, v_m_morning3);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like '%-master-fr';
  assert v_count = 8, format('Scenario 2 FAILED: expected 8 fr category-master badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like 'level-%-complete-fr';
  assert v_count = 3, format('Scenario 2 FAILED: expected 3 fr level-complete badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate' and slug = 'curriculum-complete-fr';
  assert v_count = 1, 'Scenario 2 FAILED: curriculum-complete-fr certificate missing';

  -- -en set unchanged by the -fr run
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like '%-master-en';
  assert v_count = 8, format('Scenario 2 FAILED: en category-master badge count changed to %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like 'level-%-complete-en';
  assert v_count = 3, format('Scenario 2 FAILED: en level-complete badge count changed to %s', v_count);

  -- Tier 4 still false (2/3)
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate'
    and slug in ('curriculum-complete-en', 'curriculum-complete-fr', 'curriculum-complete-rw');
  assert v_count = 2, format('Scenario 2 FAILED: Tier-4 progress = %s/3, expected 2/3', v_count);

  raise notice 'Scenario 2 PASSED: full fr curriculum independent of en; Trilingual 2/3';

  -- ================================================================
  -- Scenario 3: full RW curriculum (10 calls) -> Tier 4 unlocked (3/3)
  -- ================================================================
  update children set language = 'rw' where id = v_child_id;

  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);
  perform complete_curriculum_mission(v_child_id, v_m_morning1);
  perform complete_curriculum_mission(v_child_id, v_m_morning2);
  perform complete_curriculum_mission(v_child_id, v_m_morning3);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like '%-master-rw';
  assert v_count = 8, format('Scenario 3 FAILED: expected 8 rw category-master badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like 'level-%-complete-rw';
  assert v_count = 3, format('Scenario 3 FAILED: expected 3 rw level-complete badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate' and slug = 'curriculum-complete-rw';
  assert v_count = 1, 'Scenario 3 FAILED: curriculum-complete-rw certificate missing';

  -- Tier 4: now true (3/3) -- Trilingual Champion unlocked
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate'
    and slug in ('curriculum-complete-en', 'curriculum-complete-fr', 'curriculum-complete-rw');
  assert v_count = 3, format('Scenario 3 FAILED: Tier-4 progress = %s/3, expected 3/3 (Trilingual Champion unlocked)', v_count);

  raise notice 'Scenario 3 PASSED: full rw curriculum independent of en/fr; Trilingual Champion unlocked (3/3)';

  -- ================================================================
  -- Scenario 4: duplicate-prevention — re-run 8 of en's completions
  -- (the 7 shared-placeholder categories + Level 3's "morning", all
  -- valid for a child saturated at Level 3 under migration 027's
  -- no-skip guard) and confirm no row counts change.
  -- ================================================================
  update children set language = 'en' where id = v_child_id;

  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);
  perform complete_curriculum_mission(v_child_id, v_m_morning3);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like '%-master-en';
  assert v_count = 8, format('Scenario 4 FAILED: en category-master badge count changed to %s after re-run', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'badge' and slug like 'level-%-complete-en';
  assert v_count = 3, format('Scenario 4 FAILED: en level-complete badge count changed to %s after re-run', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate' and slug = 'curriculum-complete-en';
  assert v_count = 1, format('Scenario 4 FAILED: curriculum-complete-en row count = %s after re-run, expected still 1', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate' and slug = 'program-complete-en';
  assert v_count = 1, format('Scenario 4 FAILED: program-complete-en row count = %s after re-run, expected still 1', v_count);

  -- Tier 4 still true
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate'
    and slug in ('curriculum-complete-en', 'curriculum-complete-fr', 'curriculum-complete-rw');
  assert v_count = 3, format('Scenario 4 FAILED: Tier-4 progress = %s/3 after re-run, expected still 3/3', v_count);

  raise notice 'Scenario 4 PASSED: re-running completions creates no duplicate achievement rows; Trilingual Champion still unlocked';

  -- ── Cleanup ──
  delete from children where id = v_child_id;

  raise notice 'ALL PHASE BF SCENARIOS PASSED';
end $$;
