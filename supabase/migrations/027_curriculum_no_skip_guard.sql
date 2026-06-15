-- ============================================================
--  NIMIPIKO — 027: Curriculum "no-skip" integrity guard
--
--  Phase BC verification found that complete_curriculum_mission
--  (026) never checked p_mission_id against level_missions for the
--  child's current level. Because level_missions is readable by any
--  authenticated user (auth.uid() is not null), a child/parent could
--  read future-level mission_id values and call
--  complete_curriculum_mission directly (bypassing the UI, which
--  only ever passes current-level mission ids from
--  get_curriculum_missions) to pre-bank progress on a future level's
--  category before actually reaching that level — letting them skip
--  straight to a later level (verified: skips Level 3 entirely once
--  Level 2 is finished).
--
--  Fix: function-only redefinition (no schema change) — reject
--  p_mission_id values that are not part of level_missions for the
--  child's current level (computed the same way get_current_level
--  already does, before the upsert). Legitimate calls are unaffected
--  because the frontend only ever passes a mission.id that came from
--  get_curriculum_missions, which is itself scoped to the current
--  level.
-- ============================================================

create or replace function complete_curriculum_mission(p_child_id uuid, p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language       text;
  v_category       text;
  v_lang           text;
  v_stars          integer;
  v_existed        boolean;
  v_rows           integer;
  v_total          integer;
  v_done           integer;
  v_new_badges     text[] := '{}';
  v_new_cert       text;
  v_all_cats       integer;
  v_done_cats      integer;
  v_level_before   integer;
  v_level_total    integer;
  v_level_done     integer;
  v_level_complete boolean := false;
  v_max_level      integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  select m.category_slug, m.stars into v_category, v_stars
  from missions m where m.id = p_mission_id;

  if v_category is null then
    raise exception 'mission not found';
  end if;

  v_lang := category_effective_language(v_category, v_language);

  v_level_before := get_current_level(p_child_id, v_language);

  -- ── No-skip guard: p_mission_id must belong to the child's current
  --    level. Shared placeholder mission_ids (used by 7/8 categories
  --    across levels 1-3) appear in level_missions for every level
  --    they're reused in, so legitimate current-level completions are
  --    never rejected by this check. ──
  if not exists (
    select 1 from level_missions
    where level_number = v_level_before and mission_id = p_mission_id
  ) then
    raise exception 'mission not in current level';
  end if;

  select exists (
    select 1 from child_progress
    where child_id = p_child_id and mission_id = p_mission_id and language = v_language
  ) into v_existed;

  insert into child_progress (child_id, mission_id, language, stars_earned, completed_at)
  values (p_child_id, p_mission_id, v_language, coalesce(v_stars, 0), now())
  on conflict (child_id, mission_id, language)
  do update set completed_at = excluded.completed_at;

  if v_existed then
    v_stars := 0; -- already completed before — no new lifetime stars
  end if;

  -- Category badge: every active mission published for this category's
  -- effective language (native, or 'en' fallback) done at least once?
  select count(*) into v_total
  from missions m
  join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
  where m.category_slug = v_category and m.active;

  select count(*) into v_done
  from child_progress cp
  join missions m on m.id = cp.mission_id
  where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_category;

  if v_total > 0 and v_done >= v_total then
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'badge', v_category || '-master-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges, v_category || '-master-' || v_language);
    end if;
  end if;

  -- Program certificate: every category that has published content in
  -- this child's language (or its English fallback) is fully complete?
  select count(*) into v_all_cats
  from categories c
  where (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  ) > 0;

  select count(*) into v_done_cats
  from categories c
  where (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  ) > 0
  and (
    select count(*) from child_progress cp2
    join missions m3 on m3.id = cp2.mission_id
    where cp2.child_id = p_child_id and cp2.language = v_language and m3.category_slug = c.slug
  ) >= (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  );

  if v_all_cats > 0 and v_done_cats >= v_all_cats then
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'certificate', 'program-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_cert := 'program-complete-' || v_language;
    end if;
  end if;

  -- ── Level-complete badge / curriculum-complete certificate, checked
  --    against the level the child was *on* before this completion. ──
  select count(*) into v_level_total from level_missions where level_number = v_level_before;

  select count(*) into v_level_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level_before;

  if v_level_total > 0 and v_level_done >= v_level_total then
    v_level_complete := true;

    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'badge', 'level-' || v_level_before || '-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges, 'level-' || v_level_before || '-complete-' || v_language);
    end if;

    select max(level_number) into v_max_level from level_missions;

    if v_level_before >= v_max_level then
      insert into child_achievements (child_id, language, type, slug)
      values (p_child_id, v_language, 'certificate', 'curriculum-complete-' || v_language)
      on conflict (child_id, language, type, slug) do nothing;

      get diagnostics v_rows = row_count;
      if v_rows > 0 then
        v_new_cert := 'curriculum-complete-' || v_language;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'stars_earned', v_stars,
    'new_badges', to_jsonb(v_new_badges),
    'new_certificate', v_new_cert,
    'level', get_current_level(p_child_id, v_language),
    'level_complete', v_level_complete
  );
end;
$$;

grant execute on function complete_curriculum_mission(uuid, uuid) to authenticated;
