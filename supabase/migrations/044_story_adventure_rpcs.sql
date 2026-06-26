-- ============================================================
--  NIMIPIKO — Story Adventure RPCs (SA-1.2)
--
--  13 functions powering the Story Adventure learner flow.
--  Depends on: 043_story_adventure_schema.sql
--  No BK curriculum dependencies.
--
--  All functions use SECURITY DEFINER + is_my_child() for RLS.
--  All column aliases avoid PL/pgSQL variable name collisions.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
--  1. get_current_story
--     Returns the story_id of the child's current (first incomplete) story.
-- ══════════════════════════════════════════════════════════════

create or replace function get_current_story(
  p_child_id uuid,
  p_language text default 'en'
) returns uuid
language plpgsql security definer stable as $$
declare
  v_story record;
  v_last  uuid;
begin
  for v_story in
    select s.id as sid
    from stories s
    where s.status = 'published'
    order by s.sort_order asc
  loop
    if not _sa_is_story_complete(p_child_id, v_story.sid, p_language) then
      return v_story.sid;
    end if;
    v_last := v_story.sid;
  end loop;
  return v_last;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  2. get_unlocked_stories
--     Returns all story IDs the child can access.
-- ══════════════════════════════════════════════════════════════

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
  for v_story in
    select s.id as xid, s.sort_order as xorder
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


-- ══════════════════════════════════════════════════════════════
--  3. get_story_details
--     Returns story metadata with language-resolved title/cover + intro URLs.
-- ══════════════════════════════════════════════════════════════

create or replace function get_story_details(
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  sid          uuid,
  slug         text,
  title        text,
  cover_url    text,
  sort_order   integer,
  theme_emoji  text,
  age_min      integer,
  age_max      integer,
  intro_video_url     text,
  theme_song_url      text,
  meet_characters_url text,
  story_intro_url     text
)
language plpgsql security definer stable as $$
begin
  return query
  select
    s.id,
    s.slug,
    coalesce(sv_lang.title, sv_en.title, s.title),
    coalesce(sv_lang.cover_url, sv_en.cover_url, s.cover_url),
    s.sort_order,
    s.theme_emoji,
    s.age_min,
    s.age_max,
    coalesce(sv_lang.intro_video_url, sv_en.intro_video_url),
    coalesce(sv_lang.theme_song_url, sv_en.theme_song_url),
    coalesce(sv_lang.meet_characters_url, sv_en.meet_characters_url),
    coalesce(sv_lang.story_intro_url, sv_en.story_intro_url)
  from stories s
  left join story_versions sv_lang
    on sv_lang.story_id = s.id and sv_lang.language = p_language and sv_lang.published = true
  left join story_versions sv_en
    on sv_en.story_id = s.id and sv_en.language = 'en' and sv_en.published = true
  where s.id = p_story_id and s.status = 'published';
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  4. get_story_slots
--     Returns the 6 mission slots for a story with completion status.
-- ══════════════════════════════════════════════════════════════

create or replace function get_story_slots(
  p_child_id uuid,
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  slot_key     text,
  slot_order   integer,
  mission_id   uuid,
  mission_type text,
  title        text,
  subtitle     text,
  stars        integer,
  completed    boolean
)
language plpgsql security definer stable as $$
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    ss.slot_key,
    ss.sort_order,
    ss.mission_id,
    m.type,
    coalesce(
      (select mv1.title from mission_versions mv1 where mv1.mission_id = m.id and mv1.language = p_language and mv1.published = true order by mv1.revision_number desc limit 1),
      (select mv2.title from mission_versions mv2 where mv2.mission_id = m.id and mv2.language = 'en' and mv2.published = true order by mv2.revision_number desc limit 1),
      ''
    ),
    coalesce(
      (select mv3.subtitle from mission_versions mv3 where mv3.mission_id = m.id and mv3.language = p_language and mv3.published = true order by mv3.revision_number desc limit 1),
      (select mv4.subtitle from mission_versions mv4 where mv4.mission_id = m.id and mv4.language = 'en' and mv4.published = true order by mv4.revision_number desc limit 1),
      ''
    ),
    coalesce(m.stars, 10),
    exists(
      select 1 from child_progress cp
      where cp.child_id = p_child_id
        and cp.mission_id = ss.mission_id
        and cp.language = p_language
    )
  from story_slots ss
  join missions m on m.id = ss.mission_id
  where ss.story_id = p_story_id
  order by ss.sort_order;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  5. complete_story_slot
