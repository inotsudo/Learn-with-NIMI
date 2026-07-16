-- Lightweight table for the /api/health uptime endpoint.
-- Contains exactly one row; never grows. Public anon read-only.
create table if not exists health_check (
  id    integer primary key default 1
);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'health_check_single_row'
  ) then
    alter table health_check add constraint health_check_single_row check (id = 1);
  end if;
end $$;

-- RLS: public read so the anon client (real-user perspective) can query it.
alter table health_check enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'health_check' and policyname = 'public: read health_check'
  ) then
    create policy "public: read health_check"
      on health_check for select
      using (true);
  end if;
end $$;

-- Seed the single sentinel row.
insert into health_check (id) values (1) on conflict (id) do nothing;
