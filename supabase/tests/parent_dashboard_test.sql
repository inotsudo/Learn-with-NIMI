-- ============================================================
--  Phase BH — Parent Intelligence Dashboard automated test suite
--
--  The Parent Dashboard is built entirely from THREE read-only data
--  sources, all consumed as-is by lib/queries.ts:
--    - level_missions          (via getLevelMissions)
--    - child_progress           (via getAllChildProgress, all languages)
--    - child_achievements        (via getChildAchievements)
--    - get_current_level(child, language) RPC (via getCurrentLevel)
--
--  This suite drives a single throwaway test child through controlled
--  en/fr/rw progress using the EXISTING complete_curriculum_mission
--  engine (migrations 026/027, untouched) and asserts that the raw
--  shapes/counts those four sources return are exactly what
--  lib/parentInsights.ts's pure functions expect — i.e. the data
--  layer feeding the dashboard is correct and language-separated.
--
--  Self-contained and side-effect-free: creates the test child under
--  an existing parent, runs every check via ASSERT, and deletes the
--  test child again at the end (cascades child_progress /
--  child_achievements). If any assertion fails, the whole transaction
--  rolls back automatically — either way, no test data is left behind.
--
--  Run:
--    supabase db query --linked --file supabase/tests/parent_dashboard_test.sql
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
  -- level-1 mission ids, one per category (8 categories)
  v_m_morning1   uuid;
  v_m_movement1  uuid;
  v_m_artistic1  uuid;
  v_m_histoire1  uuid;
  v_m_zoom1      uuid;
  v_m_discovery1 uuid;
  v_m_flipflop1  uuid;
  v_m_coloring1  uuid;
