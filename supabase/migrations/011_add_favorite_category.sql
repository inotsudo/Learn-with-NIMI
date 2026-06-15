-- ============================================================
--  NIMIPIKO — 011: Explorer profile "favorite adventure" field
--
--  Additive-only. Adds children.favorite_category, captured on
--  the new "Create Your Explorer Profile" onboarding page shown
--  to parents with no child profiles yet.
-- ============================================================

ALTER TABLE children ADD COLUMN IF NOT EXISTS favorite_category text;

ALTER TABLE children DROP CONSTRAINT IF EXISTS children_favorite_category_check;
ALTER TABLE children ADD CONSTRAINT children_favorite_category_check
  CHECK (favorite_category IS NULL OR favorite_category IN (
    'animals', 'space', 'music', 'art', 'stories', 'adventure'
  ));
