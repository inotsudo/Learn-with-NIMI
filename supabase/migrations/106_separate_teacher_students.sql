-- ============================================================
-- 106: Properly separate teacher-owned students from parent-owned children
--
-- Before: teachers inserted children with parent_id = teacher.uid
-- After:  children have a nullable teacher_id column; parent_id stays
--         for real parent accounts; the two are never mixed
-- ============================================================

-- ── 1. Add teacher_id to children ────────────────────────────────

alter table children
  add column if not exists teacher_id uuid references teacher_profiles(id) on delete set null;

create index if not exists children_teacher_id_idx on children(teacher_id);

-- ── 2. Make parent_id nullable (teachers won't supply it) ─────────

alter table children
  alter column parent_id drop not null;

-- ── 3. Backfill: move teacher-owned children to teacher_id ────────

update children c
set
  teacher_id = c.parent_id,
  parent_id  = null
where exists (
  select 1 from teacher_profiles tp where tp.id = c.parent_id
);

-- ── 4. RLS: teacher access to their own students ──────────────────

drop policy if exists "teacher: select own students"  on children;
drop policy if exists "teacher: insert own students"  on children;
drop policy if exists "teacher: update own students"  on children;
drop policy if exists "teacher: delete own students"  on children;

create policy "teacher: select own students"
  on children for select
  using (teacher_id = auth.uid());

create policy "teacher: insert own students"
  on children for insert
  with check (teacher_id = auth.uid() and parent_id is null);

create policy "teacher: update own students"
  on children for update
  using (teacher_id = auth.uid());

create policy "teacher: delete own students"
  on children for delete
  using (teacher_id = auth.uid());

-- ── 5. Update RPCs to use teacher_id ──────────────────────────────

create or replace function get_teacher_class_summary()
returns table (
  child_id       uuid,
  child_name     text,
  child_language text,
  child_age      integer,
  missions_done  bigint,
  stars_earned   bigint,
  certificates   bigint,
  badges         bigint,
  last_active    timestamptz
)
language sql security definer as $$
  select
    c.id                                                          as child_id,
    c.name                                                        as child_name,
    c.language                                                    as child_language,
    c.age                                                         as child_age,
    count(distinct cp.id)                                         as missions_done,
    coalesce(sum(m.stars), 0)                                     as stars_earned,
    count(distinct ca.id) filter (where ca.type = 'certificate')  as certificates,
    count(distinct cb.id)                                         as badges,
    max(cp.completed_at)                                          as last_active
  from children c
  left join child_progress     cp on cp.child_id  = c.id
  left join missions            m  on m.id         = cp.mission_id
  left join child_achievements ca  on ca.child_id  = c.id
  left join child_badges        cb  on cb.child_id  = c.id
  where c.teacher_id = auth.uid()
  group by c.id, c.name, c.language, c.age
  order by c.name;
$$;

create or replace function get_teacher_story_breakdown()
returns table (
  story_id         uuid,
  story_title      text,
  story_slug       text,
  total_missions   bigint,
  completions      bigint,
  children_started bigint
)
language sql security definer as $$
  select
    s.id                        as story_id,
    s.title                     as story_title,
    s.slug                      as story_slug,
    count(distinct m.id)        as total_missions,
    count(distinct cp.id)       as completions,
    count(distinct cp.child_id) as children_started
  from stories s
  left join missions       m  on m.story_id  = s.id
  left join child_progress cp
    on cp.mission_id = m.id
    and exists (
      select 1 from children c
      where c.id = cp.child_id
        and c.teacher_id = auth.uid()
    )
  where s.is_active = true
  group by s.id, s.title, s.slug
  order by children_started desc, story_title;
$$;
