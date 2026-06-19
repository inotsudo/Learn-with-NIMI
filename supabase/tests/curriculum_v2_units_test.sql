-- ============================================================
--  Phase BK.2 — Curriculum V2 Units automated test suite
--
--  Covers the 4 scenarios of the BK.2 verification plan:
--    A. Regression — real Level 1 (unit_number=1 only). Re-asserts
--       the Phase BC checks (new child -> Level 1, 7/8 doesn't
--       advance, 8/8 advances to Level 2) plus the new fields:
--       every returned row has unit = 1 and
--       unit_complete == level_complete, proving the
--       backward-compat equivalence holds against live data.
--    B. New Unit — a throwaway unit_number=2 set of 8
--       level_missions rows (new throwaway missions) is added to
--       Level 1. A fresh child progresses (1,1) -> (1,2) -> (2,1),
--       earning unit-1-1-complete-en first, then
--       unit-1-2-complete-en + level-1-complete-en together.
--    C. Sticky / no demotion — Child A already holds
--       level-1-complete-en from *before* Scenario B's Unit 2
--       existed. Confirm get_current_position still does not pull
--       Child A back to (1,2) now that Level 1 has 2 units.
--    D. 52-unit stress seed — 416 throwaway level_missions rows
--       under sentinel level_number=999 (8 categories x 52 units),
--       proving the new 3-column PK and the position-grouping query
--       shape hold at the confirmed 52-Units/Level target scale.
--
--  Self-contained and side-effect-free: every throwaway row (test
--  children, level_missions rows, missions/mission_versions) is
--  deleted at the end. If any assertion fails, the whole statement
--  rolls back automatically — nothing is left behind either way.
--
--  Run:
--    supabase db query --linked --file supabase/tests/curriculum_v2_units_test.sql
--
--  Requires an existing parent row (edit v_parent_id below if the
--  referenced parent no longer exists).
-- ============================================================

do $$
declare
  v_parent_id uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059'; -- existing parent
  v_lang      text := 'en';

  v_level      integer;
  v_total      integer;
  v_done       integer;
  v_result     jsonb;
  v_check1     boolean;
  v_check2     boolean;
  v_pos_level  integer;
  v_pos_unit   integer;

  -- Scenario A
  v_child_a     uuid;
  v_m_artistic  uuid;
  v_m_coloring  uuid;
  v_m_discovery uuid;
  v_m_flipflop  uuid;
  v_m_histoire  uuid;
  v_m_morning1  uuid;
  v_m_movement  uuid;
  v_m_zoom      uuid;

  -- Scenario B / C
  v_child_b        uuid;
  v_cat            record;
  v_new_mission    uuid;
  v_u2_mission_ids uuid[] := '{}';

  -- Scenario D
  v_child_d           uuid;
  v_stress_mission_id uuid;
  v_count             integer;
  v_groups            integer;
