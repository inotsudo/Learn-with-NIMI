-- 158: Performance indexes for referral tables
-- referral_redemptions is queried by referrer_id (parents page, dashboard)
-- and scanned for reward_granted_at IS NULL (daily cron).

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referrer
  ON referral_redemptions(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_ungranted
  ON referral_redemptions(reward_granted_at)
  WHERE reward_granted_at IS NULL;

-- Speed up the code lookup on the validate endpoint
CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes(code);
