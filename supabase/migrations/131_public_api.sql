-- ── Migration 131: Public API — API Keys + Rate Limiting ──────────────────────

-- API keys for third-party developer access
create table api_keys (
  id             uuid      primary key default gen_random_uuid(),
  user_id        uuid      not null references auth.users(id) on delete cascade,
  name           text      not null check (char_length(name) between 1 and 80),
  key_hash       text      not null unique, -- SHA-256 hex of the raw key
  key_prefix     text      not null,        -- e.g. "nk_live_a3f2..." (first 20 chars, shown in UI)
  plan           text      not null default 'free'
                           check (plan in ('free','pro','enterprise')),
  -- per-plan defaults; enterprise rows can be overridden individually
  rate_limit_rpm integer   not null default 60,
  rate_limit_rpd integer   not null default 1000,
  scopes         text[]    not null default '{}',
  -- e.g. {'read:learner','write:events','ai:chat','read:content','admin:school'}
  last_used_at   timestamptz,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- Sliding-window rate-limit counters (upserted per request)
create table api_rate_limits (
  key_id         uuid      not null references api_keys(id) on delete cascade,
  window_start   timestamptz not null,
  window_type    text      not null check (window_type in ('minute','day')),
  request_count  integer   not null default 1,
  primary key (key_id, window_start, window_type)
);

-- Index for fast lookup of recent windows
create index api_rate_limits_key_window
  on api_rate_limits (key_id, window_type, window_start desc);

-- Cleanup job helper: prune windows older than 2 days
create index api_rate_limits_cleanup
  on api_rate_limits (window_start);

-- RLS
alter table api_keys       enable row level security;
alter table api_rate_limits enable row level security;

-- Users see only their own keys
create policy "owner reads own keys"
  on api_keys for select
  using (user_id = auth.uid());

create policy "owner manages own keys"
  on api_keys for all
  using (user_id = auth.uid());

-- Rate limits are service-only (RPCs only, no direct RLS select needed)
create policy "service manages rate limits"
  on api_rate_limits for all
  using (true);

-- ── RPC: create_api_key ────────────────────────────────────────────────────────
-- Accepts the raw key (generated client-side), stores the hash.
-- Returns the key_prefix for display confirmation only.
create or replace function create_api_key(
  p_name        text,
  p_key_hash    text,  -- SHA-256 hex of the raw key
  p_key_prefix  text,  -- first 20 chars of the raw key
  p_plan        text   default 'free',
  p_scopes      text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_rpm integer := case p_plan
    when 'pro'        then 300
    when 'enterprise' then 2000
    else 60
  end;
  v_rpd integer := case p_plan
    when 'pro'        then 10000
    when 'enterprise' then 100000
    else 1000
  end;
begin
  insert into api_keys (user_id, name, key_hash, key_prefix, plan,
                        rate_limit_rpm, rate_limit_rpd, scopes)
  values (auth.uid(), p_name, p_key_hash, p_key_prefix, p_plan,
          v_rpm, v_rpd, p_scopes)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── RPC: validate_api_key ──────────────────────────────────────────────────────
-- Called server-side on every API request with the hashed key.
-- Returns key metadata or null if invalid/revoked/expired.
create or replace function validate_api_key(
  p_key_hash text
) returns table (
  key_id         uuid,
  user_id        uuid,
  plan           text,
  rate_limit_rpm integer,
  rate_limit_rpd integer,
  scopes         text[]
)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update api_keys
  set    last_used_at = now()
  where  key_hash    = p_key_hash
    and  revoked_at  is null
    and  (expires_at is null or expires_at > now())
  returning
    api_keys.id,
    api_keys.user_id,
    api_keys.plan,
    api_keys.rate_limit_rpm,
    api_keys.rate_limit_rpd,
    api_keys.scopes;
end;
$$;

-- ── RPC: check_and_increment_rate_limit ───────────────────────────────────────
-- Increments the counter for the current minute and day windows.
-- Returns true if within limits, false if rate-limited.
create or replace function check_and_increment_rate_limit(
  p_key_id       uuid,
  p_limit_rpm    integer,
  p_limit_rpd    integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_minute_start timestamptz := date_trunc('minute', now());
  v_day_start    timestamptz := date_trunc('day',    now());
  v_minute_count integer;
  v_day_count    integer;
begin
  -- Upsert minute window
  insert into api_rate_limits (key_id, window_start, window_type, request_count)
  values (p_key_id, v_minute_start, 'minute', 1)
  on conflict (key_id, window_start, window_type)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into v_minute_count;

  -- Upsert day window
  insert into api_rate_limits (key_id, window_start, window_type, request_count)
  values (p_key_id, v_day_start, 'day', 1)
  on conflict (key_id, window_start, window_type)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into v_day_count;

  -- Prune windows older than 2 days (best-effort, non-blocking)
  delete from api_rate_limits
  where window_start < now() - interval '2 days';

  return v_minute_count <= p_limit_rpm and v_day_count <= p_limit_rpd;
end;
$$;

-- ── RPC: revoke_api_key ────────────────────────────────────────────────────────
create or replace function revoke_api_key(p_key_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update api_keys
  set    revoked_at = now()
  where  id      = p_key_id
    and  user_id = auth.uid();
end;
$$;

-- ── RPC: list_api_keys ────────────────────────────────────────────────────────
create or replace function list_api_keys()
returns table (
  id           uuid,
  name         text,
  key_prefix   text,
  plan         text,
  scopes       text[],
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz
)
language sql security definer set search_path = public as $$
  select id, name, key_prefix, plan, scopes,
         last_used_at, expires_at, revoked_at, created_at
  from   api_keys
  where  user_id = auth.uid()
  order  by created_at desc;
$$;
