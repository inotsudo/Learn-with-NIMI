-- ══════════════════════════════════════════════════════════════
--  084 — Allow public SELECT on certificate_templates
--  generateCertificateDataUrl runs on the parent/learner story
--  page. The template config is not sensitive (just image URL +
--  name position), so any authenticated user can read it.
--  Writes remain admin-only via the existing policy (083).
-- ══════════════════════════════════════════════════════════════

create policy "cert_templates_public_read"
  on certificate_templates for select
  using (true);
