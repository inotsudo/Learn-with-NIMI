-- ============================================================
--  NIMIPIKO — 026: Curriculum Progression Model
--
--  Replaces the "daily mission pool" model (get_daily_missions /
--  complete_mission, migrations 012-023) with a sequential
--  curriculum:
--
--    - A "level" = the 8 mission categories (one mission per
--      category), exactly like the existing 8-tile dashboard grid.
--    - Every child starts at Level 1. A level is "current" until
--      all 8 of its categories are completed (ever) by the child,
--      in their current language — then the next level becomes
--      current automatically. No skipping; resume exactly where
--      left off (derived from child_progress, not stored).
--    - Progress stays partitioned per (child_id, language) exactly
--      as before, so switching the language switcher switches the
--      active learning journey for free.
--
--  New table `level_missions` maps (level_number, category_slug) ->
--  mission_id. Levels 2 and 3 give the "morning" category real new
--  content (the "Wake Up Song" / "Friendship Song" from the 021/023
--  rotation pool); the other 7 categories reuse their Level-1
--  mission as a placeholder (already completed at Level 1, so no
--  child gets stuck) until an admin authors real Level 2/3 content
--  per category and repoints this table.
--
--  get_daily_missions / complete_mission are left in place, unused —
--  no destructive changes to the existing schema or RPCs.
-- ============================================================

-- ── 1. level_missions ────────────────────────────────────────
create table if not exists level_missions (
  level_number  integer not null check (level_number > 0),
  category_slug text not null references categories(slug),
  mission_id    uuid not null references missions(id) on delete cascade,
  primary key (level_number, category_slug)
);

create index if not exists level_missions_mission_id_idx on level_missions (mission_id);

alter table level_missions enable row level security;
drop policy if exists "auth: read level_missions" on level_missions;
create policy "auth: read level_missions" on level_missions for select using (auth.uid() is not null);


-- ── 2. Seed Level 1 — each category's existing sequence=1 mission ──
insert into level_missions (level_number, category_slug, mission_id)
select 1, m.category_slug, m.id
from missions m
where m.sequence = 1
on conflict (level_number, category_slug) do nothing;


-- ── 3. Seed Level 2 — copy of Level 1, except "morning" gets the
--      "Wake Up Song" (sequence=2) ──────────────────────────────
insert into level_missions (level_number, category_slug, mission_id)
select 2, lm.category_slug, lm.mission_id
from level_missions lm
where lm.level_number = 1
on conflict (level_number, category_slug) do nothing;

update level_missions
set mission_id = (select id from missions where category_slug = 'morning' and sequence = 2)
where level_number = 2 and category_slug = 'morning';


-- ── 4. Seed Level 3 — copy of Level 1, except "morning" gets the
--      "Friendship Song" (sequence=3) ───────────────────────────
insert into level_missions (level_number, category_slug, mission_id)
select 3, lm.category_slug, lm.mission_id
from level_missions lm
where lm.level_number = 1
on conflict (level_number, category_slug) do nothing;

update level_missions
set mission_id = (select id from missions where category_slug = 'morning' and sequence = 3)
where level_number = 3 and category_slug = 'morning';


-- ============================================================
--  RPCS
-- ============================================================

-- ── get_current_level: smallest level with an unfinished category
--    for (child, language); saturates at max(level_number) once
--    every level is fully complete. Derived, not stored — gives
--    "resume exactly where left off" and "no skipping" for free. ──
create or replace function get_current_level(p_child_id uuid, p_language text)
returns integer
language sql stable as $$
  select coalesce(
    (
      select lm.level_number
      from level_missions lm
      left join child_progress cp
        on cp.mission_id = lm.mission_id
       and cp.language = p_language
       and cp.child_id = p_child_id
      group by lm.level_number
      having count(*) > count(cp.mission_id)
      order by lm.level_number
      limit 1
    ),
    (select max(level_number) from level_missions)
  );
$$;

grant execute on function get_current_level(uuid, text) to authenticated;


-- ── get_curriculum_missions: one row per category, for the child's
--    current level. Same per-category English-fallback pattern as
--    019/020/021 (category_effective_language). ───────────────────
create or replace function get_curriculum_missions(p_child_id uuid)
returns table (
  id                uuid,
  story_id          uuid,
  level             integer,
  type              text,
  title             text,
  duration_minutes  integer,
  media_url         text,
  category          text,
  stars             integer,
  subtitle          text,
  tip_text          text,
  content           jsonb,
  completed         boolean,
  level_complete    boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language       text;
  v_lang           text;
  v_level          integer;
  v_cat            record;
  v_mission_id     uuid;
  v_total          integer;
  v_done           integer;
  v_level_complete boolean;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  v_level := get_current_level(p_child_id, v_language);

  select count(*) into v_total from level_missions where level_number = v_level;

  select count(*) into v_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level;

  v_level_complete := v_total > 0 and v_done >= v_total;

  for v_cat in select c.slug from categories c order by c.sort_order loop

    select lm.mission_id into v_mission_id
    from level_missions lm
    where lm.level_number = v_level and lm.category_slug = v_cat.slug;

    if v_mission_id is null then
      continue;
    end if;

    v_lang := category_effective_language(v_cat.slug, v_language);

    return query
      select
        m.id, m.story_id, v_level as level, m.type,
        mv.title,
        m.duration_minutes,
        mv.media_url,
        m.category_slug as category, m.stars,
        mv.subtitle,
        mv.tip_text,
        mv.content_json as content,
        exists (
          select 1 from child_progress cp
          where cp.child_id = p_child_id and cp.language = v_language and cp.mission_id = m.id
        ) as completed,
        v_level_complete as level_complete
      from missions m
      join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.id = v_mission_id;

  end loop;
end;
$$;

grant execute on function get_curriculum_missions(uuid) to authenticated;


-- ── complete_curriculum_mission: child_progress upsert + category
--    badge + program certificate are unchanged from complete_mission
--    (021) — admin Certificates/Children managers keep working as-is.
--    New: also checks whether the level the child was on (before this
--    completion) is now fully done, awarding a `level-{N}-complete-
--    {lang}` badge, and a `curriculum-complete-{lang}` certificate if
--    that was the max level. ───────────────────────────────────────
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

  -- ── New: level-complete badge / curriculum-complete certificate ──
  -- Checked against the level the child was *on* before this
  -- completion — if it's now fully covered by child_progress, that
  -- level is done. NOTE: with the current 3-level seed, the very
  -- completion that finishes Level 3 also finishes the program
  -- certificate above, so `new_certificate` may report
  -- 'curriculum-complete-{lang}' instead of 'program-complete-{lang}'
  -- for that single event — both are persisted to child_achievements
  -- regardless, just not both surfaced in this one response.
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
