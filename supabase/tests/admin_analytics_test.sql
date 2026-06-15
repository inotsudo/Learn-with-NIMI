-- ============================================================
--  Phase BI — Admin Analytics & Educator Insights automated test suite
--
--  Verifies the new language_switch_log table (migration 031), which
--  backs the Language Analytics "switch frequency" metrics. Seeds a
--  throwaway test child under the existing test parent, drives it through
--  an en -> fr -> rw switch sequence (the same insert shape as
--  updateChildLanguage() in lib/queries.ts), and asserts:
--
--    1. Row count/shape (from_language/to_language/switched_at) is correct
--    2. The language check constraint rejects invalid codes
--    3. RLS policies for parent-select-own / parent-insert-own / admin-full
--       exist and reference is_my_child()/is_admin() (same convention as
--       every other per-child table since migrations 001/013)
--
--  The 5 lib/adminAnalytics.ts compute* functions are pure TypeScript and
--  are covered separately by scripts/test-admin-analytics.ts.
--
--  Self-contained and side-effect-free: deletes the test child (cascades
--  language_switch_log) at the end. If any assertion fails, the whole
--  transaction (including the test-child creation) rolls back
--  automatically — either way, no test data is left behind.
--
--  Run:
--    supabase db query --linked --file supabase/tests/admin_analytics_test.sql
--
--  Requires an existing parent row (edit v_parent_id below if the
--  referenced parent no longer exists).
-- ============================================================

do $$
declare
  v_parent_id uuid := 'f4418058-9f83-4f3c-b74c-fbaed84cc059'; -- existing test parent
  v_child_id  uuid;
  v_count     integer;
begin
  -- Simulate an authenticated parent session for is_my_child()
  perform set_config('request.jwt.claim.sub', v_parent_id::text, true);

  -- ── Setup: throwaway test child ──
  insert into children (parent_id, name, language)
  values (v_parent_id, '__phase_bi_test_child__', 'en')
  returning id into v_child_id;

  -- ================================================================
  -- Scenario 1: language_switch_log rows insert + shape
  -- ================================================================
  insert into language_switch_log (child_id, from_language, to_language) values (v_child_id, 'en', 'fr');
  insert into language_switch_log (child_id, from_language, to_language) values (v_child_id, 'fr', 'rw');

  select count(*) into v_count from language_switch_log where child_id = v_child_id;
  assert v_count = 2, format('Scenario 1 FAILED: expected 2 language_switch_log rows, got %s', v_count);

  select count(*) into v_count from language_switch_log
  where child_id = v_child_id and from_language = 'en' and to_language = 'fr' and switched_at is not null;
  assert v_count = 1, 'Scenario 1 FAILED: en->fr row missing or malformed';

  select count(*) into v_count from language_switch_log
  where child_id = v_child_id and from_language = 'fr' and to_language = 'rw' and switched_at is not null;
  assert v_count = 1, 'Scenario 1 FAILED: fr->rw row missing or malformed';

  raise notice 'Scenario 1 PASSED: 2 language_switch_log rows (en->fr, fr->rw) inserted with valid shape';

  -- ================================================================
  -- Scenario 2: check constraint rejects invalid language codes
  -- ================================================================
  begin
    insert into language_switch_log (child_id, from_language, to_language) values (v_child_id, 'en', 'xx');
    assert false, 'Scenario 2 FAILED: invalid to_language ''xx'' should have been rejected by check constraint';
  exception
    when check_violation then
      raise notice 'Scenario 2 PASSED: check constraint correctly rejects invalid language codes';
  end;

  -- ================================================================
  -- Scenario 3: RLS policies present (parent select/insert own, admin full)
  -- ================================================================
  select count(*) into v_count from pg_policies
  where tablename = 'language_switch_log' and policyname = 'parent: select own switch log'
    and qual ilike '%is_my_child%';
  assert v_count = 1, 'Scenario 3 FAILED: "parent: select own switch log" policy missing or not using is_my_child()';

  select count(*) into v_count from pg_policies
  where tablename = 'language_switch_log' and policyname = 'parent: insert own switch log'
    and with_check ilike '%is_my_child%';
  assert v_count = 1, 'Scenario 3 FAILED: "parent: insert own switch log" policy missing or not using is_my_child()';

  select count(*) into v_count from pg_policies
  where tablename = 'language_switch_log' and policyname = 'admin: full access'
    and qual ilike '%is_admin%' and with_check ilike '%is_admin%';
  assert v_count = 1, 'Scenario 3 FAILED: "admin: full access" policy missing or not using is_admin()';

  raise notice 'Scenario 3 PASSED: parent select/insert + admin full-access RLS policies present on language_switch_log';

  -- ── Cleanup ──
  delete from children where id = v_child_id;

  raise notice 'ALL PHASE BI SCENARIOS PASSED';
end $$;
