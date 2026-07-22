-- ============================================================
-- 140: Fix get_learner_context streak calculation
--
-- PERF BUG (migration 130): streak_days used generate_series(0,29)
-- with 30 correlated EXISTS subqueries against child_progress — one
-- roundtrip per day. Replaced with a single date-range COUNT DISTINCT
-- that produces identical results via one index scan.
-- ============================================================

create or replace function get_learner_context(p_child_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_child    jsonb;
  v_stats    jsonb;
  v_recent   jsonb;
  v_memories jsonb;
  v_recs     jsonb;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  -- Child profile (exclude sensitive fields)
  select jsonb_build_object(
    'id',       c.id,
    'name',     c.name,
    'language', c.language,
    'age',      c.age
  ) into v_child
  from children c where c.id = p_child_id;

  if not found then
    raise exception 'Child not found';
  end if;

  -- Lifetime stats.
  -- streak_days: count distinct days with activity in the last 30 days
  -- using a single index-range scan instead of 30 correlated EXISTS.
  select jsonb_build_object(
    'total_missions',  count(distinct cp.id),
    'total_stars',     coalesce(sum(m.stars), 0),
    'stories_started', count(distinct m.story_id),
    'streak_days', (
      select count(distinct cp3.completed_at::date)
      from   child_progress cp3
      where  cp3.child_id          = p_child_id
        and  cp3.completed_at::date >= current_date - 29
        and  cp3.completed_at::date <= current_date
    )
  ) into v_stats
  from child_progress cp
  join missions m on m.id = cp.mission_id
  where cp.child_id = p_child_id;

  -- Last 10 activities
  select coalesce(jsonb_agg(r order by r->>'completed_at' desc), '[]') into v_recent
  from (
    select jsonb_build_object(
      'mission_type', m.type,
      'story_title',  s.title,
      'completed_at', cp.completed_at,
      'stars',        coalesce(m.stars, 0)
    ) as r
    from child_progress cp
    join missions m on m.id = cp.mission_id
    join stories  s on s.id = m.story_id
    where cp.child_id = p_child_id
    order by cp.completed_at desc
    limit 10
  ) sub;

  -- Memories (confidence ≥ 0.2)
  select coalesce(jsonb_agg(jsonb_build_object(
    'memory_type', lm.memory_type,
    'key',         lm.key,
    'value',       lm.value,
    'confidence',  lm.confidence
  ) order by lm.updated_at desc), '[]') into v_memories
  from learner_memories lm
  where lm.child_id   = p_child_id
    and lm.confidence >= 0.2;

  -- Top 5 recommendations
  v_recs := get_recommendation_candidates(p_child_id, 5);

  return jsonb_build_object(
    'child',           coalesce(v_child,    '{}'),
    'stats',           coalesce(v_stats,    '{}'),
    'recent_activity', coalesce(v_recent,   '[]'),
    'memories',        coalesce(v_memories, '[]'),
    'recommendations', coalesce(v_recs,     '[]')
  );
end;
$$;
