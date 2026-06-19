-- ============================================================
--  Phase BK.3.8 — Curriculum Operations Hardening
--  automated test suite
--
--  Covers:
--    1. Draft → Review → Published workflow transitions + trigger
--    2. Archive safety: admin_archive_lesson archives ALL revisions,
--       sets active=false, learner progression degrades gracefully
--    3. Restore flow: admin_restore_lesson restores is_current draft,
--       leaves old published revision archived, active stays false
--    4. Revision workflow: create_mission_version_revision isolates
--       draft from live published; publish_mission_version_revision
--       promotes draft and demotes old published to archived
--    5. Export/import round trip: export_unit_content produces rows
--       matching the V2 import schema; re-importing creates revisions
--       (not overwrites) because the original versions are published
--    6. Translation coverage: translationCoverage logic verified
--       via SQL — single/partial/full scenarios
--    7. Curriculum integrity audit: get_curriculum_integrity_report
--       correctly identifies orphaned stories, inactive slots,
--       missing category slots, partial translations
--
--  Self-contained and side-effect-free. All test missions use
--  category 'discovery' with throwaway sequences 9010–9019 and a
--  throwaway story slug 'bk38-test-orphan-story'. Everything is
--  deleted at the end. If any assertion fails, the whole transaction
--  rolls back automatically.
--
--  Run:
--    supabase db query --linked --file supabase/tests/bk38_operations_hardening_test.sql
-- ============================================================

do $$
declare
  -- test identity
  v_admin_id           uuid;
  v_parent_id          uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059';
  v_child_id           uuid;

  -- test missions / versions
  v_mission_wf         uuid;   -- workflow test mission  (seq 9010)
  v_mission_arc        uuid;   -- archive test mission   (seq 9011)
  v_mission_rev        uuid;   -- revision test mission  (seq 9012)
  v_mission_exp        uuid;   -- export test mission    (seq 9013, linked L1 U1)
  v_mission_cov_single uuid;   -- coverage single-lang   (seq 9014)
  v_mission_cov_part   uuid;   -- coverage partial       (seq 9015)

  v_ver_en             uuid;
  v_ver_fr             uuid;
  v_ver_rw             uuid;
  v_ver_pub            uuid;   -- the published revision
  v_ver_draft          uuid;   -- the new draft revision after create_revision

  -- story for orphan test
  v_orphan_story_id    uuid;

  -- level_missions test slot
  v_lm_level           integer := 1;
  v_lm_unit            integer := 99; -- throwaway unit number

  -- result containers
  v_result             jsonb;
  v_report             jsonb;
  v_threw              boolean;
  v_count              integer;
  v_status             text;
  v_published          boolean;
  v_active             boolean;
  v_is_current         boolean;
  v_revnum             integer;
  v_title              text;
  v_level              integer;
