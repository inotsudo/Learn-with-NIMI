-- 114_story_library_language_gate.sql
--
-- Stories whose story_versions row for p_language is missing or unpublished
-- were leaking into non-English library views because all three RPCs used
-- LEFT JOIN / no language filter on story_versions.
--
-- Fix: require a published story_version for the requested language before
-- including a story in get_story_library_progress, get_current_story, and
-- get_unlocked_stories.

-- ── 1. get_story_library_progress ────────────────────────────────────────────

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
  v_story  record;
  v_total  integer;
  v_done   integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  for v_story in
    select
      s.id          as xid,
      s.slug        as xslug,
      s.sort_order  as xorder,
      s.theme_emoji as xemoji,
      s.age_min     as xmin,
      s.age_max     as xmax,
      s.is_free     as xfree,
      -- Title/cover still fall back to English for display, but the gate
      -- (inner join below) ensures the language version is actually published.
      coalesce(sv_l.title,     sv_e.title,     s.title)     as xtitle,
      coalesce(sv_l.cover_url, sv_e.cover_url, s.cover_url) as xcoverr
    from stories s
    -- INNER JOIN: story must have a published version for the requested language
    join story_versions sv_l
      on sv_l.story_id = s.id and sv_l.language = p_language and sv_l.published = true
    -- LEFT JOIN: English fallback for display fields only
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
    unlocked    := _sa_is_story_unlocked(p_child_id, v_story.xid, p_language);
    complete    := _sa_is_story_complete(p_child_id, v_story.xid, p_language);

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


-- ── 2. get_current_story ─────────────────────────────────────────────────────

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
    -- Only consider stories published in the requested language
    join story_versions sv_l
      on sv_l.story_id = s.id and sv_l.language = p_language and sv_l.published = true
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


-- ── 3. get_unlocked_stories ──────────────────────────────────────────────────

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
    -- Only consider stories published in the requested language
    join story_versions sv_l
      on sv_l.story_id = s.id and sv_l.language = p_language and sv_l.published = true
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
