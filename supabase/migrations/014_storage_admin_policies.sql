-- ============================================================
--  NIMIPIKO — Storage Admin Policies
--  Adds the DELETE / UPDATE policies missing from 000_storage_buckets.sql
--  (needed so the admin Media Library can delete files and overwrite
--  existing files via upload({ upsert: true })), plus the INSERT policy
--  the "preview" bucket never got.
-- ============================================================

-- ── Auth delete storyBook ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth delete storyBook'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth delete storyBook"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'storyBook' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

-- ── Auth delete Coloriage ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth delete Coloriage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth delete Coloriage"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'Coloriage' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

-- ── Auth delete preview ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth delete preview'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth delete preview"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'preview' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

-- ── Auth upload preview (only bucket missing an INSERT policy) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth upload preview'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth upload preview"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'preview' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

-- ── Auth update (enables upload upsert:true to overwrite existing files) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth update storyBook'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth update storyBook"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'storyBook' AND auth.uid() IS NOT NULL)
        WITH CHECK (bucket_id = 'storyBook' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth update Coloriage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth update Coloriage"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'Coloriage' AND auth.uid() IS NOT NULL)
        WITH CHECK (bucket_id = 'Coloriage' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth update preview'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth update preview"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'preview' AND auth.uid() IS NOT NULL)
        WITH CHECK (bucket_id = 'preview' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;
