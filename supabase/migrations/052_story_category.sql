ALTER TABLE stories ADD COLUMN IF NOT EXISTS category text DEFAULT 'adventure';

UPDATE stories SET category = 'values' WHERE slug = 'the-talking-faces';
UPDATE stories SET category = 'animals' WHERE slug = 'funny-animals';
UPDATE stories SET category = 'adventure' WHERE slug = 'rainbow-colors';
UPDATE stories SET category = 'friendship' WHERE slug = 'my-family';
