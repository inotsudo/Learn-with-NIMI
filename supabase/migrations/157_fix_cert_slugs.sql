-- Fix certificate slugs stored in child_achievements that still reference
-- the auto-generated story slug 'new-story-1782593741408' (renamed in migration 156).
-- Cert slug format: story-{story_slug}-certificate-{lang}

UPDATE child_achievements
SET slug = REPLACE(slug, 'new-story-1782593741408', 'the-talking-faces')
WHERE slug LIKE '%new-story-1782593741408%'
  AND type = 'certificate';
