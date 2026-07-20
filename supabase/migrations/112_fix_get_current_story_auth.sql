-- 112_fix_get_current_story_auth.sql
-- get_current_story and get_unlocked_stories (044) were missing is_my_child()
-- checks unlike every other child-specific RPC in the same migration.
-- Any authenticated user could query any child's story state. Fixed here.

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
    if not _sa_is_story_unlocked(p_child_id, v_story.sid, p_language) then
      continue;
    end if;

    if not _sa_is_story_complete(p_child_id, v_story.sid, p_language) then
      return v_story.sid;
    end if;

    v_last := v_story.sid;
  end loop;

  return v_last;
end;
$$;


create or replace function get_unlocked_stories(
  p_child_id uuid,
  p_language text default 'en'
) returns table (
  sid uuid
)
language plpgsql security definer stable as $$
declare
  v_story record;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  for v_story in
    select s.id as xid
    from stories s
    where s.status = 'published'
    order by s.sort_order asc
  loop
    if _sa_is_story_unlocked(p_child_id, v_story.xid, p_language) then
      sid := v_story.xid;
      return next;
    end if;
  end loop;
end;
$$;
