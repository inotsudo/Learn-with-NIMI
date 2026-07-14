-- ══════════════════════════════════════════════════════════════
--  085 — Allow authenticated parents to upload shared certificates
--  generateCertificateImageUrl runs on the story completion screen
--  and uploads to certificates/community/. The existing policy only
--  allows admins. This adds a scoped INSERT for any logged-in user,
--  limited to the community/ prefix so admin template paths stay safe.
-- ══════════════════════════════════════════════════════════════

create policy "cert_bucket_auth_community_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = 'community'
  );
