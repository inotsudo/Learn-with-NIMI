-- ============================================================
-- 105: Teacher portal features
--   • class_code on teacher_profiles (auto-generated, unique)
--   • class_announcements table
--   • get_class_by_code() public RPC
-- ============================================================

-- ── 1. CLASS CODE ─────────────────────────────────────────────────

alter table teacher_profiles
  add column if not exists class_code text;

-- generate codes for any existing rows
update teacher_profiles
  set class_code = upper(left(replace(gen_random_uuid()::text, '-', ''), 6))
  where class_code is null;

-- unique constraint (if not exists)
do $$ begin
  alter table teacher_profiles
    add constraint teacher_profiles_class_code_key unique (class_code);
exception when duplicate_table then null;
end $$;

-- trigger: auto-generate class_code on insert if not supplied
create or replace function _teacher_gen_class_code()
returns trigger language plpgsql as $$
declare code text;
begin
  if new.class_code is null or new.class_code = '' then
    loop
      code := upper(left(replace(gen_random_uuid()::text, '-', ''), 6));
      exit when not exists (select 1 from teacher_profiles where class_code = code);
    end loop;
    new.class_code := code;
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_profiles_class_code_trig on teacher_profiles;
create trigger teacher_profiles_class_code_trig
  before insert on teacher_profiles
  for each row execute function _teacher_gen_class_code();

create index if not exists teacher_profiles_class_code_idx
  on teacher_profiles(class_code);

-- ── 2. CLASS ANNOUNCEMENTS ────────────────────────────────────────

create table if not exists class_announcements (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references teacher_profiles(id) on delete cascade,
  title       text not null default '',
  body        text not null default '',
  created_at  timestamptz default now()
);

alter table class_announcements enable row level security;

drop policy if exists "teacher: manage own announcements" on class_announcements;
drop policy if exists "public: read class announcements"  on class_announcements;

create policy "teacher: manage own announcements"
  on class_announcements for all
  using  (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "public: read class announcements"
  on class_announcements for select
  using (true);

create index if not exists class_announcements_teacher_idx
  on class_announcements(teacher_id, created_at desc);

-- ── 3. PUBLIC RPC: get_class_by_code ─────────────────────────────

create or replace function get_class_by_code(p_code text)
returns table (
  teacher_id   uuid,
  teacher_name text,
  school_name  text,
  class_name   text,
  class_code   text
)
language sql security definer as $$
  select
    id          as teacher_id,
    name        as teacher_name,
    school_name,
    class_name,
    class_code
  from teacher_profiles
  where upper(class_code) = upper(p_code)
  limit 1;
$$;
