-- ============================================================
--  Phase BC — Curriculum Progression automated test suite
--
--  Covers scenarios 1-4 of the Phase BC verification:
--    1. New child starts at Level 1
--    2. Completing fewer than 8 categories does not advance level
--    3. Completing all 8 categories unlocks next level
--    4. Skipping future levels is impossible (migration 027 guard)
--
--  Self-contained and side-effect-free: creates a throwaway test
--  child under an existing parent, runs every check via ASSERT, and
--  deletes the test child again at the end. If any assertion fails,
--  the whole transaction (including the test-child creation) rolls
--  back automatically — either way, no test data is left behind.
--
--  Scenario 5 (progress persists across logout/login) is inherently
--  a cross-session check and isn't expressible inside one statement
--  — see the Phase BC verification report for how it was verified
--  (re-querying get_current_level/get_curriculum_missions in a fresh
--  `supabase db query` invocation, i.e. a fresh DB session).
--
--  Run:
--    supabase db query --linked --file supabase/tests/curriculum_progression_test.sql
--
--  Requires an existing parent row (edit v_parent_id below if the
--  referenced parent no longer exists).
-- ============================================================

do $$
declare
  v_parent_id uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059'; -- existing parent
  v_child_id  uuid;
  v_lang      text := 'en';
  v_result    jsonb;
  v_level     integer;
  v_total     integer;
  v_done      integer;
  v_level_complete boolean;
  v_threw     boolean;
  -- level_missions mission ids
  v_m_artistic  uuid;
  v_m_coloring  uuid;
  v_m_discovery uuid;
  v_m_flipflop  uuid;
  v_m_histoire  uuid;
  v_m_morning1  uuid;
  v_m_morning3  uuid;
  v_m_movement  uuid;
  v_m_zoom      uuid;
begin
  -- Simulate an authenticated parent session for is_my_child()
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);

  -- ── Setup: throwaway test child ──
  insert into children (parent_id, name, language)
  values (v_parent_id, '__phase_bc_test_child__', v_lang)
  returning id into v_child_id;

  select mission_id into v_m_artistic  from level_missions where level_number = 1 and category_slug = 'artistic';
  select mission_id into v_m_coloring  from level_missions where level_number = 1 and category_slug = 'coloring';
  select mission_id into v_m_discovery from level_missions where level_number = 1 and category_slug = 'discovery';
  select mission_id into v_m_flipflop  from level_missions where level_number = 1 and category_slug = 'flipflop';
  select mission_id into v_m_histoire  from level_missions where level_number = 1 and category_slug = 'histoire';
  select mission_id into v_m_movement  from level_missions where level_number = 1 and category_slug = 'movement';
  select mission_id into v_m_zoom      from level_missions where level_number = 1 and category_slug = 'zoom';
  select mission_id into v_m_morning1  from level_missions where level_number = 1 and category_slug = 'morning';
  select mission_id into v_m_morning3  from level_missions where level_number = 3 and category_slug = 'morning';

  -- ── Scenario 1: new child starts at Level 1 ──
  v_level := get_current_level(v_child_id, v_lang);
  assert v_level = 1, format('Scenario 1 FAILED: new child level = %s, expected 1', v_level);

  select count(*), count(*) filter (where completed) into v_total, v_done
  from get_curriculum_missions(v_child_id);
  assert v_total = 8, format('Scenario 1 FAILED: expected 8 curriculum missions, got %s', v_total);
  assert v_done = 0, format('Scenario 1 FAILED: expected 0 completed missions, got %s', v_done);

  raise notice 'Scenario 1 PASSED: new child starts at Level 1 with 0/8 completed';

  -- ── Scenario 2: completing 7/8 categories does not advance level ──
  perform complete_curriculum_mission(v_child_id, v_m_artistic);
  perform complete_curriculum_mission(v_child_id, v_m_coloring);
  perform complete_curriculum_mission(v_child_id, v_m_discovery);
  perform complete_curriculum_mission(v_child_id, v_m_flipflop);
  perform complete_curriculum_mission(v_child_id, v_m_histoire);
  perform complete_curriculum_mission(v_child_id, v_m_movement);
  perform complete_curriculum_mission(v_child_id, v_m_zoom);

  v_level := get_current_level(v_child_id, v_lang);
  assert v_level = 1, format('Scenario 2 FAILED: level after 7/8 = %s, expected still 1', v_level);

  select bool_or(level_complete) into v_level_complete from get_curriculum_missions(v_child_id);
  assert not v_level_complete, 'Scenario 2 FAILED: level_complete should be false at 7/8';

  raise notice 'Scenario 2 PASSED: 7/8 categories complete, level stays at 1';

  -- ── Scenario 3: completing all 8 categories unlocks the next level ──
  v_result := complete_curriculum_mission(v_child_id, v_m_morning1);

  v_level := get_current_level(v_child_id, v_lang);
  assert v_level = 2, format('Scenario 3 FAILED: level after 8/8 = %s, expected 2', v_level);
  assert (v_result->>'level_complete')::boolean, 'Scenario 3 FAILED: RPC level_complete should be true at 8/8';
  assert v_result->>'level' = '2', format('Scenario 3 FAILED: RPC level = %s, expected 2', v_result->>'level');

  raise notice 'Scenario 3 PASSED: completing 8/8 advances Level 1 -> Level 2';

  -- ── Scenario 4: skipping future levels is impossible ──
  -- v_m_morning3 belongs to Level 3, not the child's current Level 2.
  v_threw := false;
  begin
    perform complete_curriculum_mission(v_child_id, v_m_morning3);
  exception when others then
    v_threw := true;
    if sqlerrm <> 'mission not in current level' then
      raise exception 'Scenario 4 FAILED: unexpected error: %', sqlerrm;
    end if;
  end;
  assert v_threw, 'Scenario 4 FAILED: completing a future-level mission did not raise';

  -- Confirm the rejected call left no trace (level unchanged)
  v_level := get_current_level(v_child_id, v_lang);
  assert v_level = 2, format('Scenario 4 FAILED: level changed to %s after rejected call', v_level);

  raise notice 'Scenario 4 PASSED: future-level mission rejected with "mission not in current level"';

  -- ── Cleanup ──
  delete from children where id = v_child_id;

  raise notice 'ALL PHASE BC SCENARIOS PASSED';
end $$;
