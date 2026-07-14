-- ══════════════════════════════════════════════════════════════
--  083 — Fix certificate_templates RLS policy
--  The original policy used an inline subquery on `admins`,
--  which itself has RLS → deadlock / infinite wait under Supabase.
--  Replace with is_admin() (security definer) used by all other
--  admin-gated tables in this project.
-- ══════════════════════════════════════════════════════════════

drop policy if exists "cert_templates_admins_all" on certificate_templates;

create policy "cert_templates_admins_all"
  on certificate_templates for all
  using  (is_admin())
  with check (is_admin());