begin
  -- Simulate an authenticated parent session for is_my_child()
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);

  -- ════════════════════════════════════════════════════════
  -- Scenario A — Regression (real Level 1, unit_number=1 only)
  -- ════════════════════════════════════════════════════════
  insert into children (parent_id, name, language)
  values (v_parent_id, '__bk2_test_child_a__', v_lang)
  returning id into v_child_a;

  select mission_id into v_m_artistic  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'artistic';
  select mission_id into v_m_coloring  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'coloring';
  select mission_id into v_m_discovery from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'discovery';
  select mission_id into v_m_flipflop  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'flipflop';
  select mission_id into v_m_histoire  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'histoire';
  select mission_id into v_m_movement  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'movement';
  select mission_id into v_m_zoom      from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'zoom';
  select mission_id into v_m_morning1  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'morning';

  -- A1: new child -> (level 1, unit 1), 0/8, unit=1, unit_complete==level_complete
  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_a, v_lang) gcp;
  assert v_pos_level = 1 and v_pos_unit = 1,
    format('Scenario A FAILED: new child position = (%s,%s), expected (1,1)', v_pos_level, v_pos_unit);

  v_level := get_current_level(v_child_a, v_lang);
  assert v_level = 1, format('Scenario A FAILED: get_current_level = %s, expected 1', v_level);

  select count(*), count(*) filter (where completed),
         bool_and(unit = 1), bool_and(unit_complete = level_complete)
  into v_total, v_done, v_check1, v_check2
  from get_curriculum_missions(v_child_a);

  assert v_total = 8, format('Scenario A FAILED: expected 8 curriculum missions, got %s', v_total);
  assert v_done = 0, format('Scenario A FAILED: expected 0 completed, got %s', v_done);
  assert v_check1, 'Scenario A FAILED: not every row has unit = 1';
  assert v_check2, 'Scenario A FAILED: unit_complete != level_complete while unit_number=1';

  raise notice 'Scenario A.1 PASSED: new child at (level 1, unit 1), 0/8, unit=1, unit_complete==level_complete';

  -- A2: complete 7/8 -> still (1,1), neither complete
  perform complete_curriculum_mission(v_child_a, v_m_artistic);
  perform complete_curriculum_mission(v_child_a, v_m_coloring);
  perform complete_curriculum_mission(v_child_a, v_m_discovery);
  perform complete_curriculum_mission(v_child_a, v_m_flipflop);
  perform complete_curriculum_mission(v_child_a, v_m_histoire);
  perform complete_curriculum_mission(v_child_a, v_m_movement);
  perform complete_curriculum_mission(v_child_a, v_m_zoom);

  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_a, v_lang) gcp;
  assert v_pos_level = 1 and v_pos_unit = 1,
    format('Scenario A FAILED: position after 7/8 = (%s,%s), expected (1,1)', v_pos_level, v_pos_unit);

  select bool_or(unit_complete), bool_or(level_complete) into v_check1, v_check2
  from get_curriculum_missions(v_child_a);
  assert not v_check1, 'Scenario A FAILED: unit_complete true at 7/8';
  assert not v_check2, 'Scenario A FAILED: level_complete true at 7/8';

  raise notice 'Scenario A.2 PASSED: 7/8 done, position stays (1,1), unit_complete/level_complete both false';

  -- A3: complete 8/8 -> awards unit-1-1-complete-en + level-1-complete-en, advances to (2,1)
  v_result := complete_curriculum_mission(v_child_a, v_m_morning1);

  assert (v_result->>'level_complete')::boolean, 'Scenario A FAILED: RPC level_complete should be true at 8/8';
  assert (v_result->>'unit_complete')::boolean, 'Scenario A FAILED: RPC unit_complete should be true at 8/8';
  assert v_result->>'level' = '2', format('Scenario A FAILED: RPC level = %s, expected 2', v_result->>'level');
  assert v_result->>'unit' = '1', format('Scenario A FAILED: RPC unit = %s, expected 1', v_result->>'unit');

  assert exists (
    select 1 from child_achievements
    where child_id = v_child_a and language = v_lang and type = 'badge' and slug = 'unit-1-1-complete-en'
  ), 'Scenario A FAILED: unit-1-1-complete-en badge not awarded';

  assert exists (
    select 1 from child_achievements
    where child_id = v_child_a and language = v_lang and type = 'badge' and slug = 'level-1-complete-en'
  ), 'Scenario A FAILED: level-1-complete-en badge not awarded';

  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_a, v_lang) gcp;
  assert v_pos_level = 2 and v_pos_unit = 1,
    format('Scenario A FAILED: position after 8/8 = (%s,%s), expected (2,1)', v_pos_level, v_pos_unit);

  raise notice 'Scenario A.3 PASSED: 8/8 awards unit-1-1-complete-en + level-1-complete-en, advances to (2,1)';

  raise notice 'SCENARIO A (Regression) PASSED';


  -- ════════════════════════════════════════════════════════
  -- Scenario B — New Unit (throwaway unit_number=2 for Level 1)
  -- ════════════════════════════════════════════════════════
  -- 8 throwaway missions (one per category), each with a
  -- published+active EN mission_version, wired up as Level 1's
  -- Unit 2. Deleted in cleanup (cascades level_missions +
  -- mission_versions).
  for v_cat in select slug from categories order by sort_order loop
    insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
    values (v_cat.slug, 9001, 'sing', 10, 5, true)
    returning id into v_new_mission;

    insert into mission_versions (mission_id, language, title, status)
    values (v_new_mission, 'en', '__bk2_test_unit2__', 'published');

    insert into level_missions (level_number, unit_number, category_slug, mission_id)
    values (1, 2, v_cat.slug, v_new_mission);

    v_u2_mission_ids := array_append(v_u2_mission_ids, v_new_mission);
  end loop;

  -- B1: a fresh child still starts at (1,1) even though Level 1 now has 2 units
  insert into children (parent_id, name, language)
  values (v_parent_id, '__bk2_test_child_b__', v_lang)
  returning id into v_child_b;

  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_b, v_lang) gcp;
  assert v_pos_level = 1 and v_pos_unit = 1,
    format('Scenario B FAILED: fresh child position = (%s,%s), expected (1,1)', v_pos_level, v_pos_unit);

  raise notice 'Scenario B.1 PASSED: fresh child still starts at (1,1) with Unit 2 present';

  -- B2: complete Unit 1's 8 -> unit-1-1-complete-en awarded, level-1-complete-en NOT yet, position -> (1,2)
  perform complete_curriculum_mission(v_child_b, v_m_artistic);
  perform complete_curriculum_mission(v_child_b, v_m_coloring);
  perform complete_curriculum_mission(v_child_b, v_m_discovery);
  perform complete_curriculum_mission(v_child_b, v_m_flipflop);
  perform complete_curriculum_mission(v_child_b, v_m_histoire);
  perform complete_curriculum_mission(v_child_b, v_m_movement);
  perform complete_curriculum_mission(v_child_b, v_m_zoom);
  v_result := complete_curriculum_mission(v_child_b, v_m_morning1);

  assert (v_result->>'unit_complete')::boolean, 'Scenario B FAILED: unit_complete should be true after Unit 1''s 8/8';
  assert not (v_result->>'level_complete')::boolean, 'Scenario B FAILED: level_complete should be false (Unit 2 still open)';

  assert exists (
    select 1 from child_achievements
    where child_id = v_child_b and language = v_lang and type = 'badge' and slug = 'unit-1-1-complete-en'
  ), 'Scenario B FAILED: unit-1-1-complete-en badge not awarded';

  assert not exists (
    select 1 from child_achievements
    where child_id = v_child_b and language = v_lang and type = 'badge' and slug = 'level-1-complete-en'
  ), 'Scenario B FAILED: level-1-complete-en awarded too early (Unit 2 still open)';

  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_b, v_lang) gcp;
  assert v_pos_level = 1 and v_pos_unit = 2,
    format('Scenario B FAILED: position after Unit 1 = (%s,%s), expected (1,2)', v_pos_level, v_pos_unit);

  raise notice 'Scenario B.2 PASSED: Unit 1 complete -> unit-1-1-complete-en awarded, level-1-complete-en withheld, position (1,2)';

  -- B3: complete Unit 2's 8 -> unit-1-2-complete-en AND level-1-complete-en both awarded, position -> (2,1)
  for v_new_mission in select unnest(v_u2_mission_ids) loop
    v_result := complete_curriculum_mission(v_child_b, v_new_mission);
  end loop;

  assert (v_result->>'unit_complete')::boolean, 'Scenario B FAILED: unit_complete should be true after Unit 2''s 8/8';
  assert (v_result->>'level_complete')::boolean, 'Scenario B FAILED: level_complete should be true after Unit 2''s 8/8';

  assert exists (
    select 1 from child_achievements
    where child_id = v_child_b and language = v_lang and type = 'badge' and slug = 'unit-1-2-complete-en'
  ), 'Scenario B FAILED: unit-1-2-complete-en badge not awarded';

  assert exists (
    select 1 from child_achievements
    where child_id = v_child_b and language = v_lang and type = 'badge' and slug = 'level-1-complete-en'
  ), 'Scenario B FAILED: level-1-complete-en badge not awarded after Unit 2';

  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_b, v_lang) gcp;
  assert v_pos_level = 2 and v_pos_unit = 1,
    format('Scenario B FAILED: position after Unit 2 = (%s,%s), expected (2,1)', v_pos_level, v_pos_unit);

  raise notice 'Scenario B.3 PASSED: Unit 2 complete -> unit-1-2-complete-en + level-1-complete-en awarded, position (2,1)';

  raise notice 'SCENARIO B (New Unit) PASSED';


  -- ════════════════════════════════════════════════════════
  -- Scenario C — Sticky / no demotion
  -- ════════════════════════════════════════════════════════
  -- Child A earned level-1-complete-en in Scenario A, BEFORE
  -- Scenario B's Unit 2 rows existed. Now that Level 1 has 2 units,
  -- confirm Child A's position is NOT pulled back to (1,2).
  select gcp.level_number, gcp.unit_number into v_pos_level, v_pos_unit
  from get_current_position(v_child_a, v_lang) gcp;
  assert v_pos_level = 2 and v_pos_unit = 1,
    format('Scenario C FAILED: child A position = (%s,%s), expected (2,1) -- demoted!', v_pos_level, v_pos_unit);
  assert not (v_pos_level = 1 and v_pos_unit = 2),
    'Scenario C FAILED: child A demoted to (1,2) after Unit 2 was added to a completed Level 1';

  raise notice 'SCENARIO C (Sticky / no demotion) PASSED: child A stays at (2,1) despite Level 1 gaining a Unit 2';


  -- ════════════════════════════════════════════════════════
  -- Scenario D — 52-unit stress seed (sentinel level_number=999)
  -- ════════════════════════════════════════════════════════
  insert into children (parent_id, name, language)
  values (v_parent_id, '__bk2_test_child_d__', v_lang)
  returning id into v_child_d;

  select mission_id into v_stress_mission_id
  from level_missions where level_number = 1 and unit_number = 1 and category_slug = 'morning';

  insert into level_missions (level_number, unit_number, category_slug, mission_id)
  select 999, u, c.slug, v_stress_mission_id
  from generate_series(1, 52) as u
  cross join (select slug from categories) c;

  select count(*) into v_count from level_missions where level_number = 999;
  assert v_count = 416, format('Scenario D FAILED: expected 416 rows at level_number=999, got %s', v_count);

  select count(distinct unit_number) into v_groups from level_missions where level_number = 999;
  assert v_groups = 52, format('Scenario D FAILED: expected 52 distinct unit_numbers, got %s', v_groups);

  -- Position-grouping query, mirroring get_current_position's core
  -- query shape but scoped to the sentinel level (a real child would
  -- only reach level 999 after completing real Levels 1-3, which is
  -- out of scope for this stress check). child_d has zero
  -- child_progress rows, so every (999, unit) group is "incomplete".
  select gp.level_number, gp.unit_number into v_pos_level, v_pos_unit
  from (
    select lm.level_number, lm.unit_number
    from level_missions lm
    left join child_progress cp
      on cp.mission_id = lm.mission_id and cp.language = v_lang and cp.child_id = v_child_d
    where lm.level_number = 999
      and level_slot_available(lm.mission_id, lm.category_slug, v_lang)
    group by lm.level_number, lm.unit_number
    having count(*) > count(cp.mission_id)
    order by lm.level_number, lm.unit_number
    limit 1
  ) gp;

  assert v_pos_level = 999 and v_pos_unit = 1,
    format('Scenario D FAILED: sentinel position-grouping query = (%s,%s), expected (999,1)', v_pos_level, v_pos_unit);

  raise notice 'SCENARIO D (52-unit stress seed) PASSED: 416 rows / 52 units inserted under the new 3-column PK, grouping query picks (999,1)';


  -- ════════════════════════════════════════════════════════
  -- Cleanup
  -- ════════════════════════════════════════════════════════
  delete from level_missions where level_number = 999;
  delete from children where id in (v_child_a, v_child_b, v_child_d);
  delete from missions where id = any(v_u2_mission_ids);

  raise notice 'ALL PHASE BK.2 SCENARIOS PASSED';
end $$;
