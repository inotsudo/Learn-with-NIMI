-- ============================================================
-- 142: Fix streak_days to count true consecutive days
--
-- SEMANTIC BUG (migration 140): streak_days counted distinct active
-- days in the last 30 — gaps did not break the counter. Fixed to
-- use a gaps-and-islands approach: walk backward from today, stop
-- at the first missing day. Streak stays alive if the child was
-- active today or yesterday.
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
  -- streak_days: true consecutive-day streak ending today or yesterday.
  -- Uses gaps-and-islands: dates - row_number() gives the same value
  -- for consecutive dates. We find the island whose last day is today
  -- or yesterday, then return its length.
  select jsonb_build_object(
    'total_missions',  count(distinct cp.id),
    'total_stars',     coalesce(sum(m.stars), 0),
    'stories_started', count(distinct m.story_id),
    'streak_days', (
      with dated as (
        select distinct completed_at::date as d
        from child_progress
        where child_id = p_child_id
      ),
      grouped as (
        select d,
          d - (row_number() over (order by d))::int as grp
        from dated
        where d <= current_date
      ),
      islands as (
        select grp, max(d) as last_day, count(*)::int as streak_len
        from grouped
        group by grp
      )
      select coalesce(
        (select streak_len from islands
         where last_day >= current_date - 1
         order by last_day desc
         limit 1),
        0
      )
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
