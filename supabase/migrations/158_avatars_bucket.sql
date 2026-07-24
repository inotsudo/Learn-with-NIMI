-- Avatars bucket: public read, authenticated upload/update/delete.
-- Users upload to avatars/{childId}/avatar.jpg (upsert overwrites the same file).

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read avatars'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Public read avatars"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'avatars')
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth upload avatars'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth upload avatars"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth update avatars'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth update avatars"
        ON storage.objects FOR UPDATE
        USING  (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)
        WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth delete avatars'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth delete avatars"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;
