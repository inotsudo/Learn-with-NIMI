-- 120_goal_progress_for_child.sql
-- Adds a language-resolving variant of increment_goal_progress so callers
-- that only have a child_id (not the language) can still advance goals.
-- Used by storyProgressRepository and vocabularyProgress which don't carry
-- the language through their call signatures.

drop function if exists increment_goal_progress_for_child(uuid, text, integer);

create or replace function increment_goal_progress_for_child(
  p_child_id  uuid,
  p_goal_type text,
  p_increment integer default 1
) returns void
language plpgsql security definer as $$
declare
  v_language text;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(language, 'en') into v_language
  from children where id = p_child_id;

  update child_learning_goals
  set
    current_value = least(current_value + p_increment, target_value),
    completed     = (current_value + p_increment >= target_value)
  where child_id  = p_child_id
    and language  = v_language
    and goal_type = p_goal_type
    and expires_at > now()
    and not completed;
end;
$$;
