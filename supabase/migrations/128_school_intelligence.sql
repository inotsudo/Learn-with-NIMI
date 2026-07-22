-- ============================================================
-- 128: School Intelligence
--   • schools              — licensed school entities
--   • school_admins        — portal access (owner/admin/teacher/viewer)
--   • school_enrollments   — children enrolled in a school/class
--   • teacher_profiles.school_id FK (backlink)
--   • RPCs for dashboard, analytics, curriculum, licensing, reports
-- ============================================================

-- ── 1. SCHOOLS ───────────────────────────────────────────────────

create table if not exists schools (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  country        text not null default 'RW',
  city           text,
  contact_name   text,
  contact_email  text,
  logo_url       text,
  license_type   text not null default 'standard'
                   check (license_type in ('trial','standard','premium','enterprise')),
  seat_count     int  not null default 30,
  license_start  date,
  license_end    date,
  auto_renew     boolean not null default true,
  is_active      boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table schools enable row level security;

-- ── 2. SCHOOL ADMINS ─────────────────────────────────────────────

create table if not exists school_admins (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin'
               check (role in ('owner','admin','teacher','viewer')),
  created_at timestamptz default now(),
  unique(school_id, user_id)
);

alter table school_admins enable row level security;

-- ── 3. SCHOOL ENROLLMENTS ────────────────────────────────────────

create table if not exists school_enrollments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  class_code  text,
  enrolled_at timestamptz default now(),
  unique(school_id, child_id)
);

alter table school_enrollments enable row level security;

-- ── 4. BACKLINK: teacher_profiles → schools ───────────────────────

alter table teacher_profiles
  add column if not exists school_id uuid references schools(id) on delete set null;

create index if not exists teacher_profiles_school_id_idx on teacher_profiles(school_id);

-- ── 5. INDEXES ───────────────────────────────────────────────────

create index if not exists school_admins_user_idx    on school_admins(user_id);
create index if not exists school_admins_school_idx  on school_admins(school_id);
create index if not exists school_enrollments_school on school_enrollments(school_id);
create index if not exists school_enrollments_child  on school_enrollments(child_id);

-- ── 6. RLS HELPER ────────────────────────────────────────────────

create or replace function is_school_member(p_school_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from school_admins
    where school_id = p_school_id
      and user_id   = auth.uid()
  );
$$;

create or replace function my_school_id()
returns uuid language sql security definer as $$
  select school_id from school_admins
  where user_id = auth.uid()
  order by created_at
  limit 1;
$$;

-- ── 7. RLS POLICIES ──────────────────────────────────────────────

-- schools
drop policy if exists "school member: read own school" on schools;
create policy "school member: read own school"
  on schools for select
  using (is_school_member(id));

drop policy if exists "admin: manage schools" on schools;
create policy "admin: manage schools"
  on schools for all
  using (exists (select 1 from admins where id = auth.uid()));

-- school_admins
drop policy if exists "school member: read own school_admins" on school_admins;
create policy "school member: read own school_admins"
  on school_admins for select
  using (is_school_member(school_id));

drop policy if exists "admin: manage school_admins" on school_admins;
create policy "admin: manage school_admins"
  on school_admins for all
  using (exists (select 1 from admins where id = auth.uid()));

-- school_enrollments
drop policy if exists "school member: read own enrollments" on school_enrollments;
create policy "school member: read own enrollments"
  on school_enrollments for select
  using (is_school_member(school_id));

drop policy if exists "admin: manage school_enrollments" on school_enrollments;
create policy "admin: manage school_enrollments"
  on school_enrollments for all
  using (exists (select 1 from admins where id = auth.uid()));

-- ── 8. RPC: get_my_school ────────────────────────────────────────

create or replace function get_my_school()
returns table (
  school_id     uuid,
  school_name   text,
  country       text,
  city          text,
  contact_name  text,
  contact_email text,
  logo_url      text,
  license_type  text,
  seat_count    int,
  license_start date,
  license_end   date,
  auto_renew    boolean,
  is_active     boolean,
  my_role       text
)
language sql security definer as $$
  select
    s.id             as school_id,
    s.name           as school_name,
    s.country,
    s.city,
    s.contact_name,
    s.contact_email,
    s.logo_url,
    s.license_type,
    s.seat_count,
    s.license_start,
    s.license_end,
    s.auto_renew,
    s.is_active,
    sa.role          as my_role
  from schools s
  join school_admins sa on sa.school_id = s.id and sa.user_id = auth.uid()
  where s.is_active = true
  order by sa.created_at
  limit 1;
$$;

-- ── 9. RPC: get_school_dashboard_stats ───────────────────────────

