-- ============================================================
--  082: Payment audit log
--
--  Append-only event log for all money movements. Written by
--  DB triggers on orders, content_access, and
--  nimipiko_subscriptions so no application code needs to
--  change — every payment path (API routes, admin panel,
--  cron, future code) is automatically audited.
--
--  RLS:
--    - Parents can SELECT their own events (transparency)
--    - Admins can SELECT all events (investigations)
--    - Nobody can UPDATE or DELETE (immutable record)
--    - INSERT is trigger-only (no direct client inserts)
-- ============================================================


-- ── 1. Audit log table ────────────────────────────────────────
create table if not exists payment_events (
  id           uuid        primary key default gen_random_uuid(),
  event_type   text        not null,
  parent_id    uuid        references parents(id) on delete set null,
  order_id     uuid        references orders(id)  on delete set null,
  amount       numeric(10,2),
  currency     text,
  -- Flexible bag for event-specific detail (status, provider, etc.)
  metadata     jsonb       default '{}'::jsonb,
  occurred_at  timestamptz not null default now()
);

create index if not exists idx_payment_events_parent  on payment_events(parent_id);
create index if not exists idx_payment_events_order   on payment_events(order_id);
create index if not exists idx_payment_events_type    on payment_events(event_type);
create index if not exists idx_payment_events_time    on payment_events(occurred_at desc);

alter table payment_events enable row level security;

-- Parents see their own history (useful for support self-service)
create policy "parent: select own events" on payment_events
  for select using (parent_id = auth.uid());

-- Admins see everything
create policy "admin: select all events" on payment_events
  for select using (is_admin());

-- No direct inserts, updates, or deletes from any client —
-- triggers below are the only writers (they run as SECURITY DEFINER).


-- ── 2. Trigger function ───────────────────────────────────────
create or replace function log_payment_event()
returns trigger language plpgsql security definer as $$
begin
  -- ── orders ────────────────────────────────────────────────
  if tg_table_name = 'orders' then
    if tg_op = 'INSERT' then
      insert into payment_events (event_type, parent_id, order_id, amount, currency, metadata)
      values (
        'order_created',
        new.parent_id,
        new.id,
        new.amount,
        new.currency,
        jsonb_build_object(
          'payment_provider', new.payment_provider,
          'product_id',       new.product_id
        )
      );

    elsif tg_op = 'UPDATE' and old.payment_status is distinct from new.payment_status then
      insert into payment_events (event_type, parent_id, order_id, amount, currency, metadata)
      values (
        case new.payment_status
          when 'completed' then 'payment_completed'
          when 'failed'    then 'payment_failed'
          when 'refunded'  then 'payment_refunded'
          when 'cancelled' then 'payment_cancelled'
          else 'payment_status_changed'
        end,
        new.parent_id,
        new.id,
        new.amount,
        new.currency,
        jsonb_build_object(
          'payment_provider',       new.payment_provider,
          'prev_status',            old.payment_status,
          'new_status',             new.payment_status,
          'provider_transaction_id', new.provider_transaction_id
        )
      );
    end if;

  -- ── content_access ────────────────────────────────────────
  elsif tg_table_name = 'content_access' then
    if tg_op = 'INSERT' then
      insert into payment_events (event_type, parent_id, order_id, metadata)
      values (
        'access_granted',
        new.parent_id,
        new.order_id,
        jsonb_build_object(
          'access_type',     new.access_type,
          'story_id',        new.story_id,
          'subscription_id', new.subscription_id
        )
      );

    elsif tg_op = 'UPDATE'
      and old.is_active is distinct from new.is_active
      and new.is_active = false then
      insert into payment_events (event_type, parent_id, order_id, metadata)
      values (
        'access_revoked',
        new.parent_id,
        new.order_id,
        jsonb_build_object(
          'access_type',     new.access_type,
          'story_id',        new.story_id,
          'subscription_id', new.subscription_id
        )
      );
    end if;

  -- ── nimipiko_subscriptions ────────────────────────────────
  elsif tg_table_name = 'nimipiko_subscriptions' then
    if tg_op = 'INSERT' then
      insert into payment_events (event_type, parent_id, amount, currency, metadata)
      values (
        'subscription_created',
        new.parent_id,
        new.amount,
        new.currency,
        jsonb_build_object(
          'product_id',          new.product_id,
          'payment_provider',    new.payment_provider,
          'billing_interval',    new.billing_interval,
          'current_period_end',  new.current_period_end
        )
      );

    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      insert into payment_events (event_type, parent_id, amount, currency, metadata)
      values (
        case new.status
          when 'cancelled' then 'subscription_cancelled'
          when 'expired'   then 'subscription_expired'
          when 'past_due'  then 'subscription_past_due'
          else 'subscription_status_changed'
        end,
        new.parent_id,
        new.amount,
        new.currency,
        jsonb_build_object(
          'product_id',       new.product_id,
          'payment_provider', new.payment_provider,
          'prev_status',      old.status,
          'new_status',       new.status
        )
      );
    end if;
  end if;

  -- Always return the triggering row unmodified
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;


-- ── 3. Attach triggers ────────────────────────────────────────

drop trigger if exists audit_orders on orders;
create trigger audit_orders
  after insert or update on orders
  for each row execute function log_payment_event();

drop trigger if exists audit_content_access on content_access;
create trigger audit_content_access
  after insert or update on content_access
  for each row execute function log_payment_event();

drop trigger if exists audit_subscriptions on nimipiko_subscriptions;
create trigger audit_subscriptions
  after insert or update on nimipiko_subscriptions
  for each row execute function log_payment_event();
