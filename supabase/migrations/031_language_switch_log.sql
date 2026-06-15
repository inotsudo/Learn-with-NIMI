-- ============================================================
-- Migration 031: Language Switch Log (Phase BI)
--
-- Records every time a child's active learning language
-- (children.language) changes, so admin analytics can compute
-- "language-switch frequency" (Phase BI Requirement 3). Purely
-- additive — no existing table/column/RPC is modified.
--
-- Written from the app side by updateChildLanguage() in
-- lib/queries.ts, which inserts a row here whenever the new
-- language differs from the child's current language.
-- ============================================================

create table language_switch_log (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  from_language text not null check (from_language in ('en', 'fr', 'rw')),
  to_language   text not null check (to_language in ('en', 'fr', 'rw')),
  switched_at   timestamptz default now()
);

create index on language_switch_log (child_id);

alter table language_switch_log enable row level security;

create policy "parent: select own switch log" on language_switch_log
  for select using (is_my_child(child_id));

create policy "parent: insert own switch log" on language_switch_log
  for insert with check (is_my_child(child_id));

create policy "admin: full access" on language_switch_log
  for all using (is_admin()) with check (is_admin());
