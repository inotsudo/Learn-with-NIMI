-- ============================================================
-- 129: School Intelligence v2
--   • Fix get_school_curriculum_insights — learners_finished was broken
--   • Add get_at_risk_learners RPC
--   • Add get_school_class_comparison RPC
--   • Add ROI fields to get_school_license_info
--   • Add executive summary to generate_school_report
-- ============================================================

-- ── 1. FIX: get_school_curriculum_insights ────────────────────────
-- Previous learners_finished joined mission_rank to an arbitrary single
-- child_id (limit 1) making the count meaningless. Rewritten with
-- correlated scalar subqueries per story.

create or replace function get_school_curriculum_insights(
  p_school_id uuid,
  p_language  text default null
)
returns jsonb
language plpgsql security definer as $$
declare
  v_story_coverage  jsonb;
  v_mission_rates   jsonb;
  v_total_learners  bigint;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  select count(*) into v_total_learners
  from school_enrollments se
  join children c on c.id = se.child_id
  where se.school_id = p_school_id
    and (p_language is null or c.language = p_language);

  select coalesce(jsonb_agg(s_row order by s_row->>'sort_order'), '[]')
  into v_story_coverage
  from (
    select jsonb_build_object(
      'story_id',     s.id,
      'story_title',  s.title,
      'story_emoji',  s.theme_emoji,
      'sort_order',   s.sort_order,

      -- total published missions in this story
      'total_missions', (
        select count(*) from missions m2 where m2.story_id = s.id
      ),

      -- learners who touched at least 1 mission in this story
      'learners_started', (
        select count(distinct cp2.child_id)
        from child_progress cp2
        join missions m2 on m2.id = cp2.mission_id
        join school_enrollments se2 on se2.child_id = cp2.child_id
          and se2.school_id = p_school_id
        join children c2 on c2.id = cp2.child_id
        where m2.story_id = s.id
          and (p_language is null or c2.language = p_language)
      ),

      -- learners who completed EVERY mission in this story
      'learners_finished', (
        select count(*)
        from (
          select cp3.child_id
          from child_progress cp3
          join missions m3 on m3.id = cp3.mission_id
          join school_enrollments se3 on se3.child_id = cp3.child_id
            and se3.school_id = p_school_id
          join children c3 on c3.id = cp3.child_id
          where m3.story_id = s.id
            and (p_language is null or c3.language = p_language)
          group by cp3.child_id
          having count(distinct cp3.mission_id) >= (
            select count(*) from missions m4 where m4.story_id = s.id
          )
        ) finishers
      ),

      -- % of all enrolled learners who started this story
      'completion_pct', case
        when v_total_learners = 0 then 0
        else round(100.0 * (
          select count(distinct cp5.child_id)
          from child_progress cp5
          join missions m5 on m5.id = cp5.mission_id
          join school_enrollments se5 on se5.child_id = cp5.child_id
            and se5.school_id = p_school_id
          join children c5 on c5.id = cp5.child_id
          where m5.story_id = s.id
            and (p_language is null or c5.language = p_language)
        ) / v_total_learners)
      end
    ) as s_row
    from stories s
    where s.is_active = true
  ) sub;

  -- mission type completion rates (unchanged)
  select coalesce(jsonb_agg(t_row), '[]')
  into v_mission_rates
  from (
    select jsonb_build_object(
      'type',           m.type,
      'total_missions', count(distinct m.id),
      'completions',    count(distinct cp.id)
    ) as t_row
    from missions m
    left join child_progress cp
      on cp.mission_id = m.id
      and exists (
        select 1 from school_enrollments se4
        where se4.school_id = p_school_id
          and se4.child_id = cp.child_id
      )
    group by m.type
    order by count(distinct cp.id) desc
  ) sub;

  return jsonb_build_object(
    'total_learners', v_total_learners,
    'story_coverage', coalesce(v_story_coverage, '[]'),
    'mission_rates',  coalesce(v_mission_rates,  '[]')
  );
end;
$$;

-- ── 2. NEW: get_at_risk_learners ──────────────────────────────────
-- Returns learners who: (a) have never started, (b) inactive 7+ days,
-- or (c) complete <50% of the school average mission count.

