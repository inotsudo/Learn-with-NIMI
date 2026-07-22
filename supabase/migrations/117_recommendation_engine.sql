-- 117_recommendation_engine.sql
-- Scored story recommendation engine.
--
-- Adds get_story_recommendations_v2, a replacement for get_story_recommendations
-- that scores each candidate story across 7 signals and returns them ranked.
-- The original function is left intact so existing callers are not broken.
--
-- Signals and weights (additive; higher is better):
--   in_progress   +25  child already started this story
--   sequential    +15  first incomplete unlocked story in curriculum order
--   category_fit  +20  story category matches child's favorite_category
--   age_fit       +15  child's age falls within story's age range
--   level_fit     +10  story difficulty suits child's reading level
--   vocab_new     + 8  child has encountered < 3 vocabulary words from this story
--   weakness_fit  +12  story category matches a quiz weakness area
--
-- reason_key encodes the dominant signal for UI + prompt rendering:
--   in_progress | level_up | review_needed | interest_match | age_match | new_adventure

drop function if exists get_story_recommendations_v2(uuid, text, int);

create or replace function get_story_recommendations_v2(
  p_child_id uuid,
  p_language text default 'en',
  p_limit    int  default 5
) returns table (
  story_id       uuid,
  slug           text,
  title          text,
  cover_url      text,
  description    text,
  theme_emoji    text,
  age_min        integer,
  age_max        integer,
  is_free        boolean,
  category       text,
  score          integer,
  reason_key     text,
  completion_pct integer
)
language plpgsql security definer stable as $$
declare
  v_age                integer;
  v_favorite_category  text;
  v_completed_stories  integer;
  v_reading_level      text;
  v_next_sort_order    integer;
  v_weakness_categories text[];
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- ── child basics ──────────────────────────────────────────────────────────
  select coalesce(age, 0), favorite_category
  into v_age, v_favorite_category
  from children where id = p_child_id;

  -- ── completed story count → reading level ─────────────────────────────────
  select count(distinct s.id)
  into v_completed_stories
  from stories s
  where s.status = 'published'
    and exists (select 1 from story_slots ss  where ss.story_id  = s.id)
    and not exists (
      select 1 from story_slots ss2
      where ss2.story_id = s.id
        and not exists (
          select 1 from child_progress cp
          where cp.child_id  = p_child_id
            and cp.mission_id = ss2.mission_id
            and cp.language   = p_language
        )
    );

  v_reading_level := case
    when v_completed_stories = 0  then 'emerging'
    when v_completed_stories <= 2 then 'beginning'
    when v_completed_stories <= 5 then 'developing'
    when v_completed_stories <= 10 then 'expanding'
    else                               'fluent'
  end;

  -- ── next sequential story: first incomplete + unlocked story ──────────────
  select min(s2.sort_order) into v_next_sort_order
  from stories s2
  where s2.status = 'published'
    and _sa_is_story_unlocked(p_child_id, s2.id, p_language)
    and not _sa_is_story_complete(p_child_id, s2.id, p_language);

  -- ── weakness categories: quiz accuracy < 50% with ≥ 3 attempts ───────────
  select array_agg(distinct s3.category)
  into v_weakness_categories
  from child_quiz_results qr
  join stories s3 on s3.id = qr.story_id
  where qr.child_id = p_child_id
    and qr.language  = p_language
    and s3.category is not null
  group by s3.category
  having count(*) >= 3
    and round(
          count(*) filter (where qr.answered_correctly) * 100.0 / count(*)
        ) < 50;

  -- ── score + rank ──────────────────────────────────────────────────────────
  return query
  with slot_counts as (
    -- completed vs total slots per story for the child+language
    select
      ss.story_id,
      count(ss.mission_id)                                            as total_slots,
      count(cp.mission_id) filter (
        where cp.child_id = p_child_id and cp.language = p_language
      )                                                               as done_slots
    from story_slots ss
    left join child_progress cp
      on  cp.mission_id = ss.mission_id
      and cp.child_id   = p_child_id
      and cp.language   = p_language
    group by ss.story_id
  ),
  vocab_known as (
    -- words the child has already encountered from each story
    select story_id, count(*) as known_count
    from child_vocabulary
    where child_id = p_child_id and language = p_language
    group by story_id
  ),
  candidates as (
    select
      s.id                          as story_id,
      s.slug,
      coalesce(sv.title, s.title)   as title,
      coalesce(sv.cover_url, s.cover_url) as cover_url,
      sv.description,
      s.theme_emoji,
      s.age_min,
      s.age_max,
      s.is_free,
      s.category,
      s.sort_order,
      -- completion percentage
      case
        when coalesce(sc.total_slots, 0) = 0 then 0
        else least(100,
               round(coalesce(sc.done_slots, 0) * 100.0
                     / sc.total_slots)::int)
      end                           as completion_pct,
      -- ── signal: in-progress ──
      case
        when coalesce(sc.done_slots, 0) > 0
         and coalesce(sc.done_slots, 0) < coalesce(sc.total_slots, 1)
        then 25 else 0
      end                           as in_progress_bonus,
      -- ── signal: natural next in curriculum ──
      case when s.sort_order = v_next_sort_order then 15 else 0 end
                                    as sequential_bonus,
      -- ── signal: matches favorite interest ──
      case
        when v_favorite_category is not null
         and s.category = v_favorite_category then 20 else 0
      end                           as category_bonus,
      -- ── signal: age-appropriate ──
      case
        when v_age > 0
         and (s.age_min is null or v_age >= s.age_min)
         and (s.age_max is null or v_age <= s.age_max)
        then 15 else 0
      end                           as age_bonus,
      -- ── signal: reading-level fit ──
      case
        when v_reading_level = 'emerging' then 5
        when v_reading_level in ('beginning', 'developing')
         and s.age_max is not null and s.age_max <= v_age + 2 then 10
        when v_reading_level in ('expanding', 'fluent')
         and s.age_min is not null and s.age_min >= 5 then 10
        else 0
      end                           as level_bonus,
      -- ── signal: new vocabulary territory ──
      case when coalesce(vk.known_count, 0) < 3 then 8 else 0 end
                                    as vocab_new_bonus,
      -- ── signal: remediation of a weak quiz category ──
      case
        when v_weakness_categories is not null
         and s.category = any(v_weakness_categories) then 12 else 0
      end                           as weakness_bonus
    from stories s
    join story_versions sv
      on  sv.story_id = s.id
      and sv.language = p_language
      and sv.published = true
    left join slot_counts sc on sc.story_id = s.id
    left join vocab_known  vk on vk.story_id = s.id
    where s.status = 'published'
      -- only recommend accessible (unlocked) stories
      and _sa_is_story_unlocked(p_child_id, s.id, p_language)
      -- exclude fully completed stories
      and (
        coalesce(sc.total_slots, 0) = 0
        or coalesce(sc.done_slots, 0) < coalesce(sc.total_slots, 0)
      )
  )
  select
    c.story_id,
    c.slug,
    c.title,
    c.cover_url,
    c.description,
    c.theme_emoji,
    c.age_min,
    c.age_max,
    c.is_free,
    c.category,
    (c.in_progress_bonus + c.sequential_bonus + c.category_bonus
       + c.age_bonus + c.level_bonus + c.vocab_new_bonus
       + c.weakness_bonus)::integer as score,
    -- primary reason (most specific signal wins)
    case
      when c.in_progress_bonus > 0 then 'in_progress'
      when c.sequential_bonus  > 0 then 'level_up'
      when c.weakness_bonus    > 0 then 'review_needed'
      when c.category_bonus    > 0 then 'interest_match'
      when c.age_bonus         > 0 then 'age_match'
      else                              'new_adventure'
    end                             as reason_key,
    c.completion_pct
  from candidates c
  order by score desc, c.sort_order asc
  limit p_limit;
end;
$$;
