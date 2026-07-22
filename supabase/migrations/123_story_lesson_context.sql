-- 123_story_lesson_context.sql
-- Returns story title + up to 30 distinct vocabulary words for the lesson generator.
-- Caller must be an authenticated teacher (row in teacher_profiles).
-- Vocabulary is drawn from mission_versions.content_json -> 'vocabulary'
-- for all published missions belonging to the requested story.

drop function if exists get_story_lesson_context(uuid, text);

create or replace function get_story_lesson_context(
  p_story_id uuid,
  p_language  text
) returns jsonb
language plpgsql security definer stable as $$
declare
  v_story_title text;
  v_vocab       text[];
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from teacher_profiles where id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select title into v_story_title
  from stories
  where id = p_story_id and status = 'published';

  if not found then
    raise exception 'story not found';
  end if;

  select array(
    select distinct lower(trim(elem ->> 'word'))
    from missions m
    join mission_versions mv
      on  mv.mission_id = m.id
      and mv.language   = p_language
      and mv.published  = true
    cross join jsonb_array_elements(
      case jsonb_typeof(mv.content_json -> 'vocabulary')
        when 'array' then mv.content_json -> 'vocabulary'
        else '[]'::jsonb
      end
    ) as elem
    where m.story_id = p_story_id
      and trim(coalesce(elem ->> 'word', '')) <> ''
    order by 1
    limit 30
  ) into v_vocab;

  return jsonb_build_object(
    'story_id',   p_story_id,
    'title',      v_story_title,
    'language',   p_language,
    'vocabulary', coalesce(to_jsonb(v_vocab), '[]'::jsonb)
  );
end;
$$;
