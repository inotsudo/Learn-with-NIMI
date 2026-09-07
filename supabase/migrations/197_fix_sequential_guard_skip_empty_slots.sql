-- Migration 197: fix complete_story_slot sequential guard
--
-- Bug: The sequential guard (added in migration 113) checks the raw story_slots
-- table when finding the "previous" slot. However, migration 191 added a
-- media-availability filter to get_story_slots so that slots with no uploaded
-- content (e.g. flipflop_audio with no story_page_versions) are hidden from the
-- UI. The learner cannot interact with — or therefore complete — a hidden slot.
--
-- Result: if a hidden slot sits at the lowest sort_order (e.g. flipflop_audio at
-- sort_order=1 with no pages uploaded), the guard raises "previous slot not
-- completed" for every subsequent slot. The entire story becomes uncompletable
-- even though the UI correctly shows story_pdf as the first available activity.
--
-- Fix: mirror the get_story_slots media filter inside the sequential guard.
-- When walking backwards to find the "previous" slot, skip any slot that would
-- be invisible to the learner (no media). The effective first slot is the
-- lowest sort_order slot that has content.

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
  -- slot-sequential guard
  v_slot_order      integer;
  v_min_order       integer;
  v_prev_mission_id uuid;
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

  -- Slot-level sequential guard (media-aware):
  -- Uses the same visibility rules as get_story_slots (migration 191) so that
  -- hidden/empty slots (no uploaded content) are skipped when determining what
  -- the "previous" slot is. This prevents hidden slots from blocking progress.
  select ss.sort_order into v_slot_order
  from story_slots ss where ss.mission_id = p_mission_id;

  -- Minimum sort_order among slots that HAVE content (visible to learner)
  select min(ss2.sort_order) into v_min_order
  from story_slots ss2
  where ss2.story_id = v_story_id
    and (
      (ss2.slot_key = 'coloring' and exists(
        select 1 from coloring_pages cp where cp.story_id = v_story_id
      ))
      or
      (ss2.slot_key = 'flipflop_audio' and exists(
        select 1 from story_pages sp
        join story_page_versions spv on spv.story_page_id = sp.id
        where sp.story_id = v_story_id
          and spv.language = v_lang
          and (spv.audio_url is not null or spv.image_url is not null)
      ))
      or
      (ss2.slot_key not in ('coloring', 'flipflop_audio') and exists(
        select 1 from mission_versions mv
        where mv.mission_id = ss2.mission_id
          and mv.media_url is not null
      ))
    );

  if v_slot_order is not null and v_min_order is not null and v_slot_order > v_min_order then
    -- Find the nearest preceding slot that has content (visible to learner)
    select ss3.mission_id into v_prev_mission_id
    from story_slots ss3
    where ss3.story_id = v_story_id
      and ss3.sort_order < v_slot_order
      and (
        (ss3.slot_key = 'coloring' and exists(
          select 1 from coloring_pages cp where cp.story_id = v_story_id
        ))
        or
        (ss3.slot_key = 'flipflop_audio' and exists(
          select 1 from story_pages sp
          join story_page_versions spv on spv.story_page_id = sp.id
          where sp.story_id = v_story_id
            and spv.language = v_lang
            and (spv.audio_url is not null or spv.image_url is not null)
        ))
        or
        (ss3.slot_key not in ('coloring', 'flipflop_audio') and exists(
          select 1 from mission_versions mv
          where mv.mission_id = ss3.mission_id
            and mv.media_url is not null
        ))
      )
    order by ss3.sort_order desc
    limit 1;

    if v_prev_mission_id is not null and not exists (
      select 1 from child_progress
      where child_id = p_child_id
        and mission_id = v_prev_mission_id
        and language = v_lang
    ) then
      raise exception 'previous slot not completed';
    end if;
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
