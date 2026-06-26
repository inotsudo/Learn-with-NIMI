-- The trigger syncs published from status, so update status instead
UPDATE mission_versions SET status = 'published', is_current = true
WHERE mission_id IN (
  SELECT ss.mission_id FROM story_slots ss
  JOIN stories s ON s.id = ss.story_id
  WHERE s.slug IN ('funny-animals', 'rainbow-colors', 'my-family')
);
