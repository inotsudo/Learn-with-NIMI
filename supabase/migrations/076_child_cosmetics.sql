-- Per-child equipped cosmetics: NIMI outfit, PIKO outfit, profile frame, title badge.
-- Single row per child; upsertable. All slots nullable (nothing equipped = null).
create table child_cosmetics (
  child_id    uuid primary key references children(id) on delete cascade,
  nimi_outfit text,
  piko_outfit text,
  frame       text,
  title_badge text,
  updated_at  timestamptz default now()
);

alter table child_cosmetics enable row level security;

create policy "parent: manage own child cosmetics" on child_cosmetics
  for all using (is_my_child(child_id)) with check (is_my_child(child_id));
