-- 152: Nimi AI daily message cap for free users
-- Tracks per-child daily message count; Club members bypass the check in app code.

create table if not exists nimi_message_counts (
  child_id   uuid    not null references children(id) on delete cascade,
  date       date    not null default current_date,
  count      integer not null default 0,
  primary key (child_id, date)
);

create index if not exists nimi_message_counts_child_date_idx
  on nimi_message_counts (child_id, date);

alter table nimi_message_counts enable row level security;

-- Parent can read their own children's counts
create policy "parent: read own nimi counts"
  on nimi_message_counts for select
  using (
    exists (
      select 1 from children c
      where c.id = child_id
        and (c.parent_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

-- Counts are written only by the server via service role
create policy "admin: full access"
  on nimi_message_counts for all
  using (is_admin()) with check (is_admin());

-- Atomic upsert: increment count and return new value
-- Called by the Nimi API route (service role) before streaming a response.
create or replace function increment_nimi_count(p_child_id uuid)
returns integer
language plpgsql security definer as $$
declare
  v_count integer;
begin
  insert into nimi_message_counts (child_id, date, count)
  values (p_child_id, current_date, 1)
  on conflict (child_id, date)
  do update set count = nimi_message_counts.count + 1
  returning count into v_count;
  return v_count;
end;
$$;
