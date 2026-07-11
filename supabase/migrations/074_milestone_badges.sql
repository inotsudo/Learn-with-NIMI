-- migration 074: auto-award milestone badges
--
-- Adds _sa_award_milestone_badges(child_id, language) → text[]
-- Called client-side when a child enters the certificate phase after
-- completing a story. Returns slugs that were just newly awarded so
-- the UI can animate the badge unlock celebration.

create or replace function _sa_award_milestone_badges(
  p_child_id uuid,
  p_language  text
) returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story_count  int;
  v_total_stars  int;
  v_existing     text[];
  v_newly_earned text[] := '{}';
  v_slug         text;
begin
  -- 1. All badge slugs this child has already earned (any language)
  select coalesce(array_agg(badge_slug), '{}')
  into v_existing
  from child_badges
  where child_id = p_child_id;

  -- 2. Count fully-completed stories in this language.
  --    A story is "complete" when every one of its story_slots has a
  --    matching child_progress row for this child + language.
  with slot_totals as (
    select story_id, count(*) as total
    from story_slots
    group by story_id
  ),
  child_done as (
    select ss.story_id, count(*) as done
    from story_slots ss
    join child_progress cp
      on cp.mission_id = ss.mission_id
     and cp.child_id   = p_child_id
     and cp.language   = p_language
    group by ss.story_id
  )
  select count(*) into v_story_count
  from slot_totals st
  join child_done cd on cd.story_id = st.story_id
  where cd.done >= st.total;

  -- 3. Total stars earned in this language
  select coalesce(sum(stars_earned), 0)
  into v_total_stars
  from child_progress
  where child_id = p_child_id and language = p_language;

  -- 4. Award each milestone badge once (idempotent via ON CONFLICT)
  foreach v_slug in array array[
    case when v_story_count >= 1 then 'story-explorer'   end,
    case when v_story_count >= 3 then 'story-adventurer' end,
    case when v_story_count >= 5 then 'story-champion'   end,
    case when v_total_stars  >= 50  then 'star-collector' end,
    case when v_total_stars  >= 100 then 'super-star'     end
  ]
  loop
    continue when v_slug is null;
    continue when v_slug = any(v_existing);
    insert into child_badges (child_id, badge_slug)
    values (p_child_id, v_slug)
    on conflict (child_id, badge_slug) do nothing;
    v_newly_earned := v_newly_earned || v_slug;
  end loop;

  return v_newly_earned;
end;
$$;

grant execute on function _sa_award_milestone_badges(uuid, text) to authenticated;
