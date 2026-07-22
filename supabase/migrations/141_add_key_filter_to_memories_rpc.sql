-- ============================================================
-- 141: Add optional p_key filter to get_learner_memories
--
-- PERF: getMemory() loaded ALL memories for a child then filtered
-- client-side. Adding an optional p_key parameter pushes that
-- filter into the DB, returning a single row instead of the full
-- set when a specific key is requested.
-- ============================================================

create or replace function get_learner_memories(
  p_child_id uuid,
  p_types    text[] default null,
  p_key      text   default null
)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.updated_at desc), '[]')
  into v_rows
  from learner_memories m
  where m.child_id   = p_child_id
    and m.confidence >= 0.2
    and (p_types is null or m.memory_type = any(p_types))
    and (p_key   is null or m.key = p_key);

  return coalesce(v_rows, '[]');
end;
$$;
