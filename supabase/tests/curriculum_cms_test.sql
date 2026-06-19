-- ============================================================
--  Phase BG — Curriculum Content Management System
--  automated test suite
--
--  Covers:
--    1. Level CRUD (add level, edit a cell, delete level)
--    2. Bulk import — valid batch creates missions+versions as drafts
--    3. Bulk import — duplicate (category_slug,sequence,language)
--       within one batch is rejected, nothing persisted
--    4. Bulk import — unknown category_slug is rejected, nothing
--       persisted
--    5. Bulk import — re-importing an existing (mission,lang) updates
--       content only, preserving status/published
--    6. Content workflow — draft/review/published/archived transitions
--       sync `published` correctly (migration 028 trigger)
--    7. Regression spot-check — get_curriculum_missions /
--       complete_curriculum_mission behave unchanged (migration 027
--       no-skip guard still intact)
--
--  Self-contained and side-effect-free: all test rows use category
--  "discovery" with throwaway sequence numbers 9001-9004, and a
--  throwaway test child under an existing parent. Everything created
--  is deleted at the end (or never persisted, for the rejected-batch
--  scenarios). If any assertion fails, the whole transaction rolls
--  back automatically.
--
--  Run:
--    supabase db query --linked --file supabase/tests/curriculum_cms_test.sql
--
--  Requires an existing admin row (used to satisfy is_admin() for
--  admin_bulk_import_missions) and an existing parent row (edit
--  v_parent_id below if it no longer exists).
-- ============================================================

do $$
declare
  v_admin_id        uuid;
  v_parent_id       uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059'; -- existing parent
  v_child_id        uuid;
  v_lang            text := 'en';

  v_max_level       integer;
  v_new_level       integer;
  v_morning_l1      uuid;
  v_morning_l2      uuid;
  v_cat             text;
  v_mission_id      uuid;
  v_count           integer;

  v_result          jsonb;
  v_threw           boolean;
  v_mission_9001    uuid;
  v_mission_9002    uuid;
  v_version_status  text;
  v_version_pub     boolean;
  v_version_title   text;
  v_orig_current    boolean;
  v_new_title       text;
  v_new_subtitle    text;
  v_new_status      text;
  v_new_pub         boolean;
  v_new_current     boolean;
  v_new_revnum      integer;

  v_level           integer;
  v_total           integer;
  v_done            integer;
