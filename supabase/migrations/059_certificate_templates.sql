-- Certificate template images per story per language
-- Admin uploads the designed certificate, sets name position
ALTER TABLE stories ADD COLUMN IF NOT EXISTS certificate_config jsonb DEFAULT '{}'::jsonb;
-- certificate_config shape:
-- {
--   "en": { "image_url": "certificates/story1_en.png", "nameX": 420, "nameY": 100, "nameSize": 48, "nameColor": "#1a1a5e" },
--   "fr": { "image_url": "certificates/story1_fr.png", "nameX": 420, "nameY": 100, "nameSize": 48, "nameColor": "#1a1a5e" },
--   "rw": { "image_url": "certificates/story1_rw.png", "nameX": 420, "nameY": 100, "nameSize": 48, "nameColor": "#1a1a5e" }
-- }
