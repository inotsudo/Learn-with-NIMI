-- ============================================================
--  Phase BD — Multilingual Journey Separation automated test suite
--
--  Drives a single throwaway test child through independent en/fr/rw
--  curriculum journeys (switching children.language between blocks,
--  exactly as the new journey-selector UI does via
--  updateChildLanguage()) and asserts that level progression, mission
--  completion, badge earning and certificate unlocking are all fully
--  independent per (child_id, language) — without affecting each
--  other on the same underlying child row.
--
--  Self-contained and side-effect-free: creates the test child under
--  an existing parent, runs every check via ASSERT, and deletes the
--  test child again at the end (cascades child_progress /
--  child_achievements). If any assertion fails, the whole transaction
--  (including the test-child creation) rolls back automatically —
--  either way, no test data is left behind.
--
--  Run:
--    supabase db query --linked --file supabase/tests/multilingual_journey_separation_test.sql
--
--  Requires an existing parent row (edit v_parent_id below if the
--  referenced parent no longer exists).
-- ============================================================

do $$
declare
  v_parent_id uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059'; -- existing parent
  v_child_id  uuid;
  v_level     integer;
  v_count     integer;
  v_result    jsonb;
  -- level_missions mission ids (language-agnostic; the same physical
  -- mission is reused across languages, only child_progress.language differs)
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
  values (v_parent_id, '__phase_bd_test_child__', 'en')
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
  -- Setup: drive the SAME child through three independent journeys —
  -- en (full Level 1, advances to Level 2), fr (7/8, stays Level 1),
  -- rw (2/8, stays Level 1) — switching children.language between
  -- blocks exactly as updateChildLanguage() does from the UI.
  -- ================================================================

  -- en: complete all 8 Level-1 categories -> advances to Level 2
  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);
  perform complete_curriculum_mission(v_child_id, v_m_morning1);

  -- fr: switch journey language, complete 7/8 (skip morning)
  update children set language = 'fr' where id = v_child_id;
  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);

  -- rw: switch journey language, complete 2/8
  update children set language = 'rw' where id = v_child_id;
  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);

  -- ================================================================
  -- Scenario 1: Independent level progression
  -- ================================================================
  v_level := get_current_level(v_child_id, 'en');
  assert v_level = 2, format('Scenario 1 FAILED: en level = %s, expected 2', v_level);

  v_level := get_current_level(v_child_id, 'fr');
  assert v_level = 1, format('Scenario 1 FAILED: fr level = %s, expected 1', v_level);

  v_level := get_current_level(v_child_id, 'rw');
  assert v_level = 1, format('Scenario 1 FAILED: rw level = %s, expected 1', v_level);

  raise notice 'Scenario 1 PASSED: en=Level 2, fr=Level 1, rw=Level 1 — independent levels on the same child';

  -- ================================================================
  -- Scenario 2: Independent mission completion
  -- ================================================================
  select count(*) into v_count from child_progress where child_id = v_child_id and language = 'en';
  assert v_count = 8, format('Scenario 2 FAILED: expected 8 en child_progress rows, got %s', v_count);

  select count(*) into v_count from child_progress where child_id = v_child_id and language = 'fr';
  assert v_count = 7, format('Scenario 2 FAILED: expected 7 fr child_progress rows, got %s', v_count);

  select count(*) into v_count from child_progress where child_id = v_child_id and language = 'rw';
  assert v_count = 2, format('Scenario 2 FAILED: expected 2 rw child_progress rows, got %s', v_count);

  -- the shared "artistic" mission_id has 3 independent rows, one per language
  select count(*) into v_count from child_progress where child_id = v_child_id and mission_id = v_m_artistic;
  assert v_count = 3, format('Scenario 2 FAILED: expected 3 rows (en+fr+rw) for shared artistic mission_id, got %s', v_count);

  -- "morning" (Level 1) was only ever completed in en
  select count(*) into v_count from child_progress where child_id = v_child_id and mission_id = v_m_morning1;
  assert v_count = 1, format('Scenario 2 FAILED: expected 1 row (en only) for morning1 mission_id, got %s', v_count);

  raise notice 'Scenario 2 PASSED: child_progress rows independent per (mission_id, language)';

  -- ================================================================
  -- Scenario 3: Independent badge earning
  -- ================================================================
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'en' and type = 'badge' and slug = 'level-1-complete-en';
  assert v_count = 1, 'Scenario 3 FAILED: level-1-complete-en badge missing';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'fr' and type = 'badge' and slug = 'level-1-complete-fr';
  assert v_count = 0, 'Scenario 3 FAILED: level-1-complete-fr should not exist (fr only at 7/8)';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'rw' and type = 'badge' and slug = 'level-1-complete-rw';
  assert v_count = 0, 'Scenario 3 FAILED: level-1-complete-rw should not exist (rw only at 2/8)';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'en' and type = 'badge' and slug like '%-master-en';
  assert v_count >= 1, 'Scenario 3 FAILED: expected at least one en category-master badge';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'fr' and type = 'badge' and slug = 'artistic-master-fr';
  assert v_count = 1, 'Scenario 3 FAILED: artistic-master-fr badge missing (fr completed artistic)';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'rw' and type = 'badge' and slug = 'artistic-master-rw';
  assert v_count = 1, 'Scenario 3 FAILED: artistic-master-rw badge missing (rw completed artistic)';

  raise notice 'Scenario 3 PASSED: badges earned/withheld independently per language';

  -- ================================================================
  -- Scenario 4: Independent certificate unlocking
  -- ================================================================
  -- Finish en's full curriculum: Level 2 and Level 3's "morning"
  -- (10 complete_curriculum_mission calls total, per the shared-
  -- placeholder design — see Phase BC).
  update children set language = 'en' where id = v_child_id;
  v_result := complete_curriculum_mission(v_child_id, v_m_morning2);
  v_result := complete_curriculum_mission(v_child_id, v_m_morning3);

  v_level := get_current_level(v_child_id, 'en');
  assert v_level = 3, format('Scenario 4 FAILED: en level after full curriculum = %s, expected 3', v_level);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'en' and type = 'certificate' and slug = 'program-complete-en';
  assert v_count = 1, 'Scenario 4 FAILED: program-complete-en certificate missing';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'en' and type = 'certificate' and slug = 'curriculum-complete-en';
  assert v_count = 1, 'Scenario 4 FAILED: curriculum-complete-en certificate missing';

  -- fr/rw must NOT have unlocked any certificate, despite partial progress
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and type = 'certificate' and language in ('fr', 'rw');
  assert v_count = 0, format('Scenario 4 FAILED: expected 0 fr/rw certificates, got %s', v_count);

  -- fr/rw levels remain unaffected by en finishing its full curriculum
  v_level := get_current_level(v_child_id, 'fr');
  assert v_level = 1, format('Scenario 4 FAILED: fr level changed to %s after en finished its curriculum, expected still 1', v_level);

  v_level := get_current_level(v_child_id, 'rw');
  assert v_level = 1, format('Scenario 4 FAILED: rw level changed to %s after en finished its curriculum, expected still 1', v_level);

  raise notice 'Scenario 4 PASSED: certificates unlock independently per language; fr/rw unaffected by en''s completed curriculum';

  -- ── Cleanup ──
  delete from children where id = v_child_id;

  raise notice 'ALL PHASE BD SCENARIOS PASSED';
end $$;
