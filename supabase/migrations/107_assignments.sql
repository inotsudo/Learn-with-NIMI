-- ============================================================
-- 107: Teacher assignments system
-- ============================================================

-- ── 1. ASSIGNMENTS ────────────────────────────────────────────────

create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teacher_profiles(id) on delete cascade,
  title        text not null,
  instructions text,
  story_id     uuid references stories(id) on delete set null,
  due_date     date,
  created_at   timestamptz default now()
);

alter table assignments enable row level security;

drop policy if exists "teacher: manage assignments" on assignments;

create policy "teacher: manage assignments"
  on assignments for all
  using  (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create index if not exists assignments_teacher_idx on assignments(teacher_id, due_date);

-- ── 2. ASSIGNMENT → STUDENT MAPPING ──────────────────────────────

create table if not exists assignment_students (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  child_id      uuid not null references children(id)   on delete cascade,
  completed_at  timestamptz,
  seen_at       timestamptz,
  unique (assignment_id, child_id)
);

alter table assignment_students enable row level security;

drop policy if exists "teacher: manage assignment_students" on assignment_students;
drop policy if exists "parent: view child assignments"      on assignment_students;
drop policy if exists "parent: complete child assignment"   on assignment_students;

create policy "teacher: manage assignment_students"
  on assignment_students for all
  using (
    exists (
      select 1 from assignments a
      where a.id = assignment_students.assignment_id
        and a.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from assignments a
      where a.id = assignment_students.assignment_id
        and a.teacher_id = auth.uid()
    )
  );

create policy "parent: view child assignments"
  on assignment_students for select
  using (
    exists (
      select 1 from children c
      where c.id = assignment_students.child_id
        and c.parent_id = auth.uid()
    )
  );

create policy "parent: complete child assignment"
  on assignment_students for update
  using (
    exists (
      select 1 from children c
      where c.id = assignment_students.child_id
        and c.parent_id = auth.uid()
    )
  );

create index if not exists assignment_students_child_idx
  on assignment_students(child_id, completed_at);
create index if not exists assignment_students_assignment_idx
  on assignment_students(assignment_id);

-- ── 3. RPC: teacher gets all their assignments + completion stats ──

create or replace function get_teacher_assignments()
returns table (
  assignment_id   uuid,
  title           text,
  instructions    text,
  story_id        uuid,
  story_title     text,
  story_slug      text,
  due_date        date,
  total_assigned  bigint,
  completed_count bigint,
  created_at      timestamptz
)
language sql security definer as $$
  select
    a.id              as assignment_id,
    a.title,
    a.instructions,
    a.story_id,
    s.title           as story_title,
    s.slug            as story_slug,
    a.due_date,
    count(ast.id)                                                  as total_assigned,
    count(ast.id) filter (where ast.completed_at is not null)      as completed_count,
    a.created_at
  from assignments a
  left join assignment_students ast on ast.assignment_id = a.id
  left join stories s               on s.id = a.story_id
  where a.teacher_id = auth.uid()
  group by a.id, a.title, a.instructions, a.story_id, s.title, s.slug, a.due_date, a.created_at
  order by a.due_date asc nulls last, a.created_at desc;
$$;

-- ── 4. RPC: per-student detail for one assignment ─────────────────

create or replace function get_assignment_detail(p_assignment_id uuid)
returns table (
  child_id     uuid,
  child_name   text,
  language     text,
  age          integer,
  completed_at timestamptz,
  seen_at      timestamptz
)
language sql security definer as $$
  select
    c.id   as child_id,
    c.name as child_name,
    c.language,
    c.age,
    ast.completed_at,
    ast.seen_at
  from assignment_students ast
  join children c on c.id = ast.child_id
  where ast.assignment_id = p_assignment_id
    and exists (
      select 1 from assignments a
      where a.id = p_assignment_id and a.teacher_id = auth.uid()
    )
  order by ast.completed_at desc nulls last, c.name;
$$;

-- ── 5. RPC: student (via parent auth) fetches their assignments ───

create or replace function get_student_assignments(p_child_id uuid)
returns table (
  assignment_id uuid,
  title         text,
  instructions  text,
  story_id      uuid,
  story_title   text,
  story_slug    text,
  due_date      date,
  completed_at  timestamptz,
  teacher_name  text,
  class_name    text
)
language sql security definer as $$
  select
    a.id          as assignment_id,
    a.title,
    a.instructions,
    a.story_id,
    s.title       as story_title,
    s.slug        as story_slug,
    a.due_date,
    ast.completed_at,
    tp.name       as teacher_name,
    tp.class_name
  from assignment_students ast
  join assignments     a   on a.id  = ast.assignment_id
  join teacher_profiles tp on tp.id = a.teacher_id
  left join stories    s   on s.id  = a.story_id
  where ast.child_id = p_child_id
    and (
      -- parent of this child
      exists (select 1 from children c where c.id = p_child_id and c.parent_id  = auth.uid())
      or
      -- teacher of this child
      exists (select 1 from children c where c.id = p_child_id and c.teacher_id = auth.uid())
    )
  order by
    case when ast.completed_at is null then 0 else 1 end,
    a.due_date asc nulls last,
    a.created_at desc;
$$;

-- ── 6. RPC: mark an assignment complete ───────────────────────────

create or replace function mark_assignment_complete(
  p_assignment_id uuid,
  p_child_id      uuid
)
returns void language sql security definer as $$
  update assignment_students
  set completed_at = now()
  where assignment_id = p_assignment_id
    and child_id      = p_child_id
    and completed_at  is null
    and (
      exists (select 1 from assignments a where a.id = p_assignment_id and a.teacher_id = auth.uid())
      or
      exists (select 1 from children   c where c.id = p_child_id      and c.parent_id  = auth.uid())
    );
$$;

-- ── 7. RPC: auto-assign to all students in teacher's class ────────

create or replace function assign_to_class(p_assignment_id uuid)
returns void language sql security definer as $$
  insert into assignment_students (assignment_id, child_id)
  select p_assignment_id, c.id
  from children c
  where c.teacher_id = auth.uid()
    and exists (
      select 1 from assignments a
      where a.id = p_assignment_id and a.teacher_id = auth.uid()
    )
  on conflict (assignment_id, child_id) do nothing;
$$;
