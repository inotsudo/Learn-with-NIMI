-- ============================================================
-- 104: Teacher portal foundation
-- ============================================================

-- ── 1. TEACHER PROFILES ──────────────────────────────────────────
create table if not exists teacher_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  email        text not null default '',
  school_name  text,
  class_name   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table teacher_profiles enable row level security;

drop policy if exists "teacher: select own"        on teacher_profiles;
drop policy if exists "teacher: insert own"        on teacher_profiles;
drop policy if exists "teacher: update own"        on teacher_profiles;
drop policy if exists "admin: read teacher_profiles" on teacher_profiles;

create policy "teacher: select own"
  on teacher_profiles for select
  using (id = auth.uid());

create policy "teacher: insert own"
  on teacher_profiles for insert
  with check (id = auth.uid());

create policy "teacher: update own"
  on teacher_profiles for update
  using (id = auth.uid());

create policy "admin: read teacher_profiles"
  on teacher_profiles for select
  using (
    exists (
      select 1 from admins
      where id = auth.uid()
    )
  );

create index if not exists teacher_profiles_id_idx on teacher_profiles(id);

-- ── 2. SCHOOL INQUIRIES ──────────────────────────────────────────
create table if not exists school_inquiries (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  school        text not null,
  email         text not null,
  country       text,
  learner_count text,
  size          text,
  message       text,
  status        text not null default 'new'
                  check (status in ('new','contacted','demo_booked','converted','closed')),
  created_at    timestamptz default now()
);

alter table school_inquiries enable row level security;

drop policy if exists "anon: insert school_inquiries"   on school_inquiries;
drop policy if exists "admin: manage school_inquiries"  on school_inquiries;

create policy "anon: insert school_inquiries"
  on school_inquiries for insert
  with check (true);

create policy "admin: manage school_inquiries"
  on school_inquiries for all
  using (
    exists (
      select 1 from admins
      where id = auth.uid()
    )
  );

create index if not exists school_inquiries_status_idx     on school_inquiries(status);
create index if not exists school_inquiries_created_at_idx on school_inquiries(created_at desc);

-- ── 3. HELPER ────────────────────────────────────────────────────
create or replace function is_teacher(p_user_id uuid default auth.uid())
returns boolean language sql security definer as $$
  select exists (select 1 from teacher_profiles where id = p_user_id);
$$;

-- ── 4. RPC: class summary ─────────────────────────────────────────
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
    c.id                                                        as child_id,
    c.name                                                      as child_name,
    c.language                                                  as child_language,
    c.age                                                       as child_age,
    count(distinct cp.id)                                       as missions_done,
    coalesce(sum(m.stars), 0)                                   as stars_earned,
    count(distinct ca.id) filter (where ca.type = 'certificate') as certificates,
    count(distinct cb.id)                                       as badges,
    max(cp.completed_at)                                        as last_active
  from children c
  left join child_progress    cp on cp.child_id  = c.id
  left join missions          m  on m.id         = cp.mission_id
  left join child_achievements ca on ca.child_id = c.id
  left join child_badges       cb on cb.child_id = c.id
  where c.parent_id = auth.uid()
  group by c.id, c.name, c.language, c.age
  order by c.name;
$$;

-- ── 5. RPC: story breakdown ───────────────────────────────────────
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
    s.id                   as story_id,
    s.title                as story_title,
    s.slug                 as story_slug,
    count(distinct m.id)   as total_missions,
    count(distinct cp.id)  as completions,
    count(distinct cp.child_id) as children_started
  from stories s
  left join missions      m  on m.story_id = s.id
  left join child_progress cp
    on cp.mission_id = m.id
    and exists (
      select 1 from children c
      where c.id = cp.child_id
        and c.parent_id = auth.uid()
    )
  where s.is_active = true
  group by s.id, s.title, s.slug
  order by children_started desc, story_title;
$$;
