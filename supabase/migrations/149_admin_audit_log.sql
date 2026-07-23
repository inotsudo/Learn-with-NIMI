create table if not exists admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_email  text not null,
  action       text not null,         -- e.g. 'delete_child', 'grant_club', 'publish_story'
  entity_type  text not null,         -- e.g. 'child', 'parent', 'story', 'mission'
  entity_id    text,                  -- the UUID/id of the affected record
  entity_label text,                  -- human-readable name/title for display
  metadata     jsonb default '{}',    -- extra context (old value, new value, etc.)
  created_at   timestamptz default now() not null
);

create index on admin_audit_log (created_at desc);
create index on admin_audit_log (admin_email);
create index on admin_audit_log (entity_type);

-- Read-only for authenticated users (admin checks happen in app layer)
alter table admin_audit_log enable row level security;
create policy "admin_audit_log_read" on admin_audit_log for select using (true);
create policy "admin_audit_log_insert" on admin_audit_log for insert with check (true);
