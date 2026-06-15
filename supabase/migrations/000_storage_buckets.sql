-- ============================================================
--  NIMIPIKO — Storage Buckets
--  Run this in Supabase SQL Editor (once, if not already created).
--  The "storyBook" bucket may already exist — ON CONFLICT handles that.
-- ============================================================

-- Ensure all buckets are public
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('storyBook', 'storyBook', true),
  ('Coloriage', 'Coloriage', true),
  ('preview',   'preview',   true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── Public read (no login needed to load images / audio / video) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read storyBook'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Public read storyBook"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'storyBook')
    $pol$;
  END IF;
END $$;

-- ── Public read Coloriage ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read Coloriage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Public read Coloriage"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'Coloriage')
    $pol$;
  END IF;
END $$;

-- ── Public read preview ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read preview'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Public read preview"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'preview')
    $pol$;
  END IF;
END $$;

-- ── Authenticated users (parents / admin) can upload ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Auth upload storyBook'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth upload storyBook"
        ON storage.objects FOR INSERT
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
      AND policyname = 'Auth upload Coloriage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Auth upload Coloriage"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'Coloriage' AND auth.uid() IS NOT NULL)
    $pol$;
  END IF;
END $$;
