-- ============================================================
-- 161: System design fixes — indexes, constraints, admin RLS
-- ============================================================

-- ── 1. content_access indexes (#12) ──────────────────────────────────────────
-- These columns are used as FK lookups in every payment confirmation and
-- subscription-expiry sweep; without indexes they cause full table scans.

create index if not exists content_access_subscription_id_idx
  on content_access (subscription_id)
  where subscription_id is not null;

create index if not exists content_access_order_id_idx
  on content_access (order_id)
  where order_id is not null;

-- ── 2. payment_methods: at most one active default per parent (#17) ───────────
-- Enforces the invariant at the DB level so application code never has to
-- disambiguate which method to use for automatic renewals.

create unique index if not exists payment_methods_one_default_per_parent
  on payment_methods (parent_id)
  where is_default = true and is_active = true;

-- ── 3. Fix admin RLS on teacher_profiles to use is_admin() helper (#25) ──────
-- The previous policy used an inline subquery that duplicated the admin-check
-- logic. Using the is_admin() security-definer function keeps the check in
-- one place and respects any future changes to the admins table.

drop policy if exists "admin: read teacher_profiles" on teacher_profiles;

create policy "admin: read teacher_profiles"
  on teacher_profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or is_admin()
  );

-- ── 4. Consistent admin policies on school_inquiries ─────────────────────────
drop policy if exists "admin: manage school_inquiries" on school_inquiries;

create policy "admin: manage school_inquiries"
  on school_inquiries for all
  to authenticated
  using    (is_admin())
  with check (is_admin());
