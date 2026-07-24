-- 160: Allow anonymous read of referral_codes (code + referrer name only)
-- The validate endpoint is public (pre-signup) and uses the anon key.
-- This policy lets it do: SELECT code, parents(name) WHERE code = ?
-- parent_id is intentionally excluded from the select list in the route.

CREATE POLICY "public_read_referral_code"
  ON referral_codes
  FOR SELECT
  TO anon
  USING (true);
