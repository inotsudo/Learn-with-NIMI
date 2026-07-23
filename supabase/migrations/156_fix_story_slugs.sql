-- Fix duplicate slug conflict:
-- "Nimi and the Talking Faces" (draft) owned 'the-talking-faces' even though
-- its actual title would slug to 'nimi-and-the-talking-faces'.
-- Move it out of the way so the live story can claim 'the-talking-faces'.

UPDATE stories
SET slug = 'nimi-and-the-talking-faces'
WHERE title = 'Nimi and the Talking Faces'
  AND slug = 'the-talking-faces';

-- Give the live story its canonical slug.
UPDATE stories
SET slug = 'the-talking-faces'
WHERE title = 'The Talking Faces'
  AND slug LIKE 'new-story-%';

-- Sync badge_images:
-- 1. Remove the draft story's empty placeholder rows (no image uploaded for it).
DELETE FROM badge_images
WHERE slug LIKE 'the-talking-faces-%'
  AND (image_url IS NULL OR image_url = '');

-- 2. Rename the live story's badge image rows to the new canonical slug.
UPDATE badge_images
SET slug = REPLACE(slug, 'new-story-1782593741408', 'the-talking-faces')
WHERE slug LIKE 'new-story-1782593741408%';

-- 3. Also fix child_badges that stored the old slug so existing earners keep their badge.
UPDATE child_badges
SET badge_slug = REPLACE(badge_slug, 'new-story-1782593741408', 'the-talking-faces')
WHERE badge_slug LIKE 'new-story-1782593741408%';
