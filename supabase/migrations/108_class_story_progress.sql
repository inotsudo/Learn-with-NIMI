-- ============================================================
-- 108: Class story progress — mission-level view for teachers
-- ============================================================

-- ── 1. Full story library with class aggregate progress ───────────

create or replace function get_class_story_library()
returns table (
  story_id          uuid,
  story_title       text,
  story_slug        text,
  theme_emoji       text,
  age_min           integer,
  age_max           integer,
  category          text,
  is_free           boolean,
  total_slots       bigint,
  total_students    bigint,
  students_started  bigint,
  students_complete bigint
)
language sql security definer stable as $$
  with
  class_size as (
    select count(*) as n from children where teacher_id = auth.uid()
  ),
  slot_counts as (
    select story_id, count(*) as n from story_slots group by story_id
  ),
  student_progress as (
    select ss.story_id, cp.child_id, count(*) as slots_done
    from story_slots ss
    join child_progress cp on cp.mission_id = ss.mission_id
    join children       c  on c.id = cp.child_id and c.teacher_id = auth.uid()
    group by ss.story_id, cp.child_id
  )
  select
    s.id,
    s.title,
    s.slug,
    s.theme_emoji,
    s.age_min,
    s.age_max,
    s.category,
    s.is_free,
    coalesce(sc.n, 0)                                                             as total_slots,
    cs.n                                                                           as total_students,
    count(distinct sp.child_id)                                                   as students_started,
    count(distinct case
      when sc.n > 0 and sp.slots_done >= sc.n then sp.child_id
    end)                                                                           as students_complete
  from stories s
  cross join class_size cs
  left join slot_counts    sc on sc.story_id = s.id
  left join student_progress sp on sp.story_id = s.id
  where s.status = 'published'
  group by s.id, s.title, s.slug, s.theme_emoji, s.age_min, s.age_max,
           s.category, s.is_free, sc.n, cs.n
  order by s.sort_order;
$$;


-- ── 2. Per-slot completion breakdown for one story ────────────────

create or replace function get_teacher_class_story_progress(p_story_id uuid)
returns table (
  slot_key        text,
  slot_order      integer,
  mission_type    text,
  total_students  bigint,
  completed_count bigint
)
language sql security definer stable as $$
  select
    ss.slot_key,
    ss.sort_order,
    m.type,
    (select count(*) from children c0 where c0.teacher_id = auth.uid()) as total_students,
    count(distinct cp.child_id) as completed_count
  from story_slots ss
  join missions m on m.id = ss.mission_id
  left join child_progress cp
    on  cp.mission_id = ss.mission_id
    and exists (
      select 1 from children c
      where c.id = cp.child_id and c.teacher_id = auth.uid()
    )
  where ss.story_id = p_story_id
  group by ss.slot_key, ss.sort_order, m.type
  order by ss.sort_order;
$$;