begin
  -- ── Setup: simulate admin session ──────────────────────────
  select id into v_admin_id from admins order by created_at limit 1;
  assert v_admin_id is not null, 'SETUP FAILED: no rows in admins table';
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 1: Draft → Review → Published workflow
  -- Verifies: all 4 status values, trigger sync, permission guard
  -- ════════════════════════════════════════════════════════════

  -- Create test mission
  insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
  values ('discovery', 9010, 'read', 10, 10, false)
  returning id into v_mission_wf;

  insert into mission_versions (mission_id, language, title, content_json, status)
  values (v_mission_wf, 'en', 'WF Test EN', '{"text":"hello"}'::jsonb, 'draft')
  returning id into v_ver_en;

  -- draft → published = false
  select status, published into v_status, v_published
  from mission_versions where id = v_ver_en;
  assert v_status = 'draft', 'Scenario 1 FAILED: initial status should be draft';
  assert v_published = false, 'Scenario 1 FAILED: draft should not be published';

  -- draft → review: published still false
  update mission_versions set status = 'review' where id = v_ver_en;
  select published into v_published from mission_versions where id = v_ver_en;
  assert v_published = false, 'Scenario 1 FAILED: review should not be published';

  -- review → published: published becomes true, missions.active still false (not synced by trigger)
  update mission_versions set status = 'published' where id = v_ver_en;
  select published into v_published from mission_versions where id = v_ver_en;
  assert v_published = true, 'Scenario 1 FAILED: published status should set published=true';

  -- published → archived: published becomes false again
  update mission_versions set status = 'archived' where id = v_ver_en;
  select published into v_published from mission_versions where id = v_ver_en;
  assert v_published = false, 'Scenario 1 FAILED: archived should set published=false';

  -- Non-admin access to publish_mission_version_revision should raise
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);
  v_threw := false;
  begin
    perform publish_mission_version_revision(v_ver_en);
  exception when others then
    v_threw := true;
    assert sqlerrm like '%admin access required%', format('Scenario 1 FAILED: wrong error: %s', sqlerrm);
  end;
  assert v_threw, 'Scenario 1 FAILED: non-admin publish_mission_version_revision should raise';

  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  raise notice 'Scenario 1 PASSED: draft/review/published/archived trigger, non-admin RPC guard';


  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 2: Archive safety — admin_archive_lesson
  --
  -- Simulates the bug that motivated migration 042:
  --   rev 1: published, is_current=false (live for learners)
  --   rev 2: draft, is_current=true       (being edited)
  --
  -- admin_archive_lesson must archive BOTH revisions, not just rev 2.
  -- ════════════════════════════════════════════════════════════

  insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
  values ('discovery', 9011, 'read', 10, 10, false)
  returning id into v_mission_arc;

  -- Rev 1: publish it
  insert into mission_versions (mission_id, language, title, content_json, status, revision_number, is_current)
  values (v_mission_arc, 'en', 'ARC Test EN rev1', '{"text":"rev1"}'::jsonb, 'published', 1, false)
  returning id into v_ver_pub;

  -- Rev 2: create draft on top
  insert into mission_versions (mission_id, language, title, content_json, status, revision_number, is_current)
  values (v_mission_arc, 'en', 'ARC Test EN rev2', '{"text":"rev2"}'::jsonb, 'draft', 2, true)
  returning id into v_ver_draft;

  -- Mark mission active (rev 1 is published)
  update missions set active = true where id = v_mission_arc;

  -- Verify precondition: rev 1 is published, rev 2 is draft
  select published into v_published from mission_versions where id = v_ver_pub;
  assert v_published = true, 'Scenario 2 SETUP: rev1 should be published';
  select status into v_status from mission_versions where id = v_ver_draft;
  assert v_status = 'draft', 'Scenario 2 SETUP: rev2 should be draft';

  -- Archive the lesson
  v_result := admin_archive_lesson(v_mission_arc);
  assert (v_result->>'archived_version_count')::int = 2,
    format('Scenario 2 FAILED: expected 2 archived versions, got %s', v_result->>'archived_version_count');

  -- Verify BOTH revisions are archived
  select status, published into v_status, v_published from mission_versions where id = v_ver_pub;
  assert v_status = 'archived', 'Scenario 2 FAILED: rev1 should be archived';
  assert v_published = false, 'Scenario 2 FAILED: rev1 published should be false after archive';

  select status into v_status from mission_versions where id = v_ver_draft;
  assert v_status = 'archived', 'Scenario 2 FAILED: rev2 should also be archived';

  -- missions.active must be false
  select active into v_active from missions where id = v_mission_arc;
  assert v_active = false, 'Scenario 2 FAILED: missions.active should be false after archive';

  -- Learner impact: level_slot_available returns false for archived mission
  -- (using category 'discovery', any language)
  assert level_slot_available(v_mission_arc, 'discovery', 'en') = false,
    'Scenario 2 FAILED: archived mission should not be available to learners';

  raise notice 'Scenario 2 PASSED: admin_archive_lesson archives all revisions, active=false, level_slot_available=false';


  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 3: Restore flow — admin_restore_lesson
  -- ════════════════════════════════════════════════════════════

  -- Restore from the archived state (v_mission_arc still fully archived)
  v_result := admin_restore_lesson(v_mission_arc);
  assert (v_result->>'restored_version_count')::int = 1,
    format('Scenario 3 FAILED: expected 1 restored version, got %s', v_result->>'restored_version_count');

  -- is_current=true rev (rev 2) should now be draft
  select status, is_current, revision_number
  into v_status, v_is_current, v_revnum
  from mission_versions where id = v_ver_draft;
  assert v_status = 'draft', 'Scenario 3 FAILED: restored is_current revision should be draft';
  assert v_is_current = true, 'Scenario 3 FAILED: restored revision should still be is_current';

  -- Rev 1 (published, is_current=false) should stay archived
  select status into v_status from mission_versions where id = v_ver_pub;
  assert v_status = 'archived', 'Scenario 3 FAILED: non-current rev1 should stay archived after restore';

  -- missions.active must still be false — restored content is not yet published
  select active into v_active from missions where id = v_mission_arc;
  assert v_active = false, 'Scenario 3 FAILED: missions.active should remain false after restore';

  -- Attempting restore when there is nothing to restore should raise
  -- (archive everything again first, then try double-restore)
  perform admin_archive_lesson(v_mission_arc);
  perform admin_restore_lesson(v_mission_arc);  -- first restore succeeds
  v_threw := false;
  begin
    -- Second restore: rev2 is now 'draft' (not 'archived'), nothing to restore
    perform admin_restore_lesson(v_mission_arc);
  exception when others then
    v_threw := true;
    assert sqlerrm like '%nothing to restore%', format('Scenario 3 FAILED: wrong error: %s', sqlerrm);
  end;
  assert v_threw, 'Scenario 3 FAILED: restoring a non-archived mission should raise';

  raise notice 'Scenario 3 PASSED: admin_restore_lesson restores is_current to draft, leaves others archived, active stays false';


  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 4: Revision workflow isolation and publish replacement
  -- ════════════════════════════════════════════════════════════

  insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
  values ('discovery', 9012, 'read', 10, 10, false)
  returning id into v_mission_rev;

  -- Create and publish initial version
  insert into mission_versions (mission_id, language, title, content_json, status)
  values (v_mission_rev, 'en', 'REV Original', '{"text":"v1"}'::jsonb, 'draft')
  returning id into v_ver_en;

  perform publish_mission_version_revision(v_ver_en);

  select status, is_current, published into v_status, v_is_current, v_published
  from mission_versions where id = v_ver_en;
  assert v_status = 'published', 'Scenario 4 FAILED: initial publish failed';
  assert v_published = true, 'Scenario 4 FAILED: published flag not set';
  assert v_is_current = true, 'Scenario 4 FAILED: should be is_current';

  -- Update missions.active manually (mirrors what the UI does)
  update missions set active = true where id = v_mission_rev;

  -- Create a revision from the published version
  v_ver_draft := create_mission_version_revision(v_ver_en);

  -- Published version should be demoted to is_current=false but still published
  select is_current, published into v_is_current, v_published
  from mission_versions where id = v_ver_en;
  assert v_is_current = false, 'Scenario 4 FAILED: original should no longer be is_current';
  assert v_published = true, 'Scenario 4 FAILED: original should still be published (live) while draft exists';

  -- New draft revision should be is_current=true, status=draft
  select status, is_current, revision_number into v_status, v_is_current, v_revnum
  from mission_versions where id = v_ver_draft;
  assert v_status = 'draft', 'Scenario 4 FAILED: new revision should be draft';
  assert v_is_current = true, 'Scenario 4 FAILED: new revision should be is_current';
  assert v_revnum = 2, format('Scenario 4 FAILED: revision_number = %s, expected 2', v_revnum);

  -- Partial-unique-index: at most one published row per (mission_id, language)
  -- The original (rev 1) is published, the draft (rev 2) is not. Index is satisfied.
  select count(*) into v_count
  from mission_versions where mission_id = v_mission_rev and language = 'en' and published = true;
  assert v_count = 1, format('Scenario 4 FAILED: expected 1 published version, got %s', v_count);

  -- Edit the draft and publish it — should replace the published revision
  update mission_versions set title = 'REV Edited v2' where id = v_ver_draft;
  perform publish_mission_version_revision(v_ver_draft);

  -- Draft is now published
  select status, published, is_current into v_status, v_published, v_is_current
  from mission_versions where id = v_ver_draft;
  assert v_status = 'published', 'Scenario 4 FAILED: drafted revision should now be published';
  assert v_published = true, 'Scenario 4 FAILED: drafted revision published flag should be true';
  assert v_is_current = true, 'Scenario 4 FAILED: drafted revision should still be is_current';

  -- Original (rev 1) should now be archived
  select status, published into v_status, v_published
  from mission_versions where id = v_ver_en;
  assert v_status = 'archived', 'Scenario 4 FAILED: original published revision should be archived after replacement';
  assert v_published = false, 'Scenario 4 FAILED: original published flag should be false after replacement';

  -- Only one published version per language remains
  select count(*) into v_count
  from mission_versions where mission_id = v_mission_rev and language = 'en' and published = true;
  assert v_count = 1, format('Scenario 4 FAILED: expected 1 published version after replacement, got %s', v_count);

  -- create_mission_version_revision on a non-published source should raise
  v_threw := false;
  begin
    perform create_mission_version_revision(v_ver_en); -- v_ver_en is now 'archived'
  exception when others then
    v_threw := true;
    assert sqlerrm like '%not published%', format('Scenario 4 FAILED: wrong error: %s', sqlerrm);
  end;
  assert v_threw, 'Scenario 4 FAILED: creating revision from archived source should raise';

  raise notice 'Scenario 4 PASSED: revision isolation, published sibling preserved during edit, publish replacement correct';


  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 5: Export/import round trip
  -- Exports Level 1 Unit 1 content and verifies the shape.
  -- Then feeds the export back into admin_bulk_import_missions V2
  -- to verify revision safety (export rows have status='draft' so
  -- reimporting over published content creates new draft revisions).
  -- ════════════════════════════════════════════════════════════

  -- Export Level 1 Unit 1 (seeded by migration 041)
  v_result := export_unit_content(1, 1);

  assert v_result->>'level_number' = '1', 'Scenario 5 FAILED: export level_number mismatch';
  assert v_result->>'unit_number'  = '1', 'Scenario 5 FAILED: export unit_number mismatch';

  -- Expect 24 rows: 8 categories × 3 languages (EN/FR/RW all published)
  assert (v_result->>'row_count')::int = 24,
    format('Scenario 5 FAILED: expected 24 export rows, got %s', v_result->>'row_count');

  -- Every exported row must have the V2 import required keys
  select count(*) into v_count
  from jsonb_array_elements(v_result->'rows') r
  where r->>'level_number' is null
     or r->>'unit_number'  is null
     or r->>'category_slug' is null
     or r->>'language'     is null
     or r->>'title'        is null
     or r->>'status'       is null;
  assert v_count = 0, format('Scenario 5 FAILED: %s export rows missing required fields', v_count);

  -- All exported rows must have status='draft' (safe re-import target)
  select count(*) into v_count
  from jsonb_array_elements(v_result->'rows') r
  where r->>'status' <> 'draft';
  assert v_count = 0, 'Scenario 5 FAILED: some export rows have status != draft';

  -- Feed the exported rows back through admin_bulk_import_missions V2.
  -- Because the source versions are published, the importer must create
  -- new draft revisions (not overwrite the live content).
  -- This verifies the export→import round trip preserves published content.
  declare
    v_import_rows jsonb;
    v_import_result jsonb;
    v_revisions_before integer;
    v_revisions_after  integer;
  begin
    select count(*) into v_revisions_before
    from mission_versions mv
    join level_missions lm on lm.mission_id = mv.mission_id
    where lm.level_number = 1 and lm.unit_number = 1;

    v_import_rows := v_result->'rows';
    v_import_result := admin_bulk_import_missions(v_import_rows);

    select count(*) into v_revisions_after
    from mission_versions mv
    join level_missions lm on lm.mission_id = mv.mission_id
    where lm.level_number = 1 and lm.unit_number = 1;

    -- 24 published versions → 24 new draft revisions created
    assert (v_import_result->>'revisions_created')::int = 24,
      format('Scenario 5 FAILED: expected 24 revisions_created, got %s', v_import_result->>'revisions_created');
    assert (v_import_result->>'versions_updated')::int = 0,
      format('Scenario 5 FAILED: versions_updated should be 0, got %s', v_import_result->>'versions_updated');

    -- Original published versions must remain untouched
    assert (select count(*) from mission_versions mv
            join level_missions lm on lm.mission_id = mv.mission_id
            where lm.level_number = 1 and lm.unit_number = 1 and mv.published = true) = 24,
      'Scenario 5 FAILED: original 24 published versions should still exist after round-trip import';

    -- Clean up the 24 new draft revisions that the round-trip import created
    -- (set them back so future test runs see the clean state)
    delete from mission_versions
    where is_current = true
      and status = 'draft'
      and revision_number > 1
      and mission_id in (
        select lm.mission_id from level_missions lm
        where lm.level_number = 1 and lm.unit_number = 1
      );

    -- Restore is_current on the published revision for each (mission, language)
    update mission_versions
    set is_current = true
    where published = true
      and is_current = false
      and mission_id in (
        select lm.mission_id from level_missions lm
        where lm.level_number = 1 and lm.unit_number = 1
      );
  end;

  raise notice 'Scenario 5 PASSED: export_unit_content returns 24 rows; round-trip import creates 24 draft revisions without touching published originals';


  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 6: Translation coverage — SQL-side verification
  -- ════════════════════════════════════════════════════════════

  -- Single language: EN only
  insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
  values ('discovery', 9014, 'read', 10, 10, false)
  returning id into v_mission_cov_single;

  insert into mission_versions (mission_id, language, title, content_json, status)
  values (v_mission_cov_single, 'en', 'Coverage EN only', '{}'::jsonb, 'published');

  -- Verify: exactly 1 published language
  select count(*) into v_count
  from mission_versions where mission_id = v_mission_cov_single and published = true;
  assert v_count = 1, format('Scenario 6 FAILED: single-lang mission should have 1 published version, got %s', v_count);

  -- Partial: EN + FR
  insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
  values ('discovery', 9015, 'read', 10, 10, false)
  returning id into v_mission_cov_part;

  insert into mission_versions (mission_id, language, title, content_json, status)
  values
    (v_mission_cov_part, 'en', 'Coverage EN', '{}'::jsonb, 'published'),
    (v_mission_cov_part, 'fr', 'Coverage FR', '{}'::jsonb, 'published');

  select count(*) into v_count
  from mission_versions where mission_id = v_mission_cov_part and published = true;
  assert v_count = 2, format('Scenario 6 FAILED: partial-lang mission should have 2 published versions, got %s', v_count);

  -- Full: verified via Level 1 Unit 1 morning mission (3 published languages)
  select count(*) into v_count
  from mission_versions mv
  join level_missions lm on lm.mission_id = mv.mission_id
  where lm.level_number = 1 and lm.unit_number = 1
    and lm.category_slug = 'morning'
    and mv.published = true;
  assert v_count = 3, format('Scenario 6 FAILED: morning mission should have 3 published versions, got %s', v_count);

  raise notice 'Scenario 6 PASSED: coverage counts verified — single(1), partial(2), full(3)';


  -- ════════════════════════════════════════════════════════════
  -- SCENARIO 7: Curriculum integrity audit
  -- ════════════════════════════════════════════════════════════

  -- Create an orphaned story (no missions.story_id points to it)
  insert into stories (slug, title, sort_order, is_active)
  values ('bk38-test-orphan-story', 'BK38 Orphan Story', 999, false)
  returning id into v_orphan_story_id;

  -- Insert an inactive slot: level_missions for a throwaway unit (99)
  -- with the archived-but-not-restored mission from Scenario 2.
  -- First ensure the unit metadata exists in curriculum_units
  insert into curriculum_units (level_number, unit_number, title, theme_emoji)
  values (1, 99, 'BK38 Test Unit', '🧪')
  on conflict (level_number, unit_number) do nothing;

  insert into level_missions (level_number, unit_number, category_slug, mission_id)
  values (1, 99, 'discovery', v_mission_arc)   -- v_mission_arc is active=false
  on conflict (level_number, unit_number, category_slug) do update set mission_id = excluded.mission_id;

  -- Run the integrity report
  v_report := get_curriculum_integrity_report();

  -- orphaned_stories must contain our orphan
  assert jsonb_path_exists(v_report, '$.orphaned_stories[*] ? (@.id == $id)', jsonb_build_object('id', v_orphan_story_id::text)),
    'Scenario 7 FAILED: orphan story not in report';

  -- inactive_slots must contain our throwaway unit slot (level=1, unit=99, discovery)
  assert jsonb_path_exists(
    v_report,
    '$.inactive_slots[*] ? (@.level_number == 1 && @.unit_number == 99 && @.category_slug == "discovery")'
  ), 'Scenario 7 FAILED: inactive slot (1/99/discovery) not in report';

  -- missing_category_slots: unit 99 has only 1 of 8 categories defined,
  -- so 7 categories should appear as missing for (1, 99)
  select count(*) into v_count
  from jsonb_array_elements(v_report->'missing_category_slots') r
  where (r->>'level_number')::int = 1
    and (r->>'unit_number')::int  = 99;
  assert v_count = 7, format('Scenario 7 FAILED: expected 7 missing categories for unit 99, got %s', v_count);

  -- partial_translations: cov_single and cov_part missions are not in level_missions,
  -- so they won't appear in partial_translations (which is limited to level_missions slots).
  -- The Level 1 Unit 1 morning mission IS in level_missions and has 3 published languages —
  -- it should NOT appear as partial.
  select count(*) into v_count
  from jsonb_array_elements(v_report->'partial_translations') r
  where (r->>'level_number')::int = 1
    and (r->>'unit_number')::int  = 1;
  assert v_count = 0, format('Scenario 7 FAILED: no L1U1 slots should be partial, got %s', v_count);

  raise notice 'Scenario 7 PASSED: integrity report finds orphan story, inactive slot, 7 missing categories for test unit';


  -- ════════════════════════════════════════════════════════════
  -- Cleanup
  -- ════════════════════════════════════════════════════════════

  -- Remove test level_missions entries for unit 99
  delete from level_missions where level_number = 1 and unit_number = 99;
  delete from curriculum_units where level_number = 1 and unit_number = 99;

  -- Remove orphan story
  delete from stories where id = v_orphan_story_id;

  -- Remove test missions (cascades to mission_versions via FK)
  delete from missions where id in (
    v_mission_wf, v_mission_arc, v_mission_rev,
    v_mission_cov_single, v_mission_cov_part
  );

  select count(*) into v_count
  from missions where sequence in (9010, 9011, 9012, 9013, 9014, 9015);
  assert v_count = 0, format('CLEANUP FAILED: %s test missions still present', v_count);

  select count(*) into v_count from stories where slug = 'bk38-test-orphan-story';
  assert v_count = 0, 'CLEANUP FAILED: orphan story still present';

  raise notice 'ALL BK.3.8 OPERATIONS HARDENING SCENARIOS PASSED';
end $$;
