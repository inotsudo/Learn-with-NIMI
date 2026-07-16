-- migration 091: seed badge_images slots for all existing stories × 3 languages
-- and add a trigger so new stories get their slots automatically.
--
-- Slug convention: {story-slug}-{language}  (e.g. emotion-detective-en)
-- image_url is NULL until the admin uploads via the Badge Images manager.

-- 1. Back-fill all existing stories × (en, fr, rw)
INSERT INTO badge_images (slug, label)
SELECT
  s.slug || '-' || l.code,
  s.title || ' (' || upper(l.code) || ')'
FROM stories s
CROSS JOIN (VALUES ('en'), ('fr'), ('rw')) AS l(code)
ON CONFLICT (slug) DO NOTHING;

-- 2. Trigger function — fires after every new story INSERT
CREATE OR REPLACE FUNCTION _sa_create_story_badge_slots()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO badge_images (slug, label)
  VALUES
    (NEW.slug || '-en', NEW.title || ' (EN)'),
    (NEW.slug || '-fr', NEW.title || ' (FR)'),
    (NEW.slug || '-rw', NEW.title || ' (RW)')
  ON CONFLICT (slug) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to stories table
DROP TRIGGER IF EXISTS story_badge_slots_trigger ON stories;
CREATE TRIGGER story_badge_slots_trigger
  AFTER INSERT ON stories
  FOR EACH ROW EXECUTE FUNCTION _sa_create_story_badge_slots();
