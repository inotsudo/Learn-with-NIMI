-- 115_fix_story_recommendations_language_gate.sql
--
-- get_story_recommendations had the same LEFT JOIN language leak as the three
-- RPCs fixed in migration 114. Stories without a published version in
-- p_language were included and fell back to English titles/covers.
-- Fixed to INNER JOIN so only language-published stories are recommended.

create or replace function get_story_recommendations(
  p_child_id uuid,
  p_language text default 'en'
) returns table (
  sid         uuid,
  slug        text,
  title       text,
  cover_url   text,
  sort_order  integer,
  theme_emoji text,
  age_match   boolean
)
language plpgsql security definer stable as $$
declare
  v_age integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select age into v_age from children where id = p_child_id;

  return query
  select
    s.id,
    s.slug,
    coalesce(sv_l.title, sv_e.title, s.title),
    coalesce(sv_l.cover_url, sv_e.cover_url, s.cover_url),
    s.sort_order,
    s.theme_emoji,
    (v_age is not null
      and (s.age_min is null or v_age >= s.age_min)
      and (s.age_max is null or v_age <= s.age_max)
    )
  from stories s
  -- INNER JOIN: only recommend stories published in the requested language
  join story_versions sv_l
    on sv_l.story_id = s.id and sv_l.language = p_language and sv_l.published = true
  -- LEFT JOIN: English fallback for display fields only
  left join story_versions sv_e
    on sv_e.story_id = s.id and sv_e.language = 'en' and sv_e.published = true
  where s.status = 'published'
  order by s.sort_order;
end;
$$;