--     Records slot completion, awards stars, checks story completion,
--     awards badges/certificates, checks milestones.
-- ══════════════════════════════════════════════════════════════

create or replace function complete_story_slot(
  p_child_id   uuid,
  p_mission_id uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_lang            text;
  v_mission         record;
  v_story_id        uuid;
  v_existed         boolean;
  v_stars           integer;
  v_story_complete  boolean;
  v_story_slug      text;
  v_new_badges      text[] := '{}';
  v_new_cert        text;
  v_badge_slug      text;
  v_cert_slug       text;
  v_completed_count integer;
  v_total_published integer;
  v_next_id         uuid;
  v_trilingual      boolean;
  v_lang_iter       text;
  v_milestone       integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(language, 'en') into v_lang from children where id = p_child_id;

  select m.id as mid, m.story_id as msid, m.stars as mstars
  into v_mission
  from missions m where m.id = p_mission_id;

  if v_mission.mid is null then raise exception 'mission not found'; end if;
  if v_mission.msid is null then raise exception 'mission not part of a story'; end if;

  v_story_id := v_mission.msid;

  if not _sa_is_story_unlocked(p_child_id, v_story_id, v_lang) then
    raise exception 'story not unlocked';
  end if;

  select exists(
    select 1 from child_progress
    where child_id = p_child_id and mission_id = p_mission_id and language = v_lang
  ) into v_existed;

  insert into child_progress (child_id, mission_id, language, stars_earned, completed_at)
  values (p_child_id, p_mission_id, v_lang, coalesce(v_mission.mstars, 10), now())
  on conflict (child_id, mission_id, language)
  do update set completed_at = now();

  v_stars := case when v_existed then 0 else coalesce(v_mission.mstars, 10) end;

  v_story_complete := _sa_is_story_complete(p_child_id, v_story_id, v_lang);

  if v_story_complete and not v_existed then
    select s.slug into v_story_slug from stories s where s.id = v_story_id;

    -- Story-complete badge
    v_badge_slug := 'story-' || v_story_slug || '-complete-' || v_lang;
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_lang, 'badge', v_badge_slug)
    on conflict do nothing;
    if found then v_new_badges := array_append(v_new_badges, v_badge_slug); end if;

    -- Story certificate
    v_cert_slug := 'story-' || v_story_slug || '-certificate-' || v_lang;
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_lang, 'certificate', v_cert_slug)
    on conflict do nothing;
    if found then v_new_cert := v_cert_slug; end if;

    -- Streak milestones (3, 5, 10, 20)
    select count(distinct sq.xid) into v_completed_count
    from (
      select s2.id as xid
      from stories s2
      where s2.status = 'published'
        and exists (select 1 from story_slots where story_id = s2.id)
        and not exists (
          select 1 from story_slots ss3
          where ss3.story_id = s2.id
            and not exists (
              select 1 from child_progress cp2
              where cp2.child_id = p_child_id
                and cp2.mission_id = ss3.mission_id
                and cp2.language = v_lang
            )
        )
    ) sq;

    foreach v_milestone in array array[3, 5, 10, 20] loop
      if v_completed_count >= v_milestone then
        v_badge_slug := 'story-streak-' || v_milestone || '-' || v_lang;
        insert into child_achievements (child_id, language, type, slug)
        values (p_child_id, v_lang, 'badge', v_badge_slug)
        on conflict do nothing;
        if found then v_new_badges := array_append(v_new_badges, v_badge_slug); end if;
      end if;
    end loop;

    -- All-stories-complete certificate
    select count(*) into v_total_published
    from stories s3
    where s3.status = 'published'
      and exists (select 1 from story_slots where story_id = s3.id);

    if v_completed_count >= v_total_published and v_total_published > 0 then
      v_cert_slug := 'all-stories-complete-' || v_lang;
      insert into child_achievements (child_id, language, type, slug)
      values (p_child_id, v_lang, 'certificate', v_cert_slug)
      on conflict do nothing;
      if found then v_new_cert := v_cert_slug; end if;
    end if;

    -- Trilingual badge
    v_trilingual := true;
    foreach v_lang_iter in array array['en', 'fr', 'rw'] loop
      if not _sa_is_story_complete(p_child_id, v_story_id, v_lang_iter) then
        v_trilingual := false;
        exit;
      end if;
    end loop;

    if v_trilingual then
      v_badge_slug := 'trilingual-story-' || v_story_slug;
      insert into child_achievements (child_id, language, type, slug)
      values (p_child_id, 'en', 'badge', v_badge_slug)
      on conflict do nothing;
      if found then v_new_badges := array_append(v_new_badges, v_badge_slug); end if;
    end if;
  end if;

  select s4.id into v_next_id
  from stories s4
  where s4.status = 'published'
    and s4.sort_order > (select sort_order from stories where id = v_story_id)
  order by s4.sort_order asc limit 1;

  return jsonb_build_object(
    'stars_earned',        v_stars,
    'new_badges',          to_jsonb(v_new_badges),
    'new_certificate',     v_new_cert,
    'story_complete',      v_story_complete,
    'next_story_unlocked', (v_next_id is not null and v_story_complete)
  );
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  6. get_story_completion
--     Returns completion status for a single story.
-- ══════════════════════════════════════════════════════════════

