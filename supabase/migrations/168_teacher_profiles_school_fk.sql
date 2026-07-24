-- ============================================================
-- 168: Add FK from teacher_profiles.school_id → schools (#24)
-- ============================================================
-- Migration 128 added the column with an inline FK reference, but
-- ADD COLUMN IF NOT EXISTS silently skips the constraint when the
-- column already exists (e.g. from an earlier dev migration).
-- This migration is idempotent: it adds the FK only if missing,
-- cleaning any orphaned rows first to avoid a constraint violation.
-- ============================================================

do $$
begin
  -- Ensure the column exists (no-op if migration 128 already ran)
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'teacher_profiles'
       and column_name  = 'school_id'
  ) then
    alter table teacher_profiles
      add column school_id uuid;

    create index if not exists teacher_profiles_school_id_idx
      on teacher_profiles(school_id);
  end if;

  -- Only add the FK if it is genuinely missing
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name
     and kcu.table_schema    = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema    = 'public'
      and tc.table_name      = 'teacher_profiles'
      and kcu.column_name    = 'school_id'
  ) then
    -- Nullify any rows whose school_id points to a non-existent school
    -- (guards against orphaned data that would block the constraint)
    update teacher_profiles tp
       set school_id = null
     where tp.school_id is not null
       and not exists (
         select 1 from schools s where s.id = tp.school_id
       );

    alter table teacher_profiles
      add constraint teacher_profiles_school_id_fkey
      foreign key (school_id)
      references schools(id)
      on delete set null;
  end if;
end;
$$;

-- Ensure index exists regardless of which path ran above
create index if not exists teacher_profiles_school_id_idx
  on teacher_profiles(school_id);