create or replace function get_at_risk_learners(p_school_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_school_avg numeric;
  v_rows       jsonb;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  -- school average missions all-time (per enrolled learner)
  select coalesce(avg(sub.mc), 0) into v_school_avg
  from (
    select se.child_id, count(distinct cp.id) as mc
    from school_enrollments se
    left join child_progress cp on cp.child_id = se.child_id
    where se.school_id = p_school_id
    group by se.child_id
  ) sub;

  select coalesce(jsonb_agg(r order by r->>'days_inactive' desc nulls first), '[]')
  into v_rows
  from (
    select jsonb_build_object(
      'child_name',         c.name,
      'language',           c.language,
      'class_name',         coalesce(tp.class_name, 'Unassigned'),
      'missions_all_time',  count(distinct cp.id),
      'last_active',        max(cp.completed_at),
      'days_inactive',      case
        when max(cp.completed_at) is null then null
        else extract(epoch from now() - max(cp.completed_at))::int / 86400
      end,
      'school_avg',         round(v_school_avg),
      'risk_flags',         (
        select jsonb_agg(flag) from unnest(array_remove(array[
          case when max(cp.completed_at) is null
               then 'never_started' end,
          case when max(cp.completed_at) is not null
               and max(cp.completed_at) < now() - interval '14 days'
               then 'inactive_14d' end,
          case when max(cp.completed_at) is not null
               and max(cp.completed_at) < now() - interval '7 days'
               and max(cp.completed_at) >= now() - interval '14 days'
               then 'inactive_7d' end,
          case when count(distinct cp.id) > 0
               and v_school_avg > 0
               and count(distinct cp.id) < v_school_avg * 0.5
               then 'low_engagement' end
        ], null)) as flag
      )
    ) as r
    from school_enrollments se
    join children c on c.id = se.child_id
    left join teacher_profiles tp
      on tp.school_id = p_school_id and tp.class_code = se.class_code
    left join child_progress cp on cp.child_id = c.id
    where se.school_id = p_school_id
    group by c.id, c.name, c.language, tp.class_name
    having
      -- at-risk criteria (any one triggers inclusion)
      max(cp.completed_at) is null
      or max(cp.completed_at) < now() - interval '7 days'
      or (
        v_school_avg > 0
        and count(distinct cp.id) < v_school_avg * 0.5
        and count(distinct cp.id) > 0
      )
    order by
      case when max(cp.completed_at) is null then 0 else 1 end,
      max(cp.completed_at)
    limit 50
  ) sub;

  return jsonb_build_object(
    'school_avg',   round(v_school_avg),
    'learners',     coalesce(v_rows, '[]')
  );
end;
$$;

-- ── 3. NEW: get_school_class_comparison ───────────────────────────
-- Per-class engagement benchmarks for the Analytics page.

create or replace function get_school_class_comparison(p_school_id uuid)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  select coalesce(jsonb_agg(r order by (r->>'weekly_active_pct')::int desc), '[]')
  into v_rows
  from (
    select jsonb_build_object(
      'class_name',           coalesce(tp.class_name, 'Unassigned'),
      'teacher_name',         tp.name,
      'learner_count',        count(distinct se.child_id),
      'weekly_active',        count(distinct se.child_id) filter (
        where cp.completed_at >= now() - interval '7 days'
      ),
      'weekly_active_pct', case
        when count(distinct se.child_id) = 0 then 0
        else round(
          100.0
          * count(distinct se.child_id) filter (
              where cp.completed_at >= now() - interval '7 days'
            )
          / count(distinct se.child_id)
        )
      end,
      'avg_missions_7d',      round(
        count(cp.id) filter (where cp.completed_at >= now() - interval '7 days')::numeric
        / greatest(count(distinct se.child_id), 1),
        1
      ),
      'avg_stars_all_time',   round(
        coalesce(sum(m.stars) filter (where m.stars is not null), 0)::numeric
        / greatest(count(distinct se.child_id), 1),
        0
      )
    ) as r
    from teacher_profiles tp
    join school_enrollments se
      on se.school_id = p_school_id and se.class_code = tp.class_code
    left join child_progress cp on cp.child_id = se.child_id
    left join missions m on m.id = cp.mission_id
    where tp.school_id = p_school_id
    group by tp.class_name, tp.name
    order by 1 desc
  ) sub;

  return v_rows;
end;
$$;

-- ── 4. UPDATED: get_school_license_info + ROI metrics ────────────

create or replace function get_school_license_info(p_school_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_school          schools%rowtype;
  v_seats_used      int;
  v_class_seats     jsonb;
  v_total_missions  bigint;
  v_stories_mastered bigint;
  v_active_languages bigint;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  select * into v_school from schools where id = p_school_id;

  select count(*) into v_seats_used
  from school_enrollments where school_id = p_school_id;

  select coalesce(jsonb_agg(cs), '[]') into v_class_seats
  from (
    select jsonb_build_object(
      'class_name',   coalesce(tp.class_name, 'Unnamed Class'),
      'teacher_name', tp.name,
      'seat_count',   count(se.child_id)
    ) as cs
    from teacher_profiles tp
    left join school_enrollments se
      on se.school_id = p_school_id and se.class_code = tp.class_code
    where tp.school_id = p_school_id
    group by tp.class_name, tp.name
    order by count(se.child_id) desc
  ) sub;

  -- ROI: total missions all-time
  select count(distinct cp.id) into v_total_missions
  from school_enrollments se
  join child_progress cp on cp.child_id = se.child_id
  where se.school_id = p_school_id;

  -- ROI: stories where ≥50% of enrolled learners finished all missions
  select count(*) into v_stories_mastered
  from (
    select s.id
    from stories s
    join missions m on m.story_id = s.id
    where s.is_active = true
    group by s.id
    having (
      select count(distinct finishers.child_id)
      from (
        select cp2.child_id
        from child_progress cp2
        join missions m2 on m2.id = cp2.mission_id
        join school_enrollments se2 on se2.child_id = cp2.child_id
          and se2.school_id = p_school_id
        where m2.story_id = s.id
        group by cp2.child_id
        having count(distinct cp2.mission_id) >= count(distinct m.id)
      ) finishers
    ) >= greatest(1, (select count(*) from school_enrollments where school_id = p_school_id) * 0.5)
  ) t;

  -- ROI: languages with at least 5 mission completions
  select count(distinct c.language) into v_active_languages
  from school_enrollments se
  join children c on c.id = se.child_id
  join child_progress cp on cp.child_id = c.id
  where se.school_id = p_school_id
  having count(distinct cp.id) >= 5;

  return jsonb_build_object(
    'license_type',           v_school.license_type,
    'seat_count',             v_school.seat_count,
    'seats_used',             v_seats_used,
    'seats_free',             greatest(0, v_school.seat_count - v_seats_used),
    'license_start',          v_school.license_start,
    'license_end',            v_school.license_end,
    'auto_renew',             v_school.auto_renew,
    'days_remaining',         case
      when v_school.license_end is null then null
      else greatest(0, (v_school.license_end - current_date)::int)
    end,
    'class_seats',            v_class_seats,
    -- ROI metrics
    'total_missions',         v_total_missions,
    'estimated_learning_min', v_total_missions * 8,
    'stories_mastered',       coalesce(v_stories_mastered, 0),
    'active_languages',       coalesce(v_active_languages, 0)
  );
end;
$$;

-- ── 5. UPDATED: generate_school_report + executive type ───────────

create or replace function generate_school_report(
  p_school_id  uuid,
  p_type       text,
  p_date_from  date default (current_date - interval '30 days')::date,
  p_date_to    date default current_date
)
returns jsonb
language plpgsql security definer as $$
declare
  v_rows          jsonb;
  v_school_name   text;
  v_enrolled      bigint;
  v_active        bigint;
  v_missions      bigint;
  v_learn_hrs     numeric;
  v_top_story     text;
  v_top_class     text;
  v_at_risk_count bigint;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  if p_type = 'activity' then
    select coalesce(jsonb_agg(r), '[]') into v_rows
    from (
      select jsonb_build_object(
        'date',         cp.completed_at::date,
        'child_name',   c.name,
        'language',     c.language,
        'mission_type', m.type,
        'story_title',  s.title,
        'stars_earned', coalesce(m.stars, 0)
      ) as r
      from school_enrollments se
      join child_progress cp on cp.child_id = se.child_id
      join children c        on c.id = cp.child_id
      join missions m        on m.id = cp.mission_id
      join stories s         on s.id = m.story_id
      where se.school_id = p_school_id
        and cp.completed_at::date between p_date_from and p_date_to
      order by cp.completed_at desc
      limit 2000
    ) sub;

  elsif p_type = 'learner' then
    select coalesce(jsonb_agg(r), '[]') into v_rows
    from (
      select jsonb_build_object(
        'child_name',     c.name,
        'language',       c.language,
        'age',            c.age,
        'enrolled_at',    se.enrolled_at::date,
        'missions_total', count(distinct cp.id),
        'stars_total',    coalesce(sum(m.stars), 0),
        'last_active',    max(cp.completed_at)::date
      ) as r
      from school_enrollments se
      join children c on c.id = se.child_id
      left join child_progress cp
        on cp.child_id = c.id
        and cp.completed_at::date between p_date_from and p_date_to
      left join missions m on m.id = cp.mission_id
      where se.school_id = p_school_id
      group by c.id, c.name, c.language, c.age, se.enrolled_at
      order by c.name
    ) sub;

  elsif p_type = 'curriculum' then
    select coalesce(jsonb_agg(r), '[]') into v_rows
    from (
      select jsonb_build_object(
        'story_title',      s.title,
        'mission_type',     m.type,
        'completions',      count(distinct cp.id),
        'unique_learners',  count(distinct cp.child_id),
        'total_stars_given',coalesce(sum(m.stars), 0)
      ) as r
      from missions m
      join stories s on s.id = m.story_id
      left join child_progress cp
        on cp.mission_id = m.id
        and cp.completed_at::date between p_date_from and p_date_to
        and exists (
          select 1 from school_enrollments se2
          where se2.school_id = p_school_id and se2.child_id = cp.child_id
        )
      group by s.title, m.type
      order by s.title, m.type
    ) sub;

  elsif p_type = 'license' then
    v_rows := get_school_license_info(p_school_id);

  elsif p_type = 'executive' then
    -- Build a structured executive summary
    select s.name into v_school_name from schools s where s.id = p_school_id;

    select count(*) into v_enrolled
    from school_enrollments where school_id = p_school_id;

    select count(distinct se.child_id) into v_active
    from school_enrollments se
    join child_progress cp on cp.child_id = se.child_id
    where se.school_id = p_school_id
      and cp.completed_at::date between p_date_from and p_date_to;

    select count(*) into v_missions
    from school_enrollments se
    join child_progress cp on cp.child_id = se.child_id
    where se.school_id = p_school_id
      and cp.completed_at::date between p_date_from and p_date_to;

    v_learn_hrs := round(v_missions * 8.0 / 60, 1);

    select s.title into v_top_story
    from school_enrollments se
    join child_progress cp on cp.child_id = se.child_id
    join missions m on m.id = cp.mission_id
    join stories s on s.id = m.story_id
    where se.school_id = p_school_id
      and cp.completed_at::date between p_date_from and p_date_to
    group by s.id, s.title
    order by count(*) desc
    limit 1;

    select coalesce(tp.class_name, 'Unassigned') into v_top_class
    from teacher_profiles tp
    join school_enrollments se on se.school_id = p_school_id and se.class_code = tp.class_code
    join child_progress cp on cp.child_id = se.child_id
    where tp.school_id = p_school_id
      and cp.completed_at::date between p_date_from and p_date_to
    group by tp.class_name
    order by count(distinct se.child_id) desc
    limit 1;

    select count(*) into v_at_risk_count
    from school_enrollments se
    join children c on c.id = se.child_id
    left join child_progress cp on cp.child_id = c.id
    where se.school_id = p_school_id
    group by c.id
    having
      max(cp.completed_at) is null
      or max(cp.completed_at) < now() - interval '7 days';

    v_rows := jsonb_build_object(
      'school_name',        v_school_name,
      'period',             p_date_from || ' to ' || p_date_to,
      'total_enrolled',     v_enrolled,
      'active_learners',    v_active,
      'engagement_rate_pct', case when v_enrolled = 0 then 0
        else round(100.0 * v_active / v_enrolled) end,
      'missions_completed', v_missions,
      'learning_hours',     v_learn_hrs,
      'most_engaged_story', coalesce(v_top_story, 'None'),
      'most_engaged_class', coalesce(v_top_class, 'None'),
      'learners_at_risk',   v_at_risk_count,
      'insights', jsonb_build_array(
        case when v_active > 0 and v_enrolled > 0
          then round(100.0 * v_active / v_enrolled) || '% of learners were active in this period'
          else 'No learner activity recorded in this period'
        end,
        case when v_missions > 0
          then v_missions || ' missions completed — approximately ' || v_learn_hrs || ' learning hours delivered'
          else 'No missions completed in this period'
        end,
        case when v_at_risk_count > 0
          then v_at_risk_count || ' learner(s) inactive for 7+ days and may need teacher outreach'
          else 'All learners are recently active — great engagement!'
        end,
        case when v_top_story is not null
          then '"' || v_top_story || '" was the most completed story this period'
          else null
        end
      )
    );

  else
    return jsonb_build_object('error', 'Unknown report type');
  end if;

  return jsonb_build_object(
    'report_type',  p_type,
    'date_from',    p_date_from,
    'date_to',      p_date_to,
    'generated_at', now(),
    'rows',         coalesce(v_rows, '[]')
  );
end;
$$;
