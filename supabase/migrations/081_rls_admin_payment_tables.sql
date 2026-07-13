-- ============================================================
--  081: Admin RLS — payment & business tables
--
--  All money-related tables created in migrations 053–068 got
--  parent-scoped SELECT policies but no admin write policies.
--  The admin panel uses the authenticated Supabase client, so
--  without these policies admins cannot manage products, read
--  all orders, grant/revoke access, or view leads.
--
--  Uses IF EXISTS guards because the migration history tracker
--  can mark migrations as applied even when a table creation
--  failed — guarding against that keeps this migration safe.
--
--  Pattern: additive permissive "admin: full access" policy on
--  every table — existing parent policies are untouched.
--  Uses is_admin() defined in migration 013.
-- ============================================================


-- ── Standard tables: loop + IF EXISTS guard ───────────────────
-- Apply the same admin full-access policy to every payment and
-- business table. Skips silently if a table doesn't exist yet.
do $$
declare
  t text;
begin
  foreach t in array array[
    -- Core payment tables (migration 053)
    'products',
    'orders',
    'nimipiko_subscriptions',
    'content_access',
    -- Subscription renewal (migration 055)
    'payment_methods',
    'subscription_renewals',
    -- Discount system (migration 067)
    'discount_codes',
    'discount_redemptions',
    -- Gift subscriptions (migration 068)
    'gift_subscriptions',
    -- Masterpiece orders (migration 058)
    'masterpiece_orders',
    -- Lead capture (migrations 062, 064)
    'newsletter_signups',
    -- Referral system (migration 066)
    'referral_codes',
    'referral_redemptions'
  ]
  loop
    if exists (
      select 1 from pg_tables
      where schemaname = 'public' and tablename = t
    ) then
      execute format('drop policy if exists "admin: full access" on %I', t);
      execute format(
        'create policy "admin: full access" on %I for all using (is_admin()) with check (is_admin())',
        t
      );
    end if;
  end loop;
end $$;


-- ── school_inquiries: special case ───────────────────────────
-- Existing policy references "admin_users" (non-existent table)
-- instead of is_admin() — drop it and replace.
do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'school_inquiries'
  ) then
    drop policy if exists "admins can manage school inquiries" on school_inquiries;
    drop policy if exists "service role can insert inquiries"  on school_inquiries;
    drop policy if exists "admin: full access"                 on school_inquiries;
    -- Service role (API route) inserts bypass RLS; admins read and update status.
    create policy "admin: full access" on school_inquiries
      for all using (is_admin()) with check (is_admin());
  end if;
end $$;