create or replace function get_school_dashboard_stats(p_school_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_total_enrolled    bigint;
  v_active_this_week  bigint;
  v_missions_30d      bigint;
  v_avg_stars         numeric;
  v_classes           jsonb;
  v_recent_activity   jsonb;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  -- total enrolled
  select count(*) into v_total_enrolled
  from school_enrollments
  where school_id = p_school_id;

  -- active this week (had at least 1 mission completion)
  select count(distinct se.child_id) into v_active_this_week
  from school_enrollments se
  join child_progress cp on cp.child_id = se.child_id
  where se.school_id = p_school_id
    and cp.completed_at >= now() - interval '7 days';

  -- missions completed in last 30 days
  select count(*) into v_missions_30d
  from school_enrollments se
  join child_progress cp on cp.child_id = se.child_id
  where se.school_id = p_school_id
    and cp.completed_at >= now() - interval '30 days';

  -- avg stars per learner (all time)
  select coalesce(
    avg(sub.total_stars), 0
  ) into v_avg_stars
  from (
    select se.child_id, coalesce(sum(m.stars), 0) as total_stars
    from school_enrollments se
    left join child_progress cp on cp.child_id = se.child_id
    left join missions m on m.id = cp.mission_id
    where se.school_id = p_school_id
    group by se.child_id
  ) sub;

  -- classes: teacher + learner count
  select coalesce(jsonb_agg(cls order by cls->>'class_name'), '[]')
  into v_classes
  from (
    select jsonb_build_object(
      'class_code',    tp.class_code,
      'class_name',    coalesce(tp.class_name, 'Unnamed Class'),
      'teacher_name',  tp.name,
      'teacher_email', tp.email,
      'learner_count', count(se.child_id)
    ) as cls
    from teacher_profiles tp
    left join school_enrollments se
      on se.school_id = p_school_id and se.class_code = tp.class_code
    where tp.school_id = p_school_id
    group by tp.class_code, tp.class_name, tp.name, tp.email
  ) sub;

  -- recent activity: last 10 mission completions
  select coalesce(jsonb_agg(act order by act->>'completed_at' desc), '[]')
  into v_recent_activity
  from (
    select jsonb_build_object(
      'child_name',    c.name,
      'mission_type',  m.type,
      'story_title',   s.title,
      'completed_at',  cp.completed_at
    ) as act
    from school_enrollments se
    join child_progress cp on cp.child_id = se.child_id
    join children c        on c.id = cp.child_id
    join missions m        on m.id = cp.mission_id
    join stories s         on s.id = m.story_id
    where se.school_id = p_school_id
    order by cp.completed_at desc
    limit 10
  ) sub;

  return jsonb_build_object(
    'total_enrolled',   v_total_enrolled,
    'active_this_week', v_active_this_week,
    'missions_30d',     v_missions_30d,
    'avg_stars',        round(v_avg_stars),
    'classes',          coalesce(v_classes, '[]'),
    'recent_activity',  coalesce(v_recent_activity, '[]')
  );
end;
$$;

-- ── 10. RPC: get_school_analytics ────────────────────────────────

create or replace function get_school_analytics(
  p_school_id uuid,
  p_days      int default 30
)
returns jsonb
language plpgsql security definer as $$
declare
  v_daily_active  jsonb;
  v_lang_dist     jsonb;
  v_mission_types jsonb;
  v_top_learners  jsonb;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  -- daily active learners over p_days
  select coalesce(jsonb_agg(d order by d->>'date'), '[]')
  into v_daily_active
  from (
    select jsonb_build_object(
      'date',   (now() - (s.n || ' days')::interval)::date,
      'active', count(distinct se.child_id)
    ) as d
    from generate_series(p_days - 1, 0, -1) as s(n)
    left join school_enrollments se on se.school_id = p_school_id
    left join child_progress cp
      on cp.child_id = se.child_id
      and cp.completed_at::date = (now() - (s.n || ' days')::interval)::date
    group by s.n
    order by s.n desc
  ) sub;

  -- language distribution
  select coalesce(jsonb_agg(l), '[]')
  into v_lang_dist
  from (
    select jsonb_build_object(
      'language', c.language,
      'count',    count(*)
    ) as l
    from school_enrollments se
    join children c on c.id = se.child_id
    where se.school_id = p_school_id
    group by c.language
    order by count(*) desc
  ) sub;

  -- mission type breakdown
  select coalesce(jsonb_agg(t), '[]')
  into v_mission_types
  from (
    select jsonb_build_object(
      'type',  m.type,
      'count', count(*)
    ) as t
    from school_enrollments se
    join child_progress cp on cp.child_id = se.child_id
    join missions m on m.id = cp.mission_id
    where se.school_id = p_school_id
      and cp.completed_at >= now() - (p_days || ' days')::interval
    group by m.type
    order by count(*) desc
  ) sub;

  -- top 10 learners by missions completed (30d)
  select coalesce(jsonb_agg(lrn order by (lrn->>'missions_done')::int desc), '[]')
  into v_top_learners
  from (
    select jsonb_build_object(
      'child_name',   c.name,
      'language',     c.language,
      'missions_done', count(distinct cp.id),
      'stars',        coalesce(sum(m.stars), 0)
    ) as lrn
    from school_enrollments se
    join children c on c.id = se.child_id
    left join child_progress cp
      on cp.child_id = c.id
      and cp.completed_at >= now() - (p_days || ' days')::interval
    left join missions m on m.id = cp.mission_id
    where se.school_id = p_school_id
    group by c.id, c.name, c.language
    order by count(distinct cp.id) desc
    limit 10
  ) sub;

  return jsonb_build_object(
    'daily_active',  v_daily_active,
    'lang_dist',     v_lang_dist,
    'mission_types', v_mission_types,
    'top_learners',  v_top_learners
  );
end;
$$;

-- ── 11. RPC: get_school_curriculum_insights ───────────────────────

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

  -- per-story: learners started, completion rate
  select coalesce(jsonb_agg(s_row order by s_row->>'sort_order'), '[]')
  into v_story_coverage
  from (
    select jsonb_build_object(
      'story_id',          s.id,
      'story_title',       s.title,
      'story_emoji',       s.theme_emoji,
      'sort_order',        s.sort_order,
      'total_missions',    count(distinct m.id),
      'learners_started',  count(distinct cp.child_id),
      'learners_finished', count(distinct cp.child_id) filter (
        where mission_rank.rank = count(distinct m.id)
      ),
      'completion_pct',    case
        when v_total_learners = 0 then 0
        else round(100.0 * count(distinct cp.child_id) / v_total_learners)
      end
    ) as s_row
    from stories s
    left join missions m on m.story_id = s.id
    left join (
      select cp2.child_id, m2.story_id,
             count(*) over (partition by cp2.child_id, m2.story_id) as rank
      from child_progress cp2
      join missions m2 on m2.id = cp2.mission_id
      join school_enrollments se2 on se2.child_id = cp2.child_id and se2.school_id = p_school_id
      join children c2 on c2.id = cp2.child_id
      where p_language is null or c2.language = p_language
    ) mission_rank on mission_rank.child_id = (
      select child_id from school_enrollments where school_id = p_school_id limit 1
    ) and mission_rank.story_id = s.id
    left join child_progress cp
      on cp.mission_id = m.id
      and exists (
        select 1 from school_enrollments se3
        join children c3 on c3.id = se3.child_id
        where se3.school_id = p_school_id
          and se3.child_id = cp.child_id
          and (p_language is null or c3.language = p_language)
      )
    where s.is_active = true
    group by s.id, s.title, s.theme_emoji, s.sort_order
    order by s.sort_order
  ) sub;

  -- mission type completion rates
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
    'story_coverage', v_story_coverage,
    'mission_rates',  v_mission_rates
  );
