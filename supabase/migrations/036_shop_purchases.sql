-- Reward Shop: real per-child purchase records for cosmetic shop items.
create table shop_purchases (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  item_id       text not null,
  price         integer not null,
  purchased_at  timestamptz default now(),
  unique (child_id, item_id)
);

create index on shop_purchases (child_id);

alter table shop_purchases enable row level security;

create policy "parent: select own child purchases" on shop_purchases
  for select using (is_my_child(child_id));

create policy "parent: insert own child purchases" on shop_purchases
  for insert with check (is_my_child(child_id));

create policy "admin: select all shop purchases" on shop_purchases
  for select using (is_admin());
