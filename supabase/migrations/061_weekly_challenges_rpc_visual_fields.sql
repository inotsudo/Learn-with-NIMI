-- ============================================================
--  NIMIPIKO — Patch get_weekly_challenges RPC
--
--  Adds image_url, video_url, difficulty, reward_badge columns
--  to the return type (added to weekly_challenges in migration 050
--  but were missing from the original RPC in migration 044).
-- ============================================================

create or replace function get_weekly_challenges(
  p_child_id uuid,
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  challenge_id  uuid,
  challenge_type text,
  ch_stars      integer,
  title         text,
  description   text,
  content_json  jsonb,
  completed     boolean,
  stars_earned  integer,
  image_url     text,
  video_url     text,
  difficulty    text,
  reward_badge  text
)
language plpgsql security definer stable as $$
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    wc.id,
    wc.type,
    wc.stars,
    coalesce(wcv_lang.title, wcv_en.title, ''),
    coalesce(wcv_lang.description, wcv_en.description, ''),
    coalesce(wcv_lang.content_json, wcv_en.content_json, '{}'::jsonb),
    exists(
      select 1 from weekly_challenge_progress wcp
      where wcp.child_id = p_child_id and wcp.challenge_id = wc.id and wcp.language = p_language
    ),
    coalesce(
      (select wcp2.stars_earned from weekly_challenge_progress wcp2
       where wcp2.child_id = p_child_id and wcp2.challenge_id = wc.id and wcp2.language = p_language),
      0
    ),
    wc.image_url,
    wc.video_url,
    wc.difficulty,
    wc.reward_badge
  from weekly_challenges wc
  left join weekly_challenge_versions wcv_lang
    on wcv_lang.challenge_id = wc.id and wcv_lang.language = p_language and wcv_lang.published = true
  left join weekly_challenge_versions wcv_en
    on wcv_en.challenge_id = wc.id and wcv_en.language = 'en' and wcv_en.published = true
  where wc.story_id = p_story_id
  order by wc.sort_order;
end;
$$;
