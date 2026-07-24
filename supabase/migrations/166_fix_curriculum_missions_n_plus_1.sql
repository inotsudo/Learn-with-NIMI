-- ============================================================
-- 166: Fix get_curriculum_missions N+1 query (#19)
-- ============================================================
-- Previous: a PL/pgSQL FOR loop iterated over the 8 categories and for
-- each one issued 2–3 separate SELECT statements (mission_id lookup +
-- category_effective_language() EXISTS checks + mission_versions join).
-- With 8 categories that was ~24 round-trips on every curriculum page load.
--
-- After: a single query with CTEs replaces the entire loop:
--   • cat_lang CTE   — inlines category_effective_language() logic
--   • done_missions  — pre-builds the completion set (one table scan,
--                      replaces 8 correlated EXISTS subqueries)
--   • Final SELECT   — single JOIN from categories → level_missions →
--                      missions → mission_versions → done_missions
--
-- The two scalar queries for unit/level completion totals remain; they
-- are each one indexed scan and are not part of the loop N+1.
-- ============================================================

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
  level_complete    boolean,
  unit              integer,
  unit_complete     boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language       text;
  v_level          integer;
  v_unit           integer;
  v_unit_total     integer;
  v_unit_done      integer;
  v_unit_complete  boolean;
  v_level_total    integer;
  v_level_done     integer;
  v_level_complete boolean;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  select gcp.level_number, gcp.unit_number into v_level, v_unit
  from get_current_position(p_child_id, v_language) gcp;

  -- Scalar completion totals (unchanged — each is one indexed scan)
  select count(*) into v_unit_total
  from level_missions lm
  where lm.level_number = v_level and lm.unit_number = v_unit
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_unit_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level and lm.unit_number = v_unit;

  v_unit_complete := v_unit_total > 0 and v_unit_done >= v_unit_total;

  select count(*) into v_level_total
  from level_missions lm
  where lm.level_number = v_level
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_level_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level;

  v_level_complete := v_level_total > 0 and v_level_done >= v_level_total;

  -- ── Single JOIN query replaces the 8-iteration category loop ─────────────
  -- cat_lang: inlines category_effective_language() — 8 rows, no loop
  -- done_missions: one scan of child_progress for this child, reused
  -- everywhere instead of a correlated EXISTS per mission row
  return query
  with cat_lang as (
    select
      c.slug       as category_slug,
      c.sort_order,
      case
        when exists (
          select 1 from missions mx
          join mission_versions mvx
            on mvx.mission_id = mx.id and mvx.language = v_language and mvx.published
          where mx.category_slug = c.slug and mx.active
        ) then v_language
        when v_language <> 'en' and exists (
          select 1 from missions mx
          join mission_versions mvx
            on mvx.mission_id = mx.id and mvx.language = 'en' and mvx.published
          where mx.category_slug = c.slug and mx.active
        ) then 'en'
        else v_language
      end as effective_lang
    from categories c
  ),
  done_missions as (
    -- Pre-build the completion set once; replaces 8 correlated EXISTS per loop iteration
    select lm2.mission_id
    from level_missions lm2
    join child_progress cp2
      on cp2.mission_id = lm2.mission_id
      and cp2.child_id  = p_child_id
      and cp2.language  = v_language
    where lm2.level_number = v_level and lm2.unit_number = v_unit
  )
  select
    m.id,
    m.story_id,
    v_level          as level,
    m.type,
    mv.title,
    m.duration_minutes,
    mv.media_url,
    lm.category_slug as category,
    m.stars,
    mv.subtitle,
    mv.tip_text,
    mv.content_json  as content,
    (dm.mission_id is not null) as completed,
    v_level_complete as level_complete,
    v_unit           as unit,
    v_unit_complete  as unit_complete
  from cat_lang cl
  join level_missions lm
    on  lm.category_slug = cl.category_slug
    and lm.level_number  = v_level
    and lm.unit_number   = v_unit
  join missions m
    on  m.id = lm.mission_id
  join mission_versions mv
    on  mv.mission_id = m.id
    and mv.language   = cl.effective_lang
    and mv.published  = true
  left join done_missions dm on dm.mission_id = m.id
  order by cl.sort_order;
end;
$$;

grant execute on function get_curriculum_missions(uuid) to authenticated;
