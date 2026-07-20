-- 111_fix_get_current_story_premium_gate.sql
-- get_current_story (044) was written before the premium gating added in 073.
-- It iterated all published stories and returned the first incomplete one,
-- ignoring _sa_is_story_unlocked entirely — so free-tier users who completed
-- story 1 were handed story 2 (premium, locked) as their current story.
-- Fix: skip any story where _sa_is_story_unlocked returns false.

create or replace function get_current_story(
  p_child_id uuid,
  p_language text default 'en'
) returns uuid
language plpgsql security definer stable as $$
declare
  v_story record;
  v_last  uuid;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  for v_story in
    select s.id as sid
    from stories s
    where s.status = 'published'
    order by s.sort_order asc
  loop
    -- Skip stories the child cannot access (sequential lock or premium without subscription)
    if not _sa_is_story_unlocked(p_child_id, v_story.sid, p_language) then
      continue;
    end if;

    if not _sa_is_story_complete(p_child_id, v_story.sid, p_language) then
      return v_story.sid;
    end if;

    v_last := v_story.sid;
  end loop;

  -- All accessible stories are complete — return the last accessible one.
  return v_last;
end;
$$;
