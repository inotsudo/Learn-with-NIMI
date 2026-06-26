-- Add English text to existing funny-animals story pages
INSERT INTO story_page_versions (story_page_id, language, text, published)
VALUES
  ('aecd60c3-19a1-4507-84a3-45c13ca4f525', 'en', 'Once upon a time, in a magical forest, there lived many funny animals. They loved to play and make each other laugh!', true),
  ('1080b066-b2cb-4f8d-8289-3071c336f412', 'en', 'The lion had the biggest smile. The monkey loved to dance. And the parrot could say hello in three languages!', true),
  ('fd4b343c-a6da-4c60-8ee4-2789bc53d662', 'en', 'One day, they decided to have a big party. Every animal brought something special to share with their friends.', true),
  ('f7e5ae81-023c-4552-821c-705b171e86ba', 'en', 'They danced, they sang, they laughed together. And they learned that sharing makes everything more fun! The End.', true)
ON CONFLICT DO NOTHING;

-- Create story pages for rainbow-colors (Story 2)
INSERT INTO story_pages (story_id, page_number, image_url)
SELECT s.id, n, NULL
FROM stories s, generate_series(1, 4) AS n
WHERE s.slug = 'rainbow-colors'
ON CONFLICT DO NOTHING;

-- Add text to rainbow-colors pages
INSERT INTO story_page_versions (story_page_id, language, text, published)
SELECT sp.id, 'en',
  CASE sp.page_number
    WHEN 1 THEN 'Have you ever seen a rainbow? It has so many beautiful colors! Red, orange, yellow, green, blue, and purple!'
    WHEN 2 THEN 'Each color is special. Red is like a strawberry. Orange is like the sunset. Yellow is like the warm sun!'
    WHEN 3 THEN 'Green is like the leaves on trees. Blue is like the sky. And purple is like a magical flower!'
    WHEN 4 THEN 'When all the colors come together, they make a rainbow. Just like when friends come together, they make something beautiful! The End.'
  END,
  true
FROM story_pages sp
JOIN stories s ON s.id = sp.story_id
WHERE s.slug = 'rainbow-colors'
ON CONFLICT DO NOTHING;

-- Create story pages for my-family (Story 3)
INSERT INTO story_pages (story_id, page_number, image_url)
SELECT s.id, n, NULL
FROM stories s, generate_series(1, 4) AS n
WHERE s.slug = 'my-family'
ON CONFLICT DO NOTHING;

-- Add text to my-family pages
INSERT INTO story_page_versions (story_page_id, language, text, published)
SELECT sp.id, 'en',
  CASE sp.page_number
    WHEN 1 THEN 'My family is special! We love each other very much. Mama, Papa, brothers, sisters — everyone is important!'
    WHEN 2 THEN 'In the morning, we eat breakfast together. Papa makes the best pancakes! Mama sings a happy song.'
    WHEN 3 THEN 'We play together, we learn together, and sometimes we even dance together! Family time is the best time.'
    WHEN 4 THEN 'At night, we read stories and say goodnight. I love my family, and my family loves me! The End.'
  END,
  true
FROM story_pages sp
JOIN stories s ON s.id = sp.story_id
WHERE s.slug = 'my-family'
ON CONFLICT DO NOTHING;

-- Ensure my-family has story_slots with missions
-- First check if slots exist, if not create missions and slots
DO $$
DECLARE
  v_story_id uuid;
  v_slot RECORD;
  v_mission_id uuid;
  v_slot_keys text[] := ARRAY['flipflop_audio','story_pdf','coloring','move_explore','sing_along','bonus_video'];
  v_types text[] := ARRAY['story','read','color','move','sing','watch'];
  v_i int;
BEGIN
  SELECT id INTO v_story_id FROM stories WHERE slug = 'my-family';
  IF v_story_id IS NULL THEN RETURN; END IF;

  -- Check if slots already exist
  IF EXISTS (SELECT 1 FROM story_slots WHERE story_id = v_story_id) THEN
    RETURN; -- Already has slots
  END IF;

  FOR v_i IN 1..6 LOOP
    INSERT INTO missions (story_id, type, sequence, stars, duration_minutes)
    VALUES (v_story_id, v_types[v_i], v_i, 10, 10)
    RETURNING id INTO v_mission_id;

    INSERT INTO story_slots (story_id, slot_key, mission_id, sort_order)
    VALUES (v_story_id, v_slot_keys[v_i], v_mission_id, v_i);

    INSERT INTO mission_versions (mission_id, language, title, subtitle, revision_number, status, published, is_current)
    VALUES (v_mission_id, 'en',
      CASE v_i
        WHEN 1 THEN 'Family Stories with Nimi'
        WHEN 2 THEN 'Family Readers'
        WHEN 3 THEN 'Family Creators'
        WHEN 4 THEN 'Family Dance'
        WHEN 5 THEN 'Family Song'
        WHEN 6 THEN 'Family Journey'
      END,
      'A fun family adventure!',
      1, 'published', true, true);
  END LOOP;
END $$;
