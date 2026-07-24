-- ============================================================
-- 167: Cache subscription check in story library RPC (#20)
-- ============================================================
-- Previous: get_story_library_progress iterates over each story and calls
-- _sa_is_story_unlocked → _sa_parent_has_subscription per story.
-- With 10 stories that is 10 subscription DB queries in a single API call.
--
-- Fix strategy (backward-compatible):
--   1. Add a 4-argument overload of _sa_is_story_unlocked that accepts a
--      pre-computed subscription flag — avoids the DB query when the caller
--      already knows the result.
--   2. Rewrite get_story_library_progress to compute subscription status
--      ONCE at the top and pass it into every _sa_is_story_unlocked call.
--
-- All existing 3-argument callers of _sa_is_story_unlocked are unaffected.
-- ============================================================

-- ── 1. 4-arg overload: accepts pre-computed subscription flag ─────────────────

create or replace function _sa_is_story_unlocked(
  p_child_id uuid,
  p_story_id uuid,
  p_language text,
  p_has_sub  boolean       -- pre-computed; avoids re-querying nimipiko_subscriptions
) returns boolean
language plpgsql security definer stable as $$
declare
  v_order       integer;
  v_status      text;
  v_is_free     boolean;
  v_first_order integer;
  v_prev_id     uuid;
begin
  select s.sort_order, s.status, s.is_free
    into v_order, v_status, v_is_free
    from stories s
   where s.id = p_story_id;

  if v_order is null or v_status <> 'published' then return false; end if;

  -- Use the pre-computed flag instead of querying nimipiko_subscriptions again
  if not v_is_free and not p_has_sub then
    return false;
  end if;

  select min(s2.sort_order) into v_first_order
    from stories s2
   where s2.status = 'published';

  if v_order = v_first_order then return true; end if;

  select s3.id into v_prev_id
    from stories s3
   where s3.status = 'published'
     and s3.sort_order < v_order
   order by s3.sort_order desc limit 1;

  if v_prev_id is null then return true; end if;

  return _sa_is_story_complete(p_child_id, v_prev_id, p_language);
end;
$$;

grant execute on function _sa_is_story_unlocked(uuid, uuid, text, boolean) to authenticated;


-- ── 2. get_story_library_progress: check subscription once ───────────────────

create or replace function get_story_library_progress(
  p_child_id uuid,
  p_language text default 'en'
) returns table (
  sid         uuid,
  slug        text,
  title       text,
  cover_url   text,
  sort_order  integer,
  theme_emoji text,
  age_min     integer,
  age_max     integer,
  unlocked    boolean,
  complete    boolean,
  progress    numeric,
  is_free     boolean
)
language plpgsql security definer stable as $$
declare
  v_story   record;
  v_total   integer;
  v_done    integer;
  v_has_sub boolean;     -- computed once, reused for every story in the loop
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- Single subscription check for all stories in this call
  v_has_sub := _sa_parent_has_subscription(p_child_id);

  for v_story in
    select
      s.id          as xid,
      s.slug        as xslug,
      s.sort_order  as xorder,
      s.theme_emoji as xemoji,
      s.age_min     as xmin,
      s.age_max     as xmax,
      s.is_free     as xfree,
      coalesce(sv_l.title,     sv_e.title,     s.title)     as xtitle,
      coalesce(sv_l.cover_url, sv_e.cover_url, s.cover_url) as xcoverr
    from stories s
    join story_versions sv_l
      on sv_l.story_id = s.id and sv_l.language = p_language and sv_l.published = true
    left join story_versions sv_e
      on sv_e.story_id = s.id and sv_e.language = 'en' and sv_e.published = true
    where s.status = 'published'
    order by s.sort_order
  loop
    sid         := v_story.xid;
    slug        := v_story.xslug;
    title       := v_story.xtitle;
    cover_url   := v_story.xcoverr;
    sort_order  := v_story.xorder;
    theme_emoji := v_story.xemoji;
    age_min     := v_story.xmin;
    age_max     := v_story.xmax;
    is_free     := v_story.xfree;

    -- 4-arg overload uses pre-computed v_has_sub — no subscription DB hit per story
    unlocked := _sa_is_story_unlocked(p_child_id, v_story.xid, p_language, v_has_sub);
    complete  := _sa_is_story_complete(p_child_id, v_story.xid, p_language);

    select count(*) into v_total from story_slots where story_slots.story_id = v_story.xid;
    if v_total > 0 then
      select count(*) into v_done
      from story_slots ss2
      join child_progress cp on cp.mission_id = ss2.mission_id
        and cp.child_id = p_child_id and cp.language = p_language
      where ss2.story_id = v_story.xid;
      progress := round(v_done::numeric / v_total, 2);
    else
      progress := 0;
    end if;

    return next;
  end loop;
end;
$$;

grant execute on function get_story_library_progress(uuid, text) to authenticated;