create or replace function get_story_completion(
  p_child_id  uuid,
  p_story_id  uuid,
  p_language  text default 'en'
) returns table (
  total_slots     integer,
  completed_slots integer,
  is_complete     boolean
)
language plpgsql security definer stable as $$
declare
  v_total integer;
  v_done  integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_total
  from story_slots ss
  join missions m on m.id = ss.mission_id and m.active = true
  where ss.story_id = p_story_id;

  select count(*) into v_done
  from story_slots ss
  join child_progress cp on cp.mission_id = ss.mission_id
    and cp.child_id = p_child_id and cp.language = p_language
  where ss.story_id = p_story_id;

  total_slots     := v_total;
  completed_slots := v_done;
  is_complete     := (v_total > 0 and v_done >= v_total);
  return next;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  7. get_story_certificate
--     Returns certificate achievement if earned for this story.
-- ══════════════════════════════════════════════════════════════

create or replace function get_story_certificate(
  p_child_id uuid,
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  cert_slug  text,
  earned_at  timestamptz
)
language plpgsql security definer stable as $$
declare
  v_slug text;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select s.slug into v_slug from stories s where s.id = p_story_id;
  if v_slug is null then return; end if;

  return query
  select ca.slug, ca.earned_at
  from child_achievements ca
  where ca.child_id = p_child_id
    and ca.language = p_language
    and ca.type = 'certificate'
    and ca.slug = 'story-' || v_slug || '-certificate-' || p_language;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  8. get_weekly_challenges
--     Returns weekly challenges for a story with completion status.
-- ══════════════════════════════════════════════════════════════

create or replace function get_weekly_challenges(
  p_child_id uuid,
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  challenge_id uuid,
  challenge_type text,
  ch_stars     integer,
  title        text,
  description  text,
  content_json jsonb,
  completed    boolean,
  stars_earned integer
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
    )
  from weekly_challenges wc
  left join weekly_challenge_versions wcv_lang
    on wcv_lang.challenge_id = wc.id and wcv_lang.language = p_language and wcv_lang.published = true
  left join weekly_challenge_versions wcv_en
    on wcv_en.challenge_id = wc.id and wcv_en.language = 'en' and wcv_en.published = true
  where wc.story_id = p_story_id
  order by wc.sort_order;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  9. complete_weekly_challenge
-- ══════════════════════════════════════════════════════════════

