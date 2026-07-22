-- ── Migration 132: Plugin System ──────────────────────────────────────────────

-- Plugin registry — one row per published plugin version
create table plugins (
  id             uuid      primary key default gen_random_uuid(),
  slug           text      not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$'),
  name           text      not null check (char_length(name) between 2 and 100),
  description    text      not null default '',
  version        text      not null,              -- semver string e.g. "1.2.0"
  author_id      uuid      references auth.users(id) on delete set null,
  author_name    text      not null default '',
  manifest       jsonb     not null default '{}', -- validated PluginManifest JSON
  hooks          text[]    not null default '{}', -- hook names this plugin registers
  -- e.g. {'beforeAI','afterAI','onEvent','onMission','onStoryLoad'}
  permissions    text[]    not null default '{}', -- capabilities requested
  -- e.g. {'read:learner','write:memory','emit:events','inject:prompt'}
  status         text      not null default 'pending'
                           check (status in ('pending','active','disabled','revoked')),
  install_count  integer   not null default 0,
  rating_sum     integer   not null default 0,
  rating_count   integer   not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Schools that have installed a plugin (with per-school config)
create table school_plugins (
  school_id    uuid      not null references schools(id)  on delete cascade,
  plugin_id    uuid      not null references plugins(id)  on delete cascade,
  config       jsonb     not null default '{}',
  enabled      boolean   not null default true,
  installed_by uuid      references auth.users(id) on delete set null,
  installed_at timestamptz not null default now(),
  primary key  (school_id, plugin_id)
);

-- Plugin event log for debugging / audit
create table plugin_events (
  id          uuid      primary key default gen_random_uuid(),
  plugin_id   uuid      not null references plugins(id) on delete cascade,
  school_id   uuid      references schools(id) on delete cascade,
  hook        text      not null,
  duration_ms integer,
  error       text,
  created_at  timestamptz not null default now()
);

create index plugin_events_plugin_created on plugin_events (plugin_id, created_at desc);

-- RLS
alter table plugins        enable row level security;
alter table school_plugins enable row level security;
alter table plugin_events  enable row level security;

create policy "plugins are publicly readable when active"
  on plugins for select using (status = 'active');

create policy "authors manage own plugins"
  on plugins for all using (author_id = auth.uid());

-- School plugins: school admins manage (reuse is_school_member guard)
create policy "school members read installed plugins"
  on school_plugins for select
  using (
    exists (
      select 1 from school_admins sm
      where sm.school_id = school_plugins.school_id
        and sm.user_id   = auth.uid()
    )
  );

create policy "school admins manage plugins"
  on school_plugins for all
  using (
    exists (
      select 1 from school_admins sm
      where sm.school_id = school_plugins.school_id
        and sm.user_id   = auth.uid()
        and sm.role       in ('admin','owner')
    )
  );

-- ── RPC: publish_plugin ───────────────────────────────────────────────────────
create or replace function publish_plugin(
  p_slug        text,
  p_name        text,
  p_description text,
  p_version     text,
  p_author_name text,
  p_manifest    jsonb,
  p_hooks       text[],
  p_permissions text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into plugins (slug, name, description, version, author_id, author_name,
                       manifest, hooks, permissions, status)
  values (p_slug, p_name, p_description, p_version, auth.uid(), p_author_name,
          p_manifest, p_hooks, p_permissions, 'pending')
  on conflict (slug) do update
    set name        = excluded.name,
        description = excluded.description,
        version     = excluded.version,
        manifest    = excluded.manifest,
        hooks       = excluded.hooks,
        permissions = excluded.permissions,
        updated_at  = now()
  where plugins.author_id = auth.uid()
  returning id into v_id;
  return v_id;
end;
$$;

-- ── RPC: install_plugin ───────────────────────────────────────────────────────
create or replace function install_plugin(
  p_school_id uuid,
  p_plugin_id uuid,
  p_config    jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Caller must be school admin
  if not exists (
    select 1 from school_admins
    where school_id = p_school_id and user_id = auth.uid() and role in ('admin','owner')
  ) then raise exception 'forbidden'; end if;

  -- Plugin must be active
  if not exists (select 1 from plugins where id = p_plugin_id and status = 'active')
  then raise exception 'plugin_not_active'; end if;

  insert into school_plugins (school_id, plugin_id, config, installed_by)
  values (p_school_id, p_plugin_id, p_config, auth.uid())
  on conflict (school_id, plugin_id)
  do update set config = excluded.config, enabled = true;

  update plugins set install_count = install_count + 1 where id = p_plugin_id;
end;
$$;

-- ── RPC: get_school_plugins ───────────────────────────────────────────────────
create or replace function get_school_plugins(p_school_id uuid)
returns table (
  plugin_id    uuid,
  slug         text,
  name         text,
  version      text,
  hooks        text[],
  permissions  text[],
  manifest     jsonb,
  config       jsonb,
  enabled      boolean
)
language sql security definer set search_path = public as $$
  select p.id, p.slug, p.name, p.version, p.hooks, p.permissions, p.manifest,
         sp.config, sp.enabled
  from   school_plugins sp
  join   plugins p on p.id = sp.plugin_id
  where  sp.school_id = p_school_id
    and  exists (
           select 1 from school_admins sm
           where sm.school_id = p_school_id and sm.user_id = auth.uid()
         );
$$;

-- ── RPC: log_plugin_event ─────────────────────────────────────────────────────
create or replace function log_plugin_event(
  p_plugin_id   uuid,
  p_school_id   uuid,
  p_hook        text,
  p_duration_ms integer default null,
  p_error       text    default null
) returns void
language sql security definer set search_path = public as $$
  insert into plugin_events (plugin_id, school_id, hook, duration_ms, error)
  values (p_plugin_id, p_school_id, p_hook, p_duration_ms, p_error);
$$;
