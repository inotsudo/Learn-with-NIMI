-- Add visual/difficulty fields to weekly_challenges (shared across languages)
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'easy';
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS estimated_minutes integer DEFAULT 2;
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS reward_badge text;