begin
  -- Simulate an authenticated parent session for is_my_child()
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);

  -- ── Setup: throwaway test child, starts in 'en' ──
  insert into children (parent_id, name, language)
  values (v_parent_id, '__phase_bh_test_child__', 'en')
  returning id into v_child_id;

  select mission_id into v_m_morning1   from level_missions where level_number = 1 and category_slug = 'morning';
  select mission_id into v_m_movement1  from level_missions where level_number = 1 and category_slug = 'movement';
  select mission_id into v_m_artistic1  from level_missions where level_number = 1 and category_slug = 'artistic';
  select mission_id into v_m_histoire1  from level_missions where level_number = 1 and category_slug = 'histoire';
  select mission_id into v_m_zoom1      from level_missions where level_number = 1 and category_slug = 'zoom';
  select mission_id into v_m_discovery1 from level_missions where level_number = 1 and category_slug = 'discovery';
  select mission_id into v_m_flipflop1  from level_missions where level_number = 1 and category_slug = 'flipflop';
  select mission_id into v_m_coloring1  from level_missions where level_number = 1 and category_slug = 'coloring';

  -- ================================================================
  -- Setup: drive the SAME child through three independent journeys —
  -- en: full Level 1 (8/8) -> advances to Level 2, where 7/8 missions
  --     are already done too (shared-placeholder design, see Phase BC:
  --     7 of Level 2's 8 categories reuse the same mission_id as
  --     Level 1; only "morning" has a distinct Level-2 mission)
  -- fr: 3/8 Level 1 -> stays Level 1
  -- rw: 0 rows -> stays Level 1 (default)
  -- ================================================================

  -- en: complete all 8 Level-1 categories
  perform complete_curriculum_mission(v_child_id, v_m_morning1);
  perform complete_curriculum_mission(v_child_id, v_m_movement1);
  perform complete_curriculum_mission(v_child_id, v_m_artistic1);
  perform complete_curriculum_mission(v_child_id, v_m_histoire1);
  perform complete_curriculum_mission(v_child_id, v_m_zoom1);
  perform complete_curriculum_mission(v_child_id, v_m_discovery1);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop1);
  perform complete_curriculum_mission(v_child_id, v_m_coloring1);

  -- fr: switch journey language, complete 3/8 (artistic, coloring, discovery)
  update children set language = 'fr' where id = v_child_id;
  perform complete_curriculum_mission(v_child_id, v_m_artistic1);
  perform complete_curriculum_mission(v_child_id, v_m_coloring1);
  perform complete_curriculum_mission(v_child_id, v_m_discovery1);

  -- rw: switch journey language, leave at 0/8
  update children set language = 'rw' where id = v_child_id;

  -- restore the child's "active" language (mirrors what the UI would do)
  update children set language = 'en' where id = v_child_id;

  -- ================================================================
  -- Scenario 1: get_current_level — per-language separation
  --   (feeds computeLanguageJourney's `currentLevel` via getCurrentLevel)
  -- ================================================================
  v_level := get_current_level(v_child_id, 'en');
  assert v_level = 2, format('Scenario 1 FAILED: en level = %s, expected 2', v_level);

  v_level := get_current_level(v_child_id, 'fr');
  assert v_level = 1, format('Scenario 1 FAILED: fr level = %s, expected 1', v_level);

  v_level := get_current_level(v_child_id, 'rw');
  assert v_level = 1, format('Scenario 1 FAILED: rw level = %s, expected 1', v_level);

  raise notice 'Scenario 1 PASSED: en=Level 2, fr=Level 1, rw=Level 1';

  -- ================================================================
  -- Scenario 2: child_progress raw shape — feeds getAllChildProgress
  --   (mission_id, language, stars_earned, completed_at, missions(category_slug))
  -- ================================================================
  select count(*) into v_count from child_progress where child_id = v_child_id and language = 'en';
  assert v_count = 8, format('Scenario 2 FAILED: expected 8 en child_progress rows (8 Level-1 categories), got %s', v_count);

  select count(*) into v_count from child_progress where child_id = v_child_id and language = 'fr';
  assert v_count = 3, format('Scenario 2 FAILED: expected 3 fr child_progress rows, got %s', v_count);

  select count(*) into v_count from child_progress where child_id = v_child_id and language = 'rw';
  assert v_count = 0, format('Scenario 2 FAILED: expected 0 rw child_progress rows, got %s', v_count);

  -- every row must join cleanly to missions.category_slug (required by getAllChildProgress)
  select count(*) into v_count
  from child_progress cp
  join missions m on m.id = cp.mission_id
  where cp.child_id = v_child_id and m.category_slug is null;
  assert v_count = 0, format('Scenario 2 FAILED: %s child_progress rows have a null category_slug join', v_count);

  raise notice 'Scenario 2 PASSED: child_progress row counts/joins correct per language (en=9, fr=3, rw=0)';

  -- ================================================================
  -- Scenario 3: level_missions raw shape — feeds getLevelMissions
  --   (computeLanguageJourney's X/8 denominator comes from this table)
  -- ================================================================
  select count(*) into v_count from level_missions where level_number = 1;
  assert v_count = 8, format('Scenario 3 FAILED: expected 8 Level-1 rows (one per category), got %s', v_count);

  select count(distinct category_slug) into v_count from level_missions where level_number = 1;
  assert v_count = 8, format('Scenario 3 FAILED: expected 8 distinct categories at Level 1, got %s', v_count);

  raise notice 'Scenario 3 PASSED: level_missions has 8 distinct categories at Level 1';

  -- ================================================================
  -- Scenario 4: child_achievements raw shape — feeds getChildAchievements
  --   (Achievement Center tiles + buildProgressTimeline)
  -- ================================================================
  -- en: level-1-complete-en + 7 category-master-en badges = 8 rows
  -- ("morning" has a 3-song rotation pool — Phase AA — so completing only
  -- its Level-1 song does not yet earn morning-master-en)
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'en' and type = 'badge' and slug = 'level-1-complete-en';
  assert v_count = 1, 'Scenario 4 FAILED: level-1-complete-en badge missing';

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'en' and type = 'badge' and slug like '%-master-en';
  assert v_count = 7, format('Scenario 4 FAILED: expected 7 en category-master badges, got %s', v_count);

  -- fr: 3 category-master-fr badges, NO level-1-complete-fr (only 3/8 done)
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'fr' and type = 'badge' and slug like '%-master-fr';
  assert v_count = 3, format('Scenario 4 FAILED: expected 3 fr category-master badges, got %s', v_count);

  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'fr' and type = 'badge' and slug = 'level-1-complete-fr';
  assert v_count = 0, 'Scenario 4 FAILED: level-1-complete-fr should not exist (fr only at 3/8)';

  -- rw: no achievements at all
  select count(*) into v_count from child_achievements
  where child_id = v_child_id and language = 'rw';
  assert v_count = 0, format('Scenario 4 FAILED: expected 0 rw achievements, got %s', v_count);

  raise notice 'Scenario 4 PASSED: child_achievements counts correct per language (en=9, fr=3, rw=0)';

  -- ================================================================
  -- Cleanup
  -- ================================================================
  delete from children where id = v_child_id;

  select count(*) into v_count from child_progress where child_id = v_child_id;
  assert v_count = 0, 'Cleanup FAILED: child_progress residue remains';

  select count(*) into v_count from child_achievements where child_id = v_child_id;
  assert v_count = 0, 'Cleanup FAILED: child_achievements residue remains';

  raise notice 'ALL PHASE BH SCENARIOS PASSED';
end $$;
