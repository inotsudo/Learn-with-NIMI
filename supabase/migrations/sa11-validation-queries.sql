-- ============================================================
--  SA-1.1 — Post-Migration Validation Queries
--
--  Run these after applying 043_story_adventure_schema.sql.
--  Every query should return the expected result shown in comments.
--  If any query fails, investigate before proceeding to SA-1.2.
-- ============================================================


-- ── 1. VERIFY TABLES CREATED ─────────────────────────────────
-- Expected: 6 rows (one per new table)

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'story_versions', 'story_slots', 'story_intro_progress',
    'weekly_challenges', 'weekly_challenge_versions',
    'weekly_challenge_progress', 'personalized_stories'
  )
order by table_name;


-- ── 2. VERIFY STORIES TABLE COLUMNS ADDED ────────────────────
-- Expected: 6 rows (status, age_min, age_max,
--   scheduled_publish_at, published_at, retired_at)

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'stories'
  and column_name in (
    'status', 'age_min', 'age_max',
    'scheduled_publish_at', 'published_at', 'retired_at'
  )
order by column_name;


-- ── 3. VERIFY CONSTRAINTS ACTIVE ─────────────────────────────
-- Expected: 4 rows (stories_status_check, stories_age_min_check,
--   stories_age_max_check, stories_age_range_check)

select constraint_name from information_schema.table_constraints
where table_name = 'stories'
  and constraint_type = 'CHECK'
  and constraint_name like 'stories_%_check'
order by constraint_name;


-- ── 4. VERIFY RLS ENABLED ON ALL NEW TABLES ──────────────────
-- Expected: 6 rows, all with rowsecurity = true

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'story_versions', 'story_slots', 'story_intro_progress',
    'weekly_challenges', 'weekly_challenge_versions',
    'weekly_challenge_progress', 'personalized_stories'
  )
order by tablename;


-- ── 5. VERIFY RLS POLICIES CREATED ───────────────────────────
-- Expected: 14 policies total across 6 tables

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'story_versions', 'story_slots', 'story_intro_progress',
    'weekly_challenges', 'weekly_challenge_versions',
    'weekly_challenge_progress', 'personalized_stories'
  )
order by tablename, policyname;


-- ── 6. VERIFY INDEXES CREATED ────────────────────────────────
-- Expected: includes idx_stories_status, idx_stories_sort_order,
--   idx_stories_scheduled_publish, plus table-level indexes

select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and (
    indexname like 'idx_stories_%'
    or tablename in (
      'story_versions', 'story_slots', 'story_intro_progress',
      'weekly_challenges', 'weekly_challenge_versions',
      'weekly_challenge_progress'
    )
  )
order by tablename, indexname;


-- ── 7. VERIFY STATUS BACKFILL ────────────────────────────────
-- Expected: 0 rows (no story should have NULL status)

select id, slug, status from stories where status is null;


-- ── 8. VERIFY is_active DERIVATION ───────────────────────────
-- Expected: 0 rows (is_active should match status='published')

select id, slug, status, is_active
from stories
where (status = 'published' and is_active = false)
   or (status <> 'published' and is_active = true);


-- ── 9. VERIFY STORY COUNT UNCHANGED ──────────────────────────
-- Run this BEFORE migration and record the count.
-- After migration, this should return the SAME count.

select count(*) as story_count from stories;


-- ── 10. VERIFY NO ORPHAN REFERENCES ──────────────────────────
-- Expected: 0 rows each

-- 10a. story_versions referencing nonexistent stories
select sv.id from story_versions sv
  left join stories s on sv.story_id = s.id
  where s.id is null;

-- 10b. story_slots referencing nonexistent missions
select ss.story_id, ss.slot_key from story_slots ss
  left join missions m on ss.mission_id = m.id
  where m.id is null;

-- 10c. story_slots referencing nonexistent stories
select ss.story_id, ss.slot_key from story_slots ss
  left join stories s on ss.story_id = s.id
  where s.id is null;


-- ── 11. VERIFY EXISTING DATA INTEGRITY ───────────────────────
-- Expected: same counts as before migration

select 'child_progress' as tbl, count(*) as cnt from child_progress
union all
select 'child_achievements', count(*) from child_achievements
union all
select 'missions', count(*) from missions
union all
select 'mission_versions', count(*) from mission_versions
union all
select 'story_pages', count(*) from story_pages
union all
select 'coloring_pages', count(*) from coloring_pages
union all
select 'coloring_saves', count(*) from coloring_saves;


-- ── 12. VERIFY TRIGGER EXISTS ────────────────────────────────
-- Expected: 1 row (stories_sync_is_active_trigger)

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_table = 'stories'
  and trigger_name = 'stories_sync_is_active_trigger';


-- ── 13. VERIFY FOREIGN KEYS ON NEW TABLES ────────────────────
-- Expected: FK constraints on all new tables

select tc.table_name, tc.constraint_name,
       kcu.column_name, ccu.table_name as foreign_table
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in (
    'story_versions', 'story_slots', 'story_intro_progress',
    'weekly_challenges', 'weekly_challenge_versions',
    'weekly_challenge_progress', 'personalized_stories'
  )
order by tc.table_name, kcu.column_name;


-- ============================================================
--  If all 13 checks pass: SA-1.1 migration is validated.
--  Proceed to SA-1.2 (Core RPCs).
-- ============================================================
