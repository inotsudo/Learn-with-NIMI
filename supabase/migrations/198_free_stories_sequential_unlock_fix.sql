-- ============================================================
-- 198: Free published stories accessible without sequential gate
-- ============================================================
-- Root cause (function-overload shadowing bug):
--   _sa_is_story_unlocked has two overloads that diverged.
--     • 3-arg (uuid,uuid,text)      → redefined by 193 then 194.
--     • 4-arg (uuid,uuid,text,bool) → defined ONLY by 167.
--   Migrations 193/194 removed the sequential-completion gate and
--   re-gated premium on subscription — but only on the 3-arg overload.
--   get_story_library_progress (rewritten in 167 to pass a pre-computed
--   subscription flag) calls the 4-arg overload at its sole call site
--   (167, line 130). That overload still enforced the retired sequential
--   rule ("previous published story must be complete"), so a free,
--   published second story returned unlocked=false while the first story
--   was incomplete.
--
-- Fix: redefine ONLY the 4-arg overload so it implements the approved policy:
--     • Unpublished (or missing) story  → false (unchanged).
--     • Free, published story           → true, independently of completion
--                                         order (sequential gate removed).
--     • Premium story                  → requires a legitimate entitlement.
--
-- Premium entitlement = the UNION of both established models, so no legitimate
-- access is dropped and no paid content is exposed for free:
--     • p_has_sub (pre-computed via _sa_parent_has_subscription, migration
--       162) grants an active, NON-EXPIRED subscription OR teacher-enrolled
--       content access. This is the canonical, expiry-guarded check (162) — it
--       intentionally does NOT honour a stale `status='active'` past its
--       current_period_end.
--     • The past_due-within-grace check mirrors migration 194's premium gate so
--       legitimate grace-period access is preserved (not dropped).
--
-- Note: the legacy 3-arg overload (migration 194) uses an older inline check
-- that omits the expiry guard and teacher access. It is left untouched per the
-- "no historical edits" rule; its callers already run the no-sequential policy,
-- which is the substantive fix. The residual premium-check nuance between the
-- two overloads does not weaken access control (the 4-arg path is, if anything,
-- stricter on expiry).
--
-- Historical migrations 167/193/194 are left untouched. No production data
-- is changed and this is a forward-only schema correction.
-- ============================================================

create or replace function _sa_is_story_unlocked(
  p_child_id uuid,
  p_story_id uuid,
  p_language text,
  p_has_sub  boolean       -- pre-computed; avoids re-querying per story
) returns boolean
language plpgsql security definer stable as $$
declare
  v_status  text;
  v_is_free boolean;
  v_parent  uuid;
begin
  select s.status, s.is_free
    into v_status, v_is_free
    from stories s
   where s.id = p_story_id;

  -- Story must be published (and must exist) to be visible to children.
  if v_status is null or v_status <> 'published' then
    return false;
  end if;

  -- Free, published stories are independently accessible: no completion-order
  -- gate. This is the sequential-lock removal approved for Phase 2.24.
  if v_is_free then
    return true;
  end if;

  -- Premium story: require a legitimate entitlement.
  -- 1) Active non-expired subscription OR teacher-enrolled content access
  --    (both already encoded in the pre-computed flag from migration 162).
  if p_has_sub then
    return true;
  end if;

  -- 2) Past-due subscription still within its grace window (migration 194).
  select c.parent_id into v_parent from children c where c.id = p_child_id;
  if v_parent is not null then
    return exists (
      select 1
        from nimipiko_subscriptions ns
       where ns.parent_id    = v_parent
         and ns.status       = 'past_due'
         and ns.grace_ends_at is not null
         and ns.grace_ends_at > now()
    );
  end if;

  return false;
end;
$$;

grant execute on function _sa_is_story_unlocked(uuid, uuid, text, boolean) to authenticated;
