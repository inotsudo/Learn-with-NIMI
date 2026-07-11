-- 068: Gift subscriptions
-- Allows a parent to buy a Club subscription as a gift for someone else.
-- The recipient receives a unique redemption code by email; they visit
-- /gift/redeem?code=XXX to activate the subscription on their account.

CREATE TABLE IF NOT EXISTS gift_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_parent_id     uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  recipient_email     text NOT NULL,
  recipient_name      text,
  product_id          uuid NOT NULL REFERENCES products(id),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- 12-char uppercase alphanumeric redemption code
  redemption_code     text UNIQUE NOT NULL,
  message             text,               -- optional personal message from giver
  redeemed_at         timestamptz,
  redeemed_by         uuid REFERENCES parents(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gift_subscriptions ENABLE ROW LEVEL SECURITY;

-- Givers can read their own gifts
CREATE POLICY "giver_read" ON gift_subscriptions
  FOR SELECT USING (auth.uid() = giver_parent_id);

-- Anyone can look up a gift by code (needed for redemption page — checked server-side)
CREATE POLICY "public_read_by_code" ON gift_subscriptions
  FOR SELECT USING (redemption_code IS NOT NULL);