begin
  -- ── Setup: simulate an admin session for is_admin() ──
  select id into v_admin_id from admins order by created_at limit 1;
  assert v_admin_id is not null, 'SETUP FAILED: no rows in admins table';
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  -- ════════════════════════════════════════════════════════
  -- Scenario 1: Level CRUD (add level, edit cell, delete level)
  -- ════════════════════════════════════════════════════════
  select max(level_number) into v_max_level from level_missions;
  v_new_level := v_max_level + 1;

  for v_cat in select slug from categories order by sort_order loop
    select mission_id into v_mission_id from level_missions where level_number = 1 and category_slug = v_cat;
    insert into level_missions (level_number, category_slug, mission_id) values (v_new_level, v_cat, v_mission_id);
  end loop;

  select count(*) into v_count from level_missions where level_number = v_new_level;
  assert v_count = 8, format('Scenario 1 FAILED: expected 8 rows for new level %s, got %s', v_new_level, v_count);

  -- Edit one cell (morning) to point at level 2's morning mission
  select mission_id into v_morning_l1 from level_missions where level_number = v_new_level and category_slug = 'morning';
  select mission_id into v_morning_l2 from level_missions where level_number = 2 and category_slug = 'morning';
  update level_missions set mission_id = v_morning_l2 where level_number = v_new_level and category_slug = 'morning';

  select mission_id into v_mission_id from level_missions where level_number = v_new_level and category_slug = 'morning';
  assert v_mission_id = v_morning_l2, 'Scenario 1 FAILED: cell edit did not persist';
  assert v_mission_id is distinct from v_morning_l1, 'Scenario 1 FAILED: cell edit did not change the mission';

  -- Delete the level
  delete from level_missions where level_number = v_new_level;
  select count(*) into v_count from level_missions where level_number = v_new_level;
  assert v_count = 0, format('Scenario 1 FAILED: expected 0 rows after delete, got %s', v_count);

  raise notice 'Scenario 1 PASSED: add level (8 rows), edit cell, delete level';

  -- ════════════════════════════════════════════════════════
  -- Scenario 2: Bulk import — valid batch creates drafts
  -- ════════════════════════════════════════════════════════
  v_result := admin_bulk_import_missions(jsonb_build_array(
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9001, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'en', 'title', 'Test Discovery EN', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb),
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9001, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'fr', 'title', 'Test Discovery FR', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb),
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9001, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'rw', 'title', 'Test Discovery RW', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb),
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9002, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'en', 'title', 'Test Discovery 2 EN', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb),
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9002, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'fr', 'title', 'Test Discovery 2 FR', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb),
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9002, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'rw', 'title', 'Test Discovery 2 RW', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb)
  ));

  assert (v_result->>'missions_created')::int = 2, format('Scenario 2 FAILED: missions_created = %s, expected 2', v_result->>'missions_created');
  assert (v_result->>'versions_created')::int = 6, format('Scenario 2 FAILED: versions_created = %s, expected 6', v_result->>'versions_created');
  assert (v_result->>'versions_updated')::int = 0, format('Scenario 2 FAILED: versions_updated = %s, expected 0', v_result->>'versions_updated');

  select id into v_mission_9001 from missions where category_slug = 'discovery' and sequence = 9001;
  select id into v_mission_9002 from missions where category_slug = 'discovery' and sequence = 9002;
  assert v_mission_9001 is not null and v_mission_9002 is not null, 'Scenario 2 FAILED: new missions not found';

  select count(*) into v_count from missions where id in (v_mission_9001, v_mission_9002) and active = false;
  assert v_count = 2, 'Scenario 2 FAILED: new missions should be inactive';

  select count(*) into v_count from mission_versions where mission_id in (v_mission_9001, v_mission_9002) and status = 'draft' and published = false;
  assert v_count = 6, format('Scenario 2 FAILED: expected 6 draft/unpublished versions, got %s', v_count);

  raise notice 'Scenario 2 PASSED: bulk import created 2 missions x 3 languages as drafts';

  -- ════════════════════════════════════════════════════════
  -- Scenario 3: Bulk import — duplicate row in batch rejected
  -- ════════════════════════════════════════════════════════
  v_threw := false;
  begin
    perform admin_bulk_import_missions(jsonb_build_array(
      jsonb_build_object('category_slug', 'discovery', 'sequence', 9003, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'en', 'title', 'Dup A', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb),
      jsonb_build_object('category_slug', 'discovery', 'sequence', 9003, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'en', 'title', 'Dup B', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb)
    ));
  exception when others then
    v_threw := true;
    assert sqlerrm like '%duplicate%', format('Scenario 3 FAILED: unexpected error: %s', sqlerrm);
  end;
  assert v_threw, 'Scenario 3 FAILED: duplicate-in-batch did not raise';

  select count(*) into v_count from missions where category_slug = 'discovery' and sequence = 9003;
  assert v_count = 0, 'Scenario 3 FAILED: rejected batch left a mission behind';

  raise notice 'Scenario 3 PASSED: duplicate (category_slug,sequence,language) in one batch rejected, nothing persisted';

  -- ════════════════════════════════════════════════════════
  -- Scenario 4: Bulk import — unknown category_slug rejected
  -- ════════════════════════════════════════════════════════
  v_threw := false;
  begin
    perform admin_bulk_import_missions(jsonb_build_array(
      jsonb_build_object('category_slug', 'no_such_category', 'sequence', 9004, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'en', 'title', 'Bad Category', 'subtitle', null, 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb)
    ));
  exception when others then
    v_threw := true;
    assert sqlerrm like '%category_slug%', format('Scenario 4 FAILED: unexpected error: %s', sqlerrm);
  end;
  assert v_threw, 'Scenario 4 FAILED: unknown category_slug did not raise';

  select count(*) into v_count from missions where sequence = 9004;
  assert v_count = 0, 'Scenario 4 FAILED: rejected batch left a mission behind';

  raise notice 'Scenario 4 PASSED: unknown category_slug rejected, nothing persisted';

  -- ════════════════════════════════════════════════════════
  -- Scenario 5: Re-importing a published version creates a new
  -- draft revision instead of editing it live (migration 037,
  -- Goal 2 — "prevent live editing of published content" applies
  -- to bulk import too)
  -- ════════════════════════════════════════════════════════
  -- Simulate the 9001/en version having already been reviewed & published
  update mission_versions set status = 'published' where mission_id = v_mission_9001 and language = 'en';

  v_result := admin_bulk_import_missions(jsonb_build_array(
    jsonb_build_object('category_slug', 'discovery', 'sequence', 9001, 'type', 'read', 'stars', 10, 'duration_minutes', 10, 'language', 'en', 'title', 'Test Discovery EN (edited)', 'subtitle', 'updated subtitle', 'tip_text', null, 'media_url', null, 'content_json', '{}'::jsonb)
  ));

  assert (v_result->>'missions_created')::int = 0, format('Scenario 5 FAILED: missions_created = %s, expected 0', v_result->>'missions_created');
  assert (v_result->>'versions_created')::int = 0, format('Scenario 5 FAILED: versions_created = %s, expected 0', v_result->>'versions_created');
  assert (v_result->>'versions_updated')::int = 0, format('Scenario 5 FAILED: versions_updated = %s, expected 0', v_result->>'versions_updated');
  assert (v_result->>'revisions_created')::int = 1, format('Scenario 5 FAILED: revisions_created = %s, expected 1', v_result->>'revisions_created');

  -- Original published revision (rev 1) is untouched, just demoted to is_current=false
  select title, status, published, is_current into v_version_title, v_version_status, v_version_pub, v_orig_current
    from mission_versions where mission_id = v_mission_9001 and language = 'en' and revision_number = 1;
  assert v_version_title = 'Test Discovery EN', format('Scenario 5 FAILED: original title changed to "%s"', v_version_title);
  assert v_version_status = 'published', format('Scenario 5 FAILED: original status changed to "%s", expected "published"', v_version_status);
  assert v_version_pub = true, 'Scenario 5 FAILED: original published should remain true';
  assert v_orig_current = false, 'Scenario 5 FAILED: original revision should no longer be is_current';

  -- New draft revision (rev 2) holds the imported content and is now current
  select title, subtitle, status, published, is_current, revision_number
    into v_new_title, v_new_subtitle, v_new_status, v_new_pub, v_new_current, v_new_revnum
    from mission_versions where mission_id = v_mission_9001 and language = 'en' and is_current = true;
  assert v_new_title = 'Test Discovery EN (edited)', format('Scenario 5 FAILED: new revision title = "%s"', v_new_title);
  assert v_new_subtitle = 'updated subtitle', format('Scenario 5 FAILED: new revision subtitle = "%s"', v_new_subtitle);
  assert v_new_status = 'draft', format('Scenario 5 FAILED: new revision status = "%s", expected "draft"', v_new_status);
  assert v_new_pub = false, 'Scenario 5 FAILED: new revision published should be false';
  assert v_new_revnum = 2, format('Scenario 5 FAILED: new revision_number = %s, expected 2', v_new_revnum);

  raise notice 'Scenario 5 PASSED: re-importing over a published version created a new draft revision (rev 2), leaving published rev 1 untouched';

  -- ════════════════════════════════════════════════════════
  -- Scenario 6: Content workflow draft -> review -> published -> archived
  -- ════════════════════════════════════════════════════════
  -- Use the 9002/fr version, created as 'draft' in Scenario 2
  select status, published into v_version_status, v_version_pub
    from mission_versions where mission_id = v_mission_9002 and language = 'fr';
  assert v_version_status = 'draft' and v_version_pub = false, 'Scenario 6 FAILED: precondition - expected draft/false';

  update mission_versions set status = 'review' where mission_id = v_mission_9002 and language = 'fr';
  select published into v_version_pub from mission_versions where mission_id = v_mission_9002 and language = 'fr';
  assert v_version_pub = false, 'Scenario 6 FAILED: review should yield published=false';

  update mission_versions set status = 'published' where mission_id = v_mission_9002 and language = 'fr';
  select published into v_version_pub from mission_versions where mission_id = v_mission_9002 and language = 'fr';
  assert v_version_pub = true, 'Scenario 6 FAILED: published should yield published=true';

  update mission_versions set status = 'archived' where mission_id = v_mission_9002 and language = 'fr';
  select published into v_version_pub from mission_versions where mission_id = v_mission_9002 and language = 'fr';
  assert v_version_pub = false, 'Scenario 6 FAILED: archived should yield published=false';

  raise notice 'Scenario 6 PASSED: draft/review/published/archived sync published to false/false/true/false';

  -- ════════════════════════════════════════════════════════
  -- Scenario 7: Regression spot-check — curriculum RPCs unchanged
  -- ════════════════════════════════════════════════════════
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);

  insert into children (parent_id, name, language)
  values (v_parent_id, '__phase_bg_test_child__', v_lang)
  returning id into v_child_id;

  v_level := get_current_level(v_child_id, v_lang);
  assert v_level = 1, format('Scenario 7 FAILED: new child level = %s, expected 1', v_level);

  select count(*), count(*) filter (where completed) into v_total, v_done
    from get_curriculum_missions(v_child_id);
  assert v_total = 8, format('Scenario 7 FAILED: expected 8 curriculum missions, got %s', v_total);
  assert v_done = 0, format('Scenario 7 FAILED: expected 0 completed missions, got %s', v_done);

  select mission_id into v_mission_id from level_missions where level_number = 1 and category_slug = 'morning';
  v_result := complete_curriculum_mission(v_child_id, v_mission_id);
  assert (v_result->>'level')::int = 1, format('Scenario 7 FAILED: level after 1/8 = %s, expected 1', v_result->>'level');

  select count(*) filter (where completed) into v_done from get_curriculum_missions(v_child_id);
  assert v_done = 1, format('Scenario 7 FAILED: expected 1 completed mission, got %s', v_done);

  -- Future-level mission still rejected (migration 027 no-skip guard)
  select mission_id into v_mission_id from level_missions where level_number = 3 and category_slug = 'morning';
  v_threw := false;
  begin
    perform complete_curriculum_mission(v_child_id, v_mission_id);
  exception when others then
    v_threw := true;
    assert sqlerrm = 'mission not in current level', format('Scenario 7 FAILED: unexpected error: %s', sqlerrm);
  end;
  assert v_threw, 'Scenario 7 FAILED: future-level mission did not raise';

  delete from children where id = v_child_id;

  raise notice 'Scenario 7 PASSED: get_curriculum_missions / complete_curriculum_mission / no-skip guard unchanged';

  -- ════════════════════════════════════════════════════════
  -- Cleanup: remove all Scenario 2/5/6 test missions+versions
  -- (cascades to mission_versions via FK on delete cascade)
  -- ════════════════════════════════════════════════════════
  delete from missions where id in (v_mission_9001, v_mission_9002);

  select count(*) into v_count from missions where category_slug = 'discovery' and sequence in (9001, 9002, 9003, 9004);
  assert v_count = 0, 'CLEANUP FAILED: test missions still present';

  raise notice 'ALL PHASE BG CMS SCENARIOS PASSED';
end $$;
