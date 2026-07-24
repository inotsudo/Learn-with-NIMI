-- ============================================================
-- 165: nimi_gate_check — atomic gate check for Nimi AI (#13)
-- ============================================================
-- The previous route made 2 sequential Supabase round-trips before
-- streaming the first token:
--   1. nimipiko_subscriptions  SELECT (via service-role client)
--   2. nimi_message_counts     SELECT + increment_nimi_count (service-role)
--
-- This single security-definer RPC replaces both calls and is callable
-- from the authenticated client (no service-role key needed from the edge
-- function). The route can now fire this in parallel with the 8-query
-- context-build batch, reducing sequential wait count from 3 → 2.
-- ============================================================

create or replace function nimi_gate_check(
  p_parent_id uuid,
  p_child_id  uuid          -- may be null (guest session)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscribed boolean;
  v_new_count  integer;
begin
  -- 1. Active subscription? → always allowed, no count increment.
  --    has_active_subscription is itself security definer, so this is safe.
  v_subscribed := has_active_subscription(p_parent_id);

  if v_subscribed then
    return jsonb_build_object('allowed', true, 'subscribed', true);
  end if;

  -- 2. No childId (guest) → allow but don't track.
  if p_child_id is null then
    return jsonb_build_object('allowed', true, 'subscribed', false);
  end if;

  -- 3. Atomically increment today's count and check the daily cap (10).
  --    The INSERT … ON CONFLICT upsert is atomic — no race condition.
  --    If count after increment is > 10 the request is blocked, but the
  --    count is still recorded (harmless — it just keeps climbing past 10).
  with upserted as (
    insert into nimi_message_counts (child_id, date, count)
    values (p_child_id, current_date, 1)
    on conflict (child_id, date) do update
      set count = nimi_message_counts.count + 1
    returning count
  )
  select count into v_new_count from upserted;

  return jsonb_build_object(
    'allowed',    v_new_count <= 10,
    'subscribed', false,
    'count',      v_new_count,
    'limit',      10
  );
end;
$$;

-- Callable by any authenticated user; security definer provides elevation.
grant execute on function nimi_gate_check(uuid, uuid) to authenticated;
