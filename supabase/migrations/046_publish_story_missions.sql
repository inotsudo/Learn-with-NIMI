-- Publish all mission versions for the 3 active stories
UPDATE mission_versions SET published = true, is_current = true
WHERE mission_id IN (
  SELECT ss.mission_id FROM story_slots ss
  JOIN stories s ON s.id = ss.story_id
  WHERE s.slug IN ('funny-animals', 'rainbow-colors', 'my-family')
);

-- Ensure RLS is re-enabled
ALTER TABLE mission_versions ENABLE ROW LEVEL SECURITY;