create or replace function complete_weekly_challenge(
  p_child_id     uuid,
  p_challenge_id uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_lang      text;
  v_challenge record;
  v_existed   boolean;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(language, 'en') into v_lang from children where id = p_child_id;

  select wc.id as wid, wc.story_id as wsid, wc.stars as wstars
  into v_challenge
  from weekly_challenges wc where wc.id = p_challenge_id;

  if v_challenge.wid is null then raise exception 'challenge not found'; end if;

  if not _sa_is_story_complete(p_child_id, v_challenge.wsid, v_lang) then
    raise exception 'story not yet complete';
  end if;

  select exists(
    select 1 from weekly_challenge_progress
    where child_id = p_child_id and challenge_id = p_challenge_id and language = v_lang
  ) into v_existed;

  insert into weekly_challenge_progress (child_id, challenge_id, language, stars_earned, completed_at)
  values (p_child_id, p_challenge_id, v_lang, coalesce(v_challenge.wstars, 5), now())
  on conflict (child_id, challenge_id, language) do nothing;

  return jsonb_build_object(
    'stars_earned', case when v_existed then 0 else coalesce(v_challenge.wstars, 5) end,
    'already_completed', v_existed
  );
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  10. get_story_library_progress
--      Returns all published stories with unlock/completion/progress state.
-- ══════════════════════════════════════════════════════════════

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
  progress    numeric
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
      s.id     as xid,
      s.slug   as xslug,
      s.sort_order as xorder,
      s.theme_emoji as xemoji,
      s.age_min as xmin,
      s.age_max as xmax,
      s.cover_url as xcover,
      coalesce(sv_l.title, sv_e.title, s.title) as xtitle,
      coalesce(sv_l.cover_url, sv_e.cover_url, s.cover_url) as xcoverr
    from stories s
    left join story_versions sv_l
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


-- ══════════════════════════════════════════════════════════════
--  11. get_story_intro_progress
--      Returns which intro items a child has consumed for a story.
-- ══════════════════════════════════════════════════════════════

create or replace function get_story_intro_progress(
  p_child_id uuid,
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  slot_key    text,
  consumed    boolean,
  consumed_at timestamptz
)
language plpgsql security definer stable as $$
declare
  v_key text;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  foreach v_key in array array['intro_video', 'theme_song', 'meet_characters', 'story_intro'] loop
    slot_key := v_key;
    select sip.consumed_at into consumed_at
    from story_intro_progress sip
    where sip.child_id = p_child_id
      and sip.story_id = p_story_id
      and sip.language = p_language
      and sip.slot_key = v_key;
    consumed := (consumed_at is not null);
    return next;
  end loop;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  12. mark_intro_item_consumed
-- ══════════════════════════════════════════════════════════════

create or replace function mark_intro_item_consumed(
  p_child_id uuid,
  p_story_id uuid,
  p_slot_key text
) returns void
language plpgsql security definer as $$
declare
  v_lang text;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(language, 'en') into v_lang from children where id = p_child_id;

  insert into story_intro_progress (child_id, story_id, language, slot_key, consumed_at)
  values (p_child_id, p_story_id, v_lang, p_slot_key, now())
  on conflict do nothing;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  13. get_story_recommendations
--      Returns stories filtered by child's age + language availability.
-- ══════════════════════════════════════════════════════════════

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
  left join story_versions sv_l
    on sv_l.story_id = s.id and sv_l.language = p_language and sv_l.published = true
  left join story_versions sv_e
    on sv_e.story_id = s.id and sv_e.language = 'en' and sv_e.published = true
  where s.status = 'published'
  order by s.sort_order;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  INTERNAL HELPERS (not called directly by the client)
-- ══════════════════════════════════════════════════════════════

create or replace function _sa_is_story_complete(
  p_child_id uuid,
  p_story_id uuid,
  p_language text
) returns boolean
language plpgsql security definer stable as $$
declare
  v_total integer;
  v_done  integer;
begin
  select count(*) into v_total
  from story_slots ss
  join missions m on m.id = ss.mission_id and m.active = true
  where ss.story_id = p_story_id
    and exists (
      select 1 from mission_versions mv
      where mv.mission_id = m.id
        and mv.language in (p_language, 'en')
        and mv.published = true
    );

  select count(*) into v_done
  from story_slots ss
  join child_progress cp on cp.mission_id = ss.mission_id
    and cp.child_id = p_child_id
    and cp.language = p_language
  where ss.story_id = p_story_id;

  return (v_total > 0 and v_done >= v_total);
end;
$$;


create or replace function _sa_is_story_unlocked(
  p_child_id uuid,
  p_story_id uuid,
  p_language text
) returns boolean
language plpgsql security definer stable as $$
declare
  v_order       integer;
  v_status      text;
  v_first_order integer;
  v_prev_id     uuid;
begin
  select s.sort_order, s.status into v_order, v_status
  from stories s where s.id = p_story_id;

  if v_order is null or v_status <> 'published' then return false; end if;

  select min(s2.sort_order) into v_first_order
  from stories s2 where s2.status = 'published';

  if v_order = v_first_order then return true; end if;

  select s3.id into v_prev_id
  from stories s3
  where s3.status = 'published' and s3.sort_order < v_order
  order by s3.sort_order desc limit 1;

  if v_prev_id is null then return true; end if;

  return _sa_is_story_complete(p_child_id, v_prev_id, p_language);
end;
$$;


-- ============================================================
--  END OF SA-1.2 — 15 functions total
--    Public (13): get_current_story, get_unlocked_stories,
--      get_story_details, get_story_slots, complete_story_slot,
--      get_story_completion, get_story_certificate,
--      get_weekly_challenges, complete_weekly_challenge,
--      get_story_library_progress, get_story_intro_progress,
--      mark_intro_item_consumed, get_story_recommendations
--    Internal (2): _sa_is_story_complete, _sa_is_story_unlocked
-- ============================================================
