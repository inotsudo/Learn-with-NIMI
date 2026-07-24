-- ============================================================
-- 162: Canonical subscription check + teacher access fix
-- ============================================================

-- ── 1. Canonical has_active_subscription(parent_id) (#16) ────────────────────
-- Single source of truth used by every caller that needs to check whether
-- a parent currently has paid access. Includes expiry guard so subscriptions
-- auto-expire without a separate cron needing to set status = 'expired'.

create or replace function has_active_subscription(p_parent_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1
    from nimipiko_subscriptions
    where parent_id          = p_parent_id
      and status             = 'active'
      and current_period_end > now()
  );
$$;

grant execute on function has_active_subscription(uuid) to authenticated, anon;

-- ── 2. Fix _sa_parent_has_subscription — expiry guard + teacher auth (#6, #7) ─
-- Previous version had two gaps:
--   a) No current_period_end > now() check — expired subscriptions still
--      unlocked premium stories until a cron flipped their status.
--   b) teacher_id IS NOT NULL granted free premium access to ALL teacher-
--      enrolled children regardless of whether the school had actually paid.
--
-- New behaviour:
--   • Parent path: uses has_active_subscription() with expiry guard.
--   • Teacher path: child's teacher must also have an active paid subscription
--     (granted via admin, school purchase, or their own parent subscription).
--     Teachers that have only been created in teacher_profiles with no paid
--     access no longer silently grant premium content to their students.

create or replace function _sa_parent_has_subscription(p_child_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    -- Parent has an active, non-expired subscription
    select 1
    from nimipiko_subscriptions ns
    join children c on c.parent_id = ns.parent_id
    where c.id              = p_child_id
      and ns.status         = 'active'
      and ns.current_period_end > now()
  )
  or exists (
    -- Child is teacher-enrolled AND the teacher has active content access
    -- (admin-granted, school purchase, or teacher's own subscription)
    select 1
    from children ch
    join teacher_profiles tp on tp.id = ch.teacher_id
    where ch.id             = p_child_id
      and ch.teacher_id     is not null
      and (
        -- Teacher has an active subscription of their own
        has_active_subscription(tp.id)
        -- OR teacher has been granted explicit content access by admin
        or exists (
          select 1 from content_access ca
          where ca.parent_id = tp.id
            and ca.is_active = true
            and (ca.expires_at is null or ca.expires_at > now())
        )
      )
  );
$$;
