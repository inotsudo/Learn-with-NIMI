-- ── Migration 134: Enterprise RPCs — export + roster + xAPI cron ───────────────
--
-- Adds the RPCs that the enterprise API routes call but migration 133 omitted:
--   • export_school_learner_progress  — used by /api/enterprise/export
--   • roster_upsert_learner           — used by /api/enterprise/roster
--   • roster_archive_learner          — used by /api/enterprise/roster
--   • roster_upsert_teacher           — used by /api/enterprise/roster
--   • roster_upsert_school            — used by /api/enterprise/roster
--
-- Also creates the roster staging table for provider-sourced user data.

-- ── Roster staging table ──────────────────────────────────────────────────────
-- Raw roster data from Clever/ClassLink is held here; a human or background job
-- maps it to children/auth.users after review. We never auto-create auth users
-- from untrusted webhook data.

create table if not exists roster_staged_users (
  id            uuid        primary key default gen_random_uuid(),
  provider      text        not null check (provider in ('clever','classlink','csv')),
  provider_id   text        not null,
  record_type   text        not null check (record_type in ('student','teacher','school')),
  data          jsonb       not null default '{}',
  school_id     uuid        references schools(id) on delete set null,
  status        text        not null default 'pending'
                            check (status in ('pending','linked','archived','error')),
  linked_child_id uuid      references children(id)   on delete set null,
  linked_user_id  uuid      references auth.users(id) on delete set null,
  archived      boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (provider, provider_id, record_type)
);

create index if not exists roster_staged_school on roster_staged_users (school_id, record_type, status);

alter table roster_staged_users enable row level security;
create policy "service only roster" on roster_staged_users for all using (false);

-- ── RPC: roster_upsert_learner ────────────────────────────────────────────────

create or replace function roster_upsert_learner(
  p_provider    text,
  p_provider_id text,
  p_data        jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid;
  v_school_id uuid;
begin
  -- Try to resolve school from provider data
  select id into v_school_id
  from   roster_staged_users
  where  provider    = p_provider
    and  provider_id = coalesce(p_data->>'school', p_data->'schools'->0->>0, '')
    and  record_type = 'school'
    and  school_id is not null
  limit 1;

  insert into roster_staged_users
    (provider, provider_id, record_type, data, school_id, status)
  values
    (p_provider, p_provider_id, 'student', p_data, v_school_id, 'pending')
  on conflict (provider, provider_id, record_type) do update
    set data       = excluded.data,
        school_id  = coalesce(excluded.school_id, roster_staged_users.school_id),
        archived   = false,
        status     = case when roster_staged_users.status = 'archived' then 'pending'
                          else roster_staged_users.status end,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── RPC: roster_archive_learner ───────────────────────────────────────────────

create or replace function roster_archive_learner(
  p_provider    text,
  p_provider_id text
) returns void
language sql security definer set search_path = public as $$
  update roster_staged_users
  set    archived   = true,
         status     = 'archived',
         updated_at = now()
  where  provider    = p_provider
    and  provider_id = p_provider_id
    and  record_type = 'student';
$$;

-- ── RPC: roster_upsert_teacher ────────────────────────────────────────────────

create or replace function roster_upsert_teacher(
  p_provider    text,
  p_provider_id text,
  p_data        jsonb,
  p_deleted     boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into roster_staged_users
    (provider, provider_id, record_type, data, status)
  values
    (p_provider, p_provider_id, 'teacher', p_data,
     case when p_deleted then 'archived' else 'pending' end)
  on conflict (provider, provider_id, record_type) do update
    set data       = excluded.data,
        archived   = p_deleted,
        status     = case when p_deleted then 'archived'
                          when roster_staged_users.status = 'archived' then 'pending'
                          else roster_staged_users.status end,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── RPC: roster_upsert_school ─────────────────────────────────────────────────

create or replace function roster_upsert_school(
  p_provider    text,
  p_provider_id text,
  p_data        jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id        uuid;
  v_school_id uuid;
  v_name      text;
begin
  v_name := coalesce(p_data->>'name', p_data->>'school_name', 'Unknown School');

  -- Try to match an existing NIMIPIKO school by name (loose match for demo)
  select id into v_school_id
  from   schools
  where  lower(name) = lower(v_name)
  limit  1;

  insert into roster_staged_users
    (provider, provider_id, record_type, data, school_id, status)
  values
    (p_provider, p_provider_id, 'school', p_data, v_school_id,
     case when v_school_id is not null then 'linked' else 'pending' end)
  on conflict (provider, provider_id, record_type) do update
    set data       = excluded.data,
        school_id  = coalesce(excluded.school_id, roster_staged_users.school_id),
        status     = case when excluded.school_id is not null then 'linked'
                          else roster_staged_users.status end,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── RPC: export_school_learner_progress ───────────────────────────────────────
-- Requires: requester must be in school_admins for p_school_id (owner/admin/teacher)
-- Returns one row per enrolled child with aggregated progress stats.

create or replace function export_school_learner_progress(p_school_id uuid)
returns table (
  child_id      uuid,
  display_name  text,
  language      text,
  total_xp      bigint,
  level         integer,
  lessons_done  bigint,
  missions_done bigint,
  stars         bigint,
  last_active   timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  -- Caller must be a school admin (owner/admin/teacher)
  if not exists (
    select 1 from school_admins
    where school_id = p_school_id
      and user_id   = auth.uid()
      and role in ('owner','admin','teacher')
  ) then
    raise exception 'forbidden';
  end if;

  return query
  select
    c.id                                               as child_id,
    c.name                                             as display_name,
    c.language,
    coalesce(agg.missions_done, 0) * 50                as total_xp,
    greatest(1, (coalesce(agg.missions_done, 0) / 10 + 1)::integer) as level,
    coalesce(agg.lessons_done, 0)                      as lessons_done,
    coalesce(agg.missions_done, 0)                     as missions_done,
    coalesce(agg.stars, 0)                             as stars,
    agg.last_active
  from children c
  join school_enrollments se on se.child_id = c.id
                             and se.school_id = p_school_id
  left join lateral (
    select
      count(*) filter (where le.event_type = 'lesson_completed')  as lessons_done,
      count(*) filter (where le.event_type = 'mission_completed') as missions_done,
      coalesce(sum(
        case when le.event_type = 'mission_completed'
             then coalesce((le.payload->>'stars')::bigint, 1) else 0 end
      ), 0) as stars,
      max(le.created_at) as last_active
    from learner_events le
    where le.child_id = c.id
  ) agg on true
  order by c.name;
end;
$$;