end;
$$;

-- ── 12. RPC: get_school_license_info ─────────────────────────────

create or replace function get_school_license_info(p_school_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_school        schools%rowtype;
  v_seats_used    int;
  v_class_seats   jsonb;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  select * into v_school from schools where id = p_school_id;

  select count(*) into v_seats_used
  from school_enrollments
  where school_id = p_school_id;

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

  return jsonb_build_object(
    'license_type',  v_school.license_type,
    'seat_count',    v_school.seat_count,
    'seats_used',    v_seats_used,
    'seats_free',    greatest(0, v_school.seat_count - v_seats_used),
    'license_start', v_school.license_start,
    'license_end',   v_school.license_end,
    'auto_renew',    v_school.auto_renew,
    'days_remaining', case
      when v_school.license_end is null then null
      else greatest(0, (v_school.license_end - current_date)::int)
    end,
    'class_seats',   v_class_seats
  );
end;
$$;

-- ── 13. RPC: generate_school_report ──────────────────────────────

create or replace function generate_school_report(
  p_school_id  uuid,
  p_type       text,    -- 'activity' | 'curriculum' | 'license' | 'learner'
  p_date_from  date default (current_date - interval '30 days')::date,
  p_date_to    date default current_date
)
returns jsonb
language plpgsql security definer as $$
declare
  v_rows jsonb;
begin
  if not is_school_member(p_school_id) then
    raise exception 'Unauthorized';
  end if;

  if p_type = 'activity' then
    select coalesce(jsonb_agg(r), '[]') into v_rows
    from (
      select jsonb_build_object(
        'date',          cp.completed_at::date,
        'child_name',    c.name,
        'language',      c.language,
        'mission_type',  m.type,
        'story_title',   s.title,
        'stars_earned',  coalesce(m.stars, 0)
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
        'story_title',       s.title,
        'mission_type',      m.type,
        'completions',       count(distinct cp.id),
        'unique_learners',   count(distinct cp.child_id),
        'total_stars_given', coalesce(sum(m.stars), 0)
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

  else
    -- license snapshot
    v_rows := get_school_license_info(p_school_id);
  end if;

  return jsonb_build_object(
    'report_type', p_type,
    'date_from',   p_date_from,
    'date_to',     p_date_to,
    'generated_at',now(),
    'rows',        coalesce(v_rows, '[]')
  );
end;
$$;
