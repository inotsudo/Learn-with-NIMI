-- ============================================================
-- 137: Fix is_child_owner() + RLS policies + decay_stale_memories guard
--
-- BUG (migration 130): is_child_owner() and all 4 RLS policies on
-- learner_memories / learner_events referenced c.user_id, which does
-- not exist on the children table. The correct column is c.parent_id
-- (set up in migration 001). This caused every SECURITY DEFINER RPC
-- in the Nimi intelligence layer to raise "column user_id does not
-- exist" for every call, silently swallowed by Promise.allSettled.
--
-- decay_stale_memories() had no caller guard — any authenticated user
-- could degrade the entire learner_memories table globally. Restricted
-- to admins only (H-4).
-- ============================================================

-- ── 1. Fix is_child_owner() ───────────────────────────────────────

create or replace function is_child_owner(p_child_id uuid)
returns boolean
language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from children c
    where c.id        = p_child_id
      and c.parent_id = auth.uid()
  );
$$;

-- ── 2. Fix RLS policies on learner_memories ───────────────────────

drop policy if exists "owner_read_memories"  on learner_memories;
drop policy if exists "owner_write_memories" on learner_memories;

create policy "owner_read_memories" on learner_memories
  for select
  using (exists (
    select 1 from children c
    where c.id        = child_id
      and c.parent_id = auth.uid()
  ));

create policy "owner_write_memories" on learner_memories
  for all
  using (exists (
    select 1 from children c
    where c.id        = child_id
      and c.parent_id = auth.uid()
  ));

-- ── 3. Fix RLS policies on learner_events ────────────────────────

drop policy if exists "owner_read_events"  on learner_events;
drop policy if exists "owner_write_events" on learner_events;

create policy "owner_read_events" on learner_events
  for select
  using (exists (
    select 1 from children c
    where c.id        = child_id
      and c.parent_id = auth.uid()
  ));

create policy "owner_write_events" on learner_events
  for insert
  with check (exists (
    select 1 from children c
    where c.id        = child_id
      and c.parent_id = auth.uid()
  ));

-- ── 4. Restrict decay_stale_memories to admins (H-4) ─────────────

create or replace function decay_stale_memories()
returns int
language plpgsql security definer as $$
declare v_count int;
begin
  if not is_admin() then
    raise exception 'Unauthorized: admin only';
  end if;

  with decayed as (
    update learner_memories
    set confidence = confidence * 0.95,
        updated_at = now()
    where source     = 'ai_inferred'
      and updated_at < now() - interval '7 days'
    returning id, confidence
  ),
  cleaned as (
    delete from learner_memories
    where id in (select id from decayed where confidence < 0.05)
    returning id
  )
  select count(*) into v_count from cleaned;

  return v_count;
end;
$$;
