-- ── Migration 133: Enterprise Integrations ────────────────────────────────────

create table enterprise_accounts (
  id                    uuid      primary key default gen_random_uuid(),
  name                  text      not null check (char_length(name) between 2 and 200),
  domain                text,                     -- e.g. "district.edu" for SSO matching
  plan                  text      not null default 'enterprise'
                                  check (plan in ('enterprise','district','ministry')),
  -- LTI 1.3 config
  lti_client_id         text      unique,
  lti_deployment_id     text,
  lti_platform_url      text,                     -- e.g. https://canvas.instructure.com
  lti_public_jwks_url   text,                     -- platform JWKS endpoint
  -- SSO config
  sso_provider          text      check (sso_provider in ('saml','google','microsoft','clever','classlink')),
  sso_config            jsonb     not null default '{}',
  -- xAPI / LRS config
  xapi_endpoint         text,                     -- LRS base URL
  xapi_key              text,                     -- basic auth username (key)
  xapi_secret           text,                     -- basic auth password (secret)
  xapi_version          text      not null default '1.0.3',
  -- Roster sync
  roster_sync_enabled   boolean   not null default false,
  roster_provider       text      check (roster_provider in ('clever','classlink','csv')),
  roster_sync_token     text,                     -- provider OAuth token (stored encrypted)
  roster_last_synced_at timestamptz,
  -- Data retention
  data_retention_days   integer   not null default 365,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Schools within this enterprise account
create table enterprise_school_links (
  enterprise_id uuid not null references enterprise_accounts(id) on delete cascade,
  school_id     uuid not null references schools(id)             on delete cascade,
  linked_at     timestamptz not null default now(),
  primary key   (enterprise_id, school_id)
);

-- xAPI statement log (append-only, forwarded to LRS)
create table xapi_statements (
  id            uuid      primary key default gen_random_uuid(),
  enterprise_id uuid      references enterprise_accounts(id) on delete cascade,
  actor_id      text      not null,  -- IFI: mbox, account, etc.
  verb_id       text      not null,  -- e.g. "http://adlnet.gov/expapi/verbs/completed"
  object_id     text      not null,  -- activity IRI
  statement     jsonb     not null,  -- full xAPI statement
  forwarded     boolean   not null default false,
  forwarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index xapi_statements_enterprise_created
  on xapi_statements (enterprise_id, created_at desc);

create index xapi_statements_pending
  on xapi_statements (forwarded, created_at)
  where not forwarded;

-- LTI launch sessions (nonce validation, 10-minute TTL)
create table lti_nonces (
  nonce      text        primary key,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

-- RLS
alter table enterprise_accounts      enable row level security;
alter table enterprise_school_links  enable row level security;
alter table xapi_statements          enable row level security;
alter table lti_nonces               enable row level security;

-- Only service role touches these — all routes use service-definer RPCs
create policy "service only enterprise"
  on enterprise_accounts for all using (false);
create policy "service only links"
  on enterprise_school_links for all using (false);
create policy "service only xapi"
  on xapi_statements for all using (false);
create policy "service only lti"
  on lti_nonces for all using (false);

-- ── RPC: get_enterprise_by_lti_client ─────────────────────────────────────────
create or replace function get_enterprise_by_lti_client(p_client_id text)
returns table (
  id                uuid,
  name              text,
  lti_deployment_id text,
  lti_platform_url  text,
  jwks_url          text,   -- aliased from lti_public_jwks_url for convenience
  xapi_endpoint     text,
  xapi_key          text,
  xapi_secret       text
)
language sql security definer set search_path = public as $$
  select id, name, lti_deployment_id, lti_platform_url,
         lti_public_jwks_url as jwks_url,
         xapi_endpoint, xapi_key, xapi_secret
  from   enterprise_accounts
  where  lti_client_id = p_client_id;
$$;

-- ── RPC: validate_lti_nonce ───────────────────────────────────────────────────
-- INSERT-based replay prevention: returns true only on first use of the nonce.
-- The nonce lives for 10 minutes (set at table level); expired rows are pruned.
create or replace function validate_lti_nonce(p_nonce text, p_client_id text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_inserted integer := 0;
begin
  -- Purge expired nonces opportunistically
  delete from lti_nonces where expires_at <= now();

  -- Try to insert; conflict = nonce already seen (replay)
  insert into lti_nonces (nonce)
  values (p_nonce)
  on conflict (nonce) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

-- ── RPC: queue_xapi_statement ─────────────────────────────────────────────────
-- enterprise_id is nullable — linked at flush time if needed.
-- verb_id + object_id extracted from the statement JSON to populate index columns.
create or replace function queue_xapi_statement(
  p_actor_id  text,
  p_statement jsonb
) returns uuid
language sql security definer set search_path = public as $$
  insert into xapi_statements (enterprise_id, actor_id, verb_id, object_id, statement)
  values (
    null,
    p_actor_id,
    coalesce(p_statement->'verb'->>'id', 'unknown'),
    coalesce(p_statement->'object'->>'id', 'unknown'),
    p_statement
  )
  returning id;
$$;

-- ── RPC: mark_xapi_forwarded ──────────────────────────────────────────────────
create or replace function mark_xapi_forwarded(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update xapi_statements
  set    forwarded    = true,
         forwarded_at = now()
  where  id = any(p_ids);
$$;

-- ── RPC: get_pending_xapi_statements ─────────────────────────────────────────
create or replace function get_pending_xapi_statements(p_limit integer default 500)
returns table (
  id        uuid,
  statement jsonb
)
language sql security definer set search_path = public as $$
  select id, statement
  from   xapi_statements
  where  not forwarded
  order  by created_at
  limit  p_limit;
$$;
