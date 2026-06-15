-- ============================================================
--  NIMIPIKO — 020: Per-category English fallback
--
--  Problem:
--    Migration 019 removed the English fallback entirely, so any
--    category with zero published mission_versions in a child's
--    language returned NO row at all from get_daily_missions(). The
--    admin Translation Center shows most categories are FR=0/RW=0
--    (only Movement Mission has FR, only Mission Historique has
--    RW) — so French/Kinyarwanda children currently see "no mission
--    today" for 6-7 of their 8 daily categories.
--
--  Fix:
--    New per-category fallback: if a category has NO published
--    mission_versions in the child's language, fall back to the
--    'en' version FOR THAT CATEGORY ONLY. Categories that already
--    have a published version in the child's language continue to
--    use it exclusively — no per-mission English ever mixes into an
--    already-translated category.
--
--    child_progress / child_achievements bookkeeping is unchanged —
--    still keyed by the child's own `language` (children.language).
--    Only the mission_versions row chosen for display/counting can
--    fall back to 'en'.
-- ============================================================

-- Returns `p_language` if the category has a published+active mission
-- in that language, else 'en' if one exists in English, else
-- `p_language` (will simply yield zero candidates downstream, same as
-- migration 019's "no row for this category" behaviour).
create or replace function category_effective_language(p_category_slug text, p_language text)
returns text
language sql stable as $$
  select case
    when exists (
      select 1 from missions m
      join mission_versions mv on mv.mission_id = m.id and mv.language = p_language and mv.published
      where m.category_slug = p_category_slug and m.active
    ) then p_language
    when p_language <> 'en' and exists (
      select 1 from missions m
      join mission_versions mv on mv.mission_id = m.id and mv.language = 'en' and mv.published
      where m.category_slug = p_category_slug and m.active
    ) then 'en'
    else p_language
  end;
$$;

grant execute on function category_effective_language(text, text) to authenticated;


-- ── get_daily_missions: same shape as 019, but the mission_versions
--    join uses the per-category effective language (falls back to
--    'en' for categories with nothing published in v_language) ──────
drop function if exists get_daily_missions(uuid);

create or replace function get_daily_missions(p_child_id uuid)
returns table (
  id                 uuid,
  story_id           uuid,
  day_number         integer,
  type               text,
  title              text,
  duration_minutes   integer,
  media_url          text,
  page_start         integer,
  page_end           integer,
  category           text,
  stars              integer,
  subtitle           text,
  tip_text           text,
  content            jsonb,
  sequence           integer,
  total_in_category  integer,
  category_complete  boolean,
  completed_today    boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language        text;
  v_lang            text;
  v_cat             record;
  v_total           integer;
  v_last_seq        integer;
  v_last_completed  timestamptz;
  v_next_id         uuid;
  v_next_seq        integer;
  v_chosen_id       uuid;
  v_chosen_seq      integer;
  v_completed_today boolean;
  v_category_complete boolean;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  for v_cat in select c.slug from categories c order by c.sort_order loop

    v_lang := category_effective_language(v_cat.slug, v_language);

    select count(*) into v_total
    from missions m
    join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
    where m.category_slug = v_cat.slug and m.active;

    select m.sequence, cp.completed_at into v_last_seq, v_last_completed
    from child_progress cp
    join missions m on m.id = cp.mission_id
    where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_cat.slug
    order by m.sequence desc
    limit 1;

    select m.id, m.sequence into v_next_id, v_next_seq
    from missions m
    join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
    where m.category_slug = v_cat.slug and m.active
      and not exists (
        select 1 from child_progress cp
        where cp.child_id = p_child_id and cp.language = v_language and cp.mission_id = m.id
      )
    order by m.sequence asc
    limit 1;

    if v_next_id is not null then
      if v_last_seq is not null and v_last_completed::date = current_date then
        select m.id into v_chosen_id from missions m
          where m.category_slug = v_cat.slug and m.sequence = v_last_seq;
        v_chosen_seq := v_last_seq;
        v_completed_today := true;
      else
        v_chosen_id := v_next_id;
        v_chosen_seq := v_next_seq;
        v_completed_today := false;
      end if;
      v_category_complete := false;
    else
      select m.id into v_chosen_id from missions m
        where m.category_slug = v_cat.slug and m.sequence = v_last_seq;
      v_chosen_seq := v_last_seq;
      v_completed_today := true;
      v_category_complete := true;
    end if;

    -- No mission to show for this category in this child's language
    -- (or its English fallback) today.
    if v_chosen_id is null then
      continue;
    end if;

    return query
      select
        m.id, m.story_id, v_chosen_seq as day_number, m.type,
        mv.title,
        m.duration_minutes,
        mv.media_url,
        null::integer as page_start, null::integer as page_end,
        m.category_slug as category, m.stars,
        mv.subtitle,
        mv.tip_text,
        mv.content_json as content,
        v_chosen_seq as sequence,
        v_total as total_in_category,
        v_category_complete as category_complete,
        v_completed_today as completed_today
      from missions m
      join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.id = v_chosen_id;

  end loop;
end;
$$;

grant execute on function get_daily_missions(uuid) to authenticated;


-- ── complete_mission: badge/certificate totals use the same
--    per-category effective-language fallback for mission_versions.
--    child_progress / child_achievements stay keyed by v_language. ──
drop function if exists complete_mission(uuid, uuid);

create or replace function complete_mission(p_child_id uuid, p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language     text;
  v_category     text;
  v_lang         text;
  v_stars        integer;
  v_rows         integer;
  v_total        integer;
  v_done         integer;
  v_new_badges   text[] := '{}';
  v_new_cert     text;
  v_all_cats     integer;
  v_done_cats    integer;
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

  insert into child_progress (child_id, mission_id, language, stars_earned, completed_at)
  values (p_child_id, p_mission_id, v_language, coalesce(v_stars, 0), now())
  on conflict (child_id, mission_id, language) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    v_stars := 0; -- already completed previously — no new stars
  end if;

  -- Category badge: every active mission published for this category's
  -- effective language (native, or 'en' fallback) done?
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

  return jsonb_build_object(
    'stars_earned', v_stars,
    'new_badges', to_jsonb(v_new_badges),
    'new_certificate', v_new_cert
  );
end;
$$;

grant execute on function complete_mission(uuid, uuid) to authenticated;
