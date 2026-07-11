-- 066: Referral system
-- Each parent gets one referral code. When a referred user subscribes,
-- the referrer's account is credited with 1 free month (admin_grant).

CREATE TABLE IF NOT EXISTS referral_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL UNIQUE REFERENCES parents(id) ON DELETE CASCADE,
  code        text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES parents(id),
  referred_id   uuid NOT NULL UNIQUE REFERENCES parents(id),
  code          text NOT NULL,
  redeemed_at   timestamptz NOT NULL DEFAULT now(),
  -- reward: NULL until referred user subscribes
  reward_type        text DEFAULT 'free_month',
  reward_granted_at  timestamptz
);

ALTER TABLE referral_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions  ENABLE ROW LEVEL SECURITY;

-- Parents can see their own referral code
CREATE POLICY "owner_referral_code" ON referral_codes
  FOR ALL USING (parent_id = auth.uid());

-- Referrers can see their own redemptions
CREATE POLICY "referrer_sees_own" ON referral_redemptions
  FOR SELECT USING (referrer_id = auth.uid());

-- Anyone can insert (new signup applying a code) via service role
-- Service role bypasses RLS — no additional policy needed for service-side inserts
